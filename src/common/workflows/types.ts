/**
 * Workflow SDK Types
 * Inspired by Medusa 2's workflow engine
 */
import { StepResponse, WorkflowResponse } from './responses';

export interface RequestContext {
  /** Unique identifier for the current request */
  requestId: string;
  /** Authenticated user payload from JWT (if available) */
  auth?: {
    sub: string;
    email?: string;
    type?: 'developer' | 'customer';
    [key: string]: unknown;
  };
  /** Additional request metadata */
  metadata?: Record<string, unknown>;
}

export interface WorkflowContext {
  /** Dependency injection container (NestJS ModuleRef wrapper) */
  container: WorkflowContainer;
  /** Current request context from AsyncStorageService */
  requestContext: RequestContext;
  /** Unique transaction ID for this workflow execution */
  transactionId: string;
  /** Idempotency key for deduplication (if provided) */
  idempotencyKey?: string;
  /** Additional workflow metadata */
  metadata?: Record<string, unknown>;
  /**
   * Emit a domain event from a step.
   * Events are collected and only dispatched after successful workflow completion.
   * On workflow failure, collected events are discarded.
   */
  emit: (event: string, payload: unknown) => void;
}

export interface DomainEvent {
  /** Event name (e.g., 'order.created', 'payment.processed') */
  event: string;
  /** Event payload */
  payload: unknown;
  /** Step that emitted the event */
  stepName: string;
  /** Timestamp when the event was emitted */
  timestamp: Date;
}

export interface WorkflowContainer {
  resolve<T>(token: string | symbol | (new (...args: unknown[]) => T)): T;
}

export interface StepConfig {
  name: string;
  async?: boolean;
  timeout?: number;
  retries?: number;
}

export interface WorkflowConfig {
  name: string;
  store?: boolean;
  retentionTime?: number;
}

export type StepFunction<TInput, TOutput> = (
  input: TInput,
  context: WorkflowContext,
) => Promise<StepResponse<TOutput>>;

export type CompensationFunction<TCompensationData> = (
  compensationData: TCompensationData,
  context: WorkflowContext,
) => Promise<void>;

export interface StepDefinition<TInput = unknown, TOutput = unknown, TCompensation = unknown> {
  __type: 'step';
  name: string;
  config: StepConfig;
  invoke: StepFunction<TInput, TOutput>;
  compensate?: CompensationFunction<TCompensation>;
}

export interface WorkflowDefinition<TInput = unknown, TOutput = unknown> {
  __type: 'workflow';
  name: string;
  config: WorkflowConfig;
  handler: (input: WorkflowData<TInput>) => WorkflowResponse<TOutput>;
  hooks: Map<string, HookHandler[]>;
  run: (
    container: WorkflowContainer,
    options?: { input?: TInput; context?: Partial<WorkflowContext> },
  ) => Promise<WorkflowExecutionResult<TOutput>>;
}

export interface WorkflowExecutionResult<T> {
  result: T;
  transaction: WorkflowTransaction;
}

export interface WorkflowTransaction {
  id: string;
  workflowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'compensating' | 'compensated';
  steps: StepTransaction[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface StepTransaction {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'compensated';
  output?: unknown;
  compensationData?: unknown;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface WorkflowData<T> {
  __type: 'workflow-data';
  __value?: T;
}

export type HookHandler = (
  input: unknown,
  context: WorkflowContext,
) => Promise<StepResponse<unknown> | void>;

export type HookCompensation = (
  data: unknown,
  context: WorkflowContext,
) => Promise<void>;

export interface TransformResult<T> {
  __type: 'transform';
  __resolver: (resolved: Record<string, unknown>) => T;
  __dependencies: string[];
}

export interface WhenCondition<T> {
  __type: 'when';
  __name?: string;
  __input: T;
  __condition: (input: T) => boolean;
  then: <TResult>(
    handler: () => TResult,
  ) => WhenResult<TResult>;
}

export interface WhenResult<T> {
  __type: 'when-result';
  __name?: string;
  __handler: () => T;
  __condition: (input: unknown) => boolean;
  __input: unknown;
}

export interface ParallelResult<T extends unknown[]> {
  __type: 'parallel';
  __steps: unknown[];
  __results?: T;
}
