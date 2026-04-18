import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AsyncStorageService } from '../async-storage/async-storage.service';
import {
  WorkflowDefinition,
  WorkflowContainer,
  WorkflowContext,
  WorkflowExecutionResult,
  WorkflowTransaction,
  RequestContext,
  DomainEvent,
} from './types';
import { WorkflowExecutionResultWithEvents } from './create-workflow';
import {
  WorkflowException,
  StepFailedException,
  parseStepError,
} from './exceptions';

export interface WorkflowRunOptions<TInput> {
  input: TInput;
  /** Override or extend the request context */
  context?: Partial<WorkflowContext>;
  /** Idempotency key for deduplication */
  idempotencyKey?: string;
  /** If false, returns error in result instead of throwing (default: true) */
  throwOnError?: boolean;
}

export interface WorkflowEvents {
  'workflow.started': {
    workflowName: string;
    transactionId: string;
    requestId: string;
    input: unknown;
  };
  'workflow.completed': {
    workflowName: string;
    transactionId: string;
    requestId: string;
    result: unknown;
    durationMs: number;
  };
  'workflow.failed': {
    workflowName: string;
    transactionId: string;
    requestId: string;
    error: string;
    compensated: boolean;
  };
  'step.started': {
    workflowName: string;
    stepName: string;
    transactionId: string;
  };
  'step.completed': {
    workflowName: string;
    stepName: string;
    transactionId: string;
    output: unknown;
    durationMs: number;
  };
  'step.failed': {
    workflowName: string;
    stepName: string;
    transactionId: string;
    error: string;
  };
}

/**
 * WorkflowEngineService - NestJS service for executing workflows
 *
 * Integrates with:
 * - NestJS dependency injection (ModuleRef)
 * - AsyncStorageService for request context
 * - EventEmitter2 for workflow events
 *
 * Error Handling:
 * - Workflow errors are converted to appropriate HTTP exceptions
 * - Step errors can use WorkflowErrors helpers for semantic errors
 * - Compensation runs automatically on failure
 *
 * @example
 * // In a controller
 * @Controller('orders')
 * export class OrderController {
 *   constructor(private workflowEngine: WorkflowEngineService) {}
 *
 *   @Post()
 *   async createOrder(@Body() dto: CreateOrderDto) {
 *     // If workflow fails, appropriate HTTP exception is thrown automatically
 *     const { result } = await this.workflowEngine.run(createOrderWorkflow, {
 *       input: dto,
 *     });
 *     return result;
 *   }
 * }
 *
 * @example
 * // In a step, throw semantic errors
 * const findUserStep = createStep('find-user', async (input, { container }) => {
 *   const user = await userService.findById(input.userId);
 *   if (!user) {
 *     throw WorkflowErrors.notFound('user', input.userId);
 *     // Results in HTTP 404 response
 *   }
 *   return new StepResponse(user);
 * });
 */
@Injectable()
export class WorkflowEngineService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowEngineService.name);
  private container: WorkflowContainer;

  // In-memory transaction store (replace with Redis/DB for production)
  private transactions: Map<string, WorkflowTransaction> = new Map();

  // Idempotency cache (replace with Redis for production)
  private idempotencyCache: Map<
    string,
    { result: unknown; transaction: WorkflowTransaction }
  > = new Map();

  constructor(
    private moduleRef: ModuleRef,
    private eventEmitter: EventEmitter2,
    private asyncStorage: AsyncStorageService,
  ) {}

  onModuleInit() {
    // Create a container that wraps NestJS's ModuleRef
    this.container = {
      resolve: <T>(
        token: string | symbol | (new (...args: unknown[]) => T),
      ): T => {
        try {
          return this.moduleRef.get(token as Parameters<ModuleRef['get']>[0], {
            strict: false,
          }) as T;
        } catch {
          throw new Error(`Failed to resolve ${String(token)} from container`);
        }
      },
    };
  }

  /**
   * Execute a workflow
   *
   * @param workflow - The workflow definition to execute
   * @param options - Execution options including input and context
   * @returns Promise with the result and transaction details
   * @throws WorkflowException or subclass with appropriate HTTP status
   */
  async run<TInput, TOutput>(
    workflow: WorkflowDefinition<TInput, TOutput>,
    options: WorkflowRunOptions<TInput>,
  ): Promise<WorkflowExecutionResult<TOutput>> {
    const startTime = Date.now();

    // Check idempotency
    if (options.idempotencyKey) {
      const cached = this.idempotencyCache.get(options.idempotencyKey);
      if (cached) {
        this.logger.debug(
          `Returning cached result for idempotency key: ${options.idempotencyKey}`,
        );
        return cached as WorkflowExecutionResult<TOutput>;
      }
    }

    // Build request context from AsyncStorageService
    const requestContext = this.buildRequestContext();

    // Build full workflow context
    const workflowContext: Partial<WorkflowContext> = {
      ...options.context,
      requestContext,
      idempotencyKey: options.idempotencyKey,
    };

    let transaction: WorkflowTransaction | undefined;

    try {
      this.logger.debug(
        `Starting workflow: ${workflow.name} [request: ${requestContext.requestId}]`,
      );

      const result = await workflow.run(this.container, {
        input: options.input,
        context: workflowContext,
      });

      transaction = result.transaction;
      this.transactions.set(transaction.id, transaction);

      // Cache for idempotency
      if (options.idempotencyKey) {
        this.idempotencyCache.set(options.idempotencyKey, {
          result: result.result,
          transaction,
        });
      }

      // Emit infrastructure events
      this.emit('workflow.started', {
        workflowName: workflow.name,
        transactionId: transaction.id,
        requestId: requestContext.requestId,
        input: options.input,
      });

      const duration = Date.now() - startTime;
      this.emit('workflow.completed', {
        workflowName: workflow.name,
        transactionId: transaction.id,
        requestId: requestContext.requestId,
        result: result.result,
        durationMs: duration,
      });

      // Dispatch domain events after successful completion
      const resultWithEvents = result as WorkflowExecutionResultWithEvents<TOutput>;
      if (resultWithEvents.domainEvents?.length > 0) {
        this.dispatchDomainEvents(
          resultWithEvents.domainEvents,
          workflow.name,
          transaction.id,
          requestContext.requestId,
        );
      }

      this.logger.debug(
        `Workflow ${workflow.name} completed in ${duration}ms [transaction: ${transaction.id}]`,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Workflow ${workflow.name} failed after ${duration}ms: ${errorMessage}`,
      );

      // Emit failed event
      if (transaction) {
        this.transactions.set(transaction.id, transaction);
        this.emit('workflow.failed', {
          workflowName: workflow.name,
          transactionId: transaction.id,
          requestId: requestContext.requestId,
          error: errorMessage,
          compensated: transaction.status === 'compensated',
        });
      }

      // Convert to appropriate exception
      if (options.throwOnError !== false) {
        throw this.convertToHttpException(
          error,
          workflow.name,
          transaction || null,
        );
      }

      return {
        result: undefined as TOutput,
        transaction:
          transaction ||
          this.createFailedTransaction(workflow.name, errorMessage),
      };
    }
  }

  /**
   * Get the current request context
   */
  getRequestContext(): RequestContext {
    return this.buildRequestContext();
  }

  /**
   * Get a stored transaction by ID
   */
  getTransaction(transactionId: string): WorkflowTransaction | undefined {
    return this.transactions.get(transactionId);
  }

  /**
   * Get all transactions for a workflow
   */
  getTransactionsByWorkflow(workflowName: string): WorkflowTransaction[] {
    return Array.from(this.transactions.values()).filter(
      (t) => t.workflowName === workflowName,
    );
  }

  /**
   * Clear old transactions (for cleanup)
   */
  clearTransactions(olderThanMs?: number): number {
    if (!olderThanMs) {
      const count = this.transactions.size;
      this.transactions.clear();
      return count;
    }

    const cutoff = Date.now() - olderThanMs;
    let cleared = 0;

    for (const [id, transaction] of this.transactions) {
      if (transaction.startedAt.getTime() < cutoff) {
        this.transactions.delete(id);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Clear idempotency cache entries
   */
  clearIdempotencyCache(): number {
    const count = this.idempotencyCache.size;
    this.idempotencyCache.clear();
    return count;
  }

  private buildRequestContext(): RequestContext {
    const store = this.asyncStorage.getStore();

    return {
      requestId: store?.get('requestId')?.toString() || `wf-${Date.now()}`,
      auth: store?.get('auth'),
      metadata: {
        // Add any other request metadata you want to pass to workflows
      },
    };
  }

  private convertToHttpException(
    error: unknown,
    workflowName: string,
    transaction: WorkflowTransaction | null,
  ): WorkflowException {
    // Already a WorkflowException
    if (error instanceof WorkflowException) {
      return error;
    }

    // Parse error message for semantic error types
    if (error instanceof Error) {
      const parsed = parseStepError(error);

      // Find the failed step
      const failedStep = transaction?.steps.find((s) => s.status === 'failed');

      if (failedStep) {
        return new StepFailedException(
          workflowName,
          failedStep,
          transaction,
          error,
          parsed.status,
        );
      }

      return new WorkflowException(
        workflowName,
        transaction,
        error.message,
        parsed.status,
      );
    }

    // Generic error
    return new WorkflowException(
      workflowName,
      transaction,
      String(error),
    );
  }

  /**
   * Dispatch domain events collected during workflow execution
   * Events are emitted only after successful workflow completion
   */
  private dispatchDomainEvents(
    events: DomainEvent[],
    workflowName: string,
    transactionId: string,
    requestId: string,
  ): void {
    for (const event of events) {
      this.logger.debug(
        `Dispatching domain event: ${event.event} from step ${event.stepName}`,
      );

      // Emit the domain event with enriched metadata
      this.eventEmitter.emit(event.event, {
        ...event.payload as object,
        __metadata: {
          workflowName,
          transactionId,
          requestId,
          stepName: event.stepName,
          timestamp: event.timestamp,
        },
      });
    }
  }

  private emit<K extends keyof WorkflowEvents>(
    event: K,
    payload: WorkflowEvents[K],
  ): void {
    this.eventEmitter.emit(event, payload);
  }

  private createFailedTransaction(
    workflowName: string,
    error: string,
  ): WorkflowTransaction {
    return {
      id: 'failed-' + Date.now(),
      workflowName,
      status: 'failed',
      steps: [],
      startedAt: new Date(),
      completedAt: new Date(),
      error,
    };
  }
}
