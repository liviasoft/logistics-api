/**
 * Workflow SDK
 *
 * A workflow engine inspired by Medusa 2's workflow system.
 * Provides composable, transactional workflows with automatic
 * compensation (rollback) on failure.
 *
 * @example
 * // Define steps
 * const validateCartStep = createStep(
 *   'validate-cart',
 *   async (input: { cartId: string }, { container }) => {
 *     const cartService = container.resolve(CartService);
 *     const cart = await cartService.validate(input.cartId);
 *     return new StepResponse(cart);
 *   }
 * );
 *
 * const reserveInventoryStep = createStep(
 *   'reserve-inventory',
 *   async (cart: Cart, { container }) => {
 *     const inventoryService = container.resolve(InventoryService);
 *     const reservations = await inventoryService.reserve(cart.items);
 *     return new StepResponse(reservations, { reservationIds: reservations.map(r => r.id) });
 *   },
 *   async (data, { container }) => {
 *     // Compensation: release reservations on failure
 *     const inventoryService = container.resolve(InventoryService);
 *     await inventoryService.release(data.reservationIds);
 *   }
 * );
 *
 * // Create workflow
 * const checkoutWorkflow = createWorkflow(
 *   'checkout',
 *   function (input: WorkflowData<{ cartId: string }>) {
 *     const cart = validateCartStep(input);
 *     const reservations = reserveInventoryStep(cart);
 *     const payment = processPaymentStep({ cart, reservations });
 *     const order = createOrderStep({ cart, payment, reservations });
 *
 *     return new WorkflowResponse({ order, payment });
 *   }
 * );
 *
 * // Execute workflow (in a service)
 * const { result, transaction } = await workflowEngine.run(checkoutWorkflow, {
 *   input: { cartId: 'cart_123' },
 * });
 */

// Core
export { createStep, type StepInput, type StepOutput } from './create-step';
export { createWorkflow } from './create-workflow';
export { StepResponse, WorkflowResponse } from './responses';
export { makeStepCallable, callable } from './invoke-step';

// Utilities
export { transform, when, parallelize } from './utilities';

// Types
export type {
  WorkflowContext,
  WorkflowContainer,
  WorkflowData,
  WorkflowConfig,
  WorkflowDefinition,
  WorkflowExecutionResult,
  WorkflowTransaction,
  RequestContext,
  DomainEvent,
  StepConfig,
  StepDefinition,
  StepTransaction,
  StepFunction,
  CompensationFunction,
} from './types';

// Exceptions
export {
  WorkflowException,
  StepFailedException,
  CompensationFailedException,
  StepValidationException,
  StepNotFoundException,
  StepConflictException,
  StepTimeoutException,
  WorkflowErrors,
  parseStepError,
} from './exceptions';

// Subscribers
export {
  WorkflowSubscriber,
  WorkflowInfraSubscriber,
  type DomainEventMetadata,
  type DomainEventPayload,
} from './subscriber.decorator';

// Engine
export { WorkflowEngineService, type WorkflowRunOptions, type WorkflowEvents } from './workflow-engine.service';
export { WorkflowExecutionResultWithEvents } from './create-workflow';
export { WorkflowModule } from './workflow.module';
