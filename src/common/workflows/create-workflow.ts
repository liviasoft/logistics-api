import {
  WorkflowConfig,
  WorkflowDefinition,
  WorkflowData,
  WorkflowContext,
  WorkflowContainer,
  WorkflowExecutionResult,
  WorkflowTransaction,
  StepTransaction,
  StepDefinition,
  HookHandler,
  HookCompensation,
  TransformResult,
  WhenResult,
  ParallelResult,
  DomainEvent,
} from './types';
import { StepResponse, WorkflowResponse } from './responses';
import { v4 as uuidv4 } from 'uuid';

/** Extended result that includes collected domain events */
export interface WorkflowExecutionResultWithEvents<T>
  extends WorkflowExecutionResult<T> {
  /** Domain events emitted by steps (only present on success) */
  domainEvents: DomainEvent[];
}

/**
 * Creates a workflow from a series of steps
 *
 * @param nameOrConfig - Workflow name or configuration object
 * @param handler - Function that defines the workflow's steps
 *
 * @example
 * // Simple workflow
 * const greetWorkflow = createWorkflow(
 *   'greet-user',
 *   function (input: WorkflowData<{ name: string }>) {
 *     const greeting = greetStep(input);
 *     return new WorkflowResponse(greeting);
 *   }
 * );
 *
 * @example
 * // Complex workflow with multiple steps
 * const createOrderWorkflow = createWorkflow(
 *   { name: 'create-order', store: true, retentionTime: 86400 },
 *   function (input: WorkflowData<CreateOrderInput>) {
 *     const cart = validateCartStep(input);
 *     const inventory = reserveInventoryStep(cart);
 *     const payment = processPaymentStep({ cart, inventory });
 *     const order = createOrderRecordStep({ cart, payment });
 *
 *     return new WorkflowResponse({ order, payment });
 *   }
 * );
 *
 * // Execute the workflow
 * const { result, transaction } = await createOrderWorkflow.run(container, {
 *   input: { cartId: 'cart_123', customerId: 'cust_456' },
 * });
 */
export function createWorkflow<TInput, TOutput>(
  nameOrConfig: string | WorkflowConfig,
  handler: (input: WorkflowData<TInput>) => WorkflowResponse<TOutput>,
): WorkflowDefinition<TInput, TOutput> {
  const config: WorkflowConfig =
    typeof nameOrConfig === 'string'
      ? { name: nameOrConfig }
      : nameOrConfig;

  const hooks = new Map<string, HookHandler[]>();

  const workflow: WorkflowDefinition<TInput, TOutput> = {
    __type: 'workflow',
    name: config.name,
    config,
    handler,
    hooks,

    async run(
      container: WorkflowContainer,
      options?: { input?: TInput; context?: Partial<WorkflowContext> },
    ): Promise<WorkflowExecutionResult<TOutput>> {
      const executor = new WorkflowExecutor<TInput, TOutput>(
        workflow,
        container,
        options?.context,
      );
      return executor.execute(options?.input as TInput);
    },
  };

  // Add hook registration methods
  (workflow as unknown as WorkflowDefinitionWithHooks<TInput, TOutput>).hooks = createHookRegistrar(hooks);

  return workflow;
}

interface WorkflowDefinitionWithHooks<TInput, TOutput>
  extends Omit<WorkflowDefinition<TInput, TOutput>, 'hooks'> {
  hooks: HookRegistrar;
}

type HookRegistrar = {
  [hookName: string]: (
    handler: HookHandler,
    compensation?: HookCompensation,
  ) => void;
};

function createHookRegistrar(hooks: Map<string, HookHandler[]>): HookRegistrar {
  return new Proxy({} as HookRegistrar, {
    get(_, hookName: string) {
      return (handler: HookHandler, compensation?: HookCompensation) => {
        const handlers = hooks.get(hookName) || [];
        handlers.push(handler);
        hooks.set(hookName, handlers);
      };
    },
  });
}

/**
 * Internal workflow executor that handles step execution,
 * compensation, and transaction tracking
 */
class WorkflowExecutor<TInput, TOutput> {
  private transaction: WorkflowTransaction;
  private context: WorkflowContext;
  private stepResults: Map<string, unknown> = new Map();
  private executedSteps: Array<{
    step: StepDefinition;
    compensationData: unknown;
  }> = [];
  /** Domain events collected during execution */
  private domainEvents: DomainEvent[] = [];
  /** Current step being executed (for event attribution) */
  private currentStepName = 'workflow';

  constructor(
    private workflow: WorkflowDefinition<TInput, TOutput>,
    container: WorkflowContainer,
    contextOverrides?: Partial<WorkflowContext>,
  ) {
    const transactionId = uuidv4();

    // Build full context with defaults, including emit function
    this.context = {
      container,
      transactionId,
      requestContext: contextOverrides?.requestContext || {
        requestId: `wf-${transactionId}`,
      },
      idempotencyKey: contextOverrides?.idempotencyKey,
      metadata: contextOverrides?.metadata,
      emit: (event: string, payload: unknown) => {
        this.domainEvents.push({
          event,
          payload,
          stepName: this.currentStepName,
          timestamp: new Date(),
        });
      },
    };

    this.transaction = {
      id: transactionId,
      workflowName: workflow.name,
      status: 'pending',
      steps: [],
      startedAt: new Date(),
    };
  }

  async execute(input: TInput): Promise<WorkflowExecutionResultWithEvents<TOutput>> {
    this.transaction.status = 'running';

    try {
      // Create workflow data wrapper
      const workflowInput: WorkflowData<TInput> = {
        __type: 'workflow-data',
        __value: input,
      };

      // Build the workflow plan by calling the handler
      // This creates a declarative plan, not actual execution
      const plan = this.buildPlan(workflowInput);

      // Execute the plan
      const result = await this.executePlan(plan, input);

      this.transaction.status = 'completed';
      this.transaction.completedAt = new Date();

      return {
        result,
        transaction: this.transaction,
        domainEvents: this.domainEvents, // Include collected events on success
      };
    } catch (error) {
      this.transaction.status = 'failed';
      this.transaction.error = error instanceof Error ? error.message : String(error);

      // Run compensation - domain events are discarded on failure
      await this.compensate();

      throw error;
    }
  }

  private buildPlan(input: WorkflowData<TInput>): WorkflowResponse<TOutput> {
    // Execute the handler to build the declarative plan
    return this.workflow.handler(input);
  }

  private async executePlan(
    plan: WorkflowResponse<TOutput>,
    input: TInput,
  ): Promise<TOutput> {
    // Resolve the output by executing all steps
    const result = await this.resolveValue(plan.output, { input });
    return result as TOutput;
  }

  private async resolveValue(
    value: unknown,
    scope: { input: unknown },
  ): Promise<unknown> {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle WorkflowData (input reference)
    if (this.isWorkflowData(value)) {
      return value.__value ?? scope.input;
    }

    // Handle Step invocation result
    if (this.isStepInvocation(value)) {
      return this.executeStep(value.step, value.input, scope);
    }

    // Handle Transform
    if (this.isTransform(value)) {
      return this.executeTransform(value, scope);
    }

    // Handle When/Then
    if (this.isWhenResult(value)) {
      return this.executeWhen(value, scope);
    }

    // Handle Parallelize
    if (this.isParallel(value)) {
      return this.executeParallel(value, scope);
    }

    // Handle StepResponse
    if (this.isStepResponse(value)) {
      return value.output;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return Promise.all(value.map((v) => this.resolveValue(v, scope)));
    }

    // Handle plain objects
    if (typeof value === 'object') {
      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = await this.resolveValue(val, scope);
      }
      return resolved;
    }

    return value;
  }

  private async executeStep(
    step: StepDefinition,
    stepInput: unknown,
    scope: { input: unknown },
  ): Promise<unknown> {
    const stepTransaction: StepTransaction = {
      name: step.name,
      status: 'running',
      startedAt: new Date(),
    };
    this.transaction.steps.push(stepTransaction);

    // Track current step for event attribution
    this.currentStepName = step.name;

    try {
      // Resolve step input
      const resolvedInput = await this.resolveValue(stepInput, scope);

      // Execute the step
      const response = await step.invoke(resolvedInput, this.context);

      // Check for permanent failure
      if (response.isPermanentFailure) {
        throw new Error(response.failureMessage || 'Step permanently failed');
      }

      // Track for potential compensation
      if (step.compensate) {
        this.executedSteps.push({
          step,
          compensationData: response.compensationData,
        });
      }

      stepTransaction.status = 'completed';
      stepTransaction.output = response.output;
      stepTransaction.compensationData = response.compensationData;
      stepTransaction.completedAt = new Date();

      // Store result for later reference
      this.stepResults.set(step.name, response.output);

      return response.output;
    } catch (error) {
      stepTransaction.status = 'failed';
      stepTransaction.error = error instanceof Error ? error.message : String(error);
      stepTransaction.completedAt = new Date();
      throw error;
    }
  }

  private async executeTransform(
    transform: TransformResult<unknown>,
    scope: { input: unknown },
  ): Promise<unknown> {
    // Resolve all dependencies
    const resolved: Record<string, unknown> = {};
    for (const dep of transform.__dependencies) {
      if (this.stepResults.has(dep)) {
        resolved[dep] = this.stepResults.get(dep);
      }
    }

    return transform.__resolver(resolved);
  }

  private async executeWhen(
    whenResult: WhenResult<unknown>,
    scope: { input: unknown },
  ): Promise<unknown> {
    // Resolve the input
    const resolvedInput = await this.resolveValue(whenResult.__input, scope);

    // Check condition
    if (whenResult.__condition(resolvedInput)) {
      const result = whenResult.__handler();
      return this.resolveValue(result, scope);
    }

    return undefined;
  }

  private async executeParallel(
    parallel: ParallelResult<unknown[]>,
    scope: { input: unknown },
  ): Promise<unknown[]> {
    const promises = parallel.__steps.map((step) =>
      this.resolveValue(step, scope),
    );
    return Promise.all(promises);
  }

  private async compensate(): Promise<void> {
    if (this.executedSteps.length === 0) return;

    this.transaction.status = 'compensating';

    // Execute compensation in reverse order
    for (let i = this.executedSteps.length - 1; i >= 0; i--) {
      const { step, compensationData } = this.executedSteps[i];
      const stepTransaction = this.transaction.steps.find(
        (s) => s.name === step.name,
      );

      try {
        if (step.compensate) {
          await step.compensate(compensationData, this.context);
        }
        if (stepTransaction) {
          stepTransaction.status = 'compensated';
        }
      } catch (compensationError) {
        // Log compensation error but continue with other compensations
        console.error(
          `Compensation failed for step ${step.name}:`,
          compensationError,
        );
      }
    }

    this.transaction.status = 'compensated';
  }

  // Type guards
  private isWorkflowData(value: unknown): value is WorkflowData<unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as WorkflowData<unknown>).__type === 'workflow-data'
    );
  }

  private isStepInvocation(
    value: unknown,
  ): value is { step: StepDefinition; input: unknown } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'step' in value &&
      (value as { step: StepDefinition }).step?.__type === 'step'
    );
  }

  private isTransform(value: unknown): value is TransformResult<unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as TransformResult<unknown>).__type === 'transform'
    );
  }

  private isWhenResult(value: unknown): value is WhenResult<unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as WhenResult<unknown>).__type === 'when-result'
    );
  }

  private isParallel(value: unknown): value is ParallelResult<unknown[]> {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as ParallelResult<unknown[]>).__type === 'parallel'
    );
  }

  private isStepResponse(value: unknown): value is StepResponse<unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as StepResponse<unknown>).__type === 'step-response'
    );
  }
}
