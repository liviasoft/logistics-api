import {
  StepConfig,
  StepDefinition,
  StepFunction,
  CompensationFunction,
  WorkflowContext,
} from './types';
import { StepResponse } from './responses';

/**
 * Creates a workflow step with optional compensation function
 *
 * @param nameOrConfig - Step name or configuration object
 * @param invoke - Main step function that performs the operation
 * @param compensate - Optional compensation function for rollback
 *
 * @example
 * // Simple step
 * const greetStep = createStep(
 *   'greet',
 *   async (input: { name: string }) => {
 *     return new StepResponse(`Hello, ${input.name}!`);
 *   }
 * );
 *
 * @example
 * // Step with compensation
 * const reserveInventoryStep = createStep(
 *   'reserve-inventory',
 *   async (input: { productId: string; quantity: number }, { container }) => {
 *     const inventoryService = container.resolve(InventoryService);
 *     const reservation = await inventoryService.reserve(input.productId, input.quantity);
 *     return new StepResponse(
 *       { reservationId: reservation.id },
 *       { reservationId: reservation.id } // data for compensation
 *     );
 *   },
 *   async (compensationData, { container }) => {
 *     const inventoryService = container.resolve(InventoryService);
 *     await inventoryService.releaseReservation(compensationData.reservationId);
 *   }
 * );
 *
 * @example
 * // Step with config
 * const paymentStep = createStep(
 *   { name: 'process-payment', retries: 3, timeout: 30000 },
 *   async (input: { amount: number }) => {
 *     // process payment
 *     return new StepResponse({ transactionId: 'txn_123' });
 *   },
 *   async (data) => {
 *     // refund payment
 *   }
 * );
 */
export function createStep<TInput, TOutput, TCompensation = TOutput>(
  nameOrConfig: string | StepConfig,
  invoke: StepFunction<TInput, TOutput>,
  compensate?: CompensationFunction<TCompensation>,
): StepDefinition<TInput, TOutput, TCompensation> {
  const config: StepConfig =
    typeof nameOrConfig === 'string' ? { name: nameOrConfig } : nameOrConfig;

  const step: StepDefinition<TInput, TOutput, TCompensation> = {
    __type: 'step',
    name: config.name,
    config,
    invoke,
    compensate,
  };

  return step;
}

/**
 * Type helper to extract step input type
 */
export type StepInput<T> =
  T extends StepDefinition<infer TInput, unknown, unknown> ? TInput : never;

/**
 * Type helper to extract step output type
 */
export type StepOutput<T> =
  T extends StepDefinition<unknown, infer TOutput, unknown> ? TOutput : never;
