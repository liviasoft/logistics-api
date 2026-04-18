import { TransformResult, WhenCondition, WhenResult, ParallelResult } from './types';

/**
 * Transform data between workflow steps
 *
 * Since workflow definitions are declarative and don't execute immediately,
 * you can't directly manipulate step outputs. Use `transform` to create
 * derived values that will be resolved during execution.
 *
 * @param data - Object containing variables to transform
 * @param transformer - Function that receives resolved data and returns transformed result
 *
 * @example
 * // Extract IDs from a list
 * const orderIds = transform(
 *   { orders },
 *   (data) => data.orders.map(o => o.id)
 * );
 *
 * @example
 * // Combine multiple values
 * const summary = transform(
 *   { customer, order, invoice },
 *   (data) => ({
 *     customerName: data.customer.name,
 *     orderTotal: data.order.total,
 *     invoiceNumber: data.invoice.number,
 *   })
 * );
 *
 * @example
 * // Create a value without dependencies
 * const timestamp = transform({}, () => new Date().toISOString());
 */
export function transform<
  TData extends Record<string, unknown>,
  TResult,
>(
  data: TData,
  transformer: (data: { [K in keyof TData]: TData[K] extends { output: infer O } ? O : TData[K] }) => TResult,
): TransformResult<TResult> {
  return {
    __type: 'transform',
    __resolver: transformer as (resolved: Record<string, unknown>) => TResult,
    __dependencies: Object.keys(data),
  };
}

/**
 * Conditionally execute workflow steps
 *
 * Use `when` with `then` to execute steps only if a condition is met.
 * The condition is evaluated at runtime with resolved input values.
 *
 * @param nameOrInput - Unique name for the condition block, OR the input data
 * @param inputOrCondition - Input data if name provided, OR condition function
 * @param conditionFn - Condition function if name and input provided
 *
 * @example
 * // Basic condition
 * const premiumResult = when(input, (data) => data.isPremium)
 *   .then(() => {
 *     return applyPremiumDiscountStep(input);
 *   });
 *
 * @example
 * // Named condition (required when returning non-step values)
 * const conditionalValue = when('check-active', input, (data) => data.isActive)
 *   .then(() => {
 *     return processActiveItemStep(input);
 *   });
 *
 * @example
 * // Simulating if-else with two when blocks
 * const activeResult = when(input, (data) => data.status === 'active')
 *   .then(() => handleActiveStep(input));
 *
 * const inactiveResult = when(input, (data) => data.status !== 'active')
 *   .then(() => handleInactiveStep(input));
 */
export function when<TInput>(
  input: TInput,
  condition: (input: TInput) => boolean,
): WhenCondition<TInput>;
export function when<TInput>(
  name: string,
  input: TInput,
  condition: (input: TInput) => boolean,
): WhenCondition<TInput>;
export function when<TInput>(
  nameOrInput: string | TInput,
  inputOrCondition: TInput | ((input: TInput) => boolean),
  conditionFn?: (input: TInput) => boolean,
): WhenCondition<TInput> {
  let name: string | undefined;
  let input: TInput;
  let condition: (input: TInput) => boolean;

  if (typeof nameOrInput === 'string' && conditionFn) {
    name = nameOrInput;
    input = inputOrCondition as TInput;
    condition = conditionFn;
  } else {
    input = nameOrInput as TInput;
    condition = inputOrCondition as (input: TInput) => boolean;
  }

  return {
    __type: 'when',
    __name: name,
    __input: input,
    __condition: condition,
    then<TResult>(handler: () => TResult): WhenResult<TResult> {
      return {
        __type: 'when-result',
        __name: name,
        __handler: handler,
        __condition: condition as (input: unknown) => boolean,
        __input: input,
      };
    },
  };
}

/**
 * Run multiple steps in parallel
 *
 * Use `parallelize` when steps are independent and can execute concurrently.
 * The workflow waits for all parallel steps to complete before continuing.
 *
 * @param steps - Steps to execute in parallel
 * @returns Array of results in the same order as input steps
 *
 * @example
 * const [inventory, shipping, pricing] = parallelize(
 *   checkInventoryStep(product),
 *   calculateShippingStep(address),
 *   calculatePricingStep(product, customer),
 * );
 *
 * @example
 * // Use with destructuring
 * const [emailResult, smsResult] = parallelize(
 *   sendEmailStep({ to: customer.email, template: 'order-confirm' }),
 *   sendSmsStep({ to: customer.phone, message: 'Order confirmed!' }),
 * );
 */
export function parallelize<T extends unknown[]>(
  ...steps: T
): ParallelResult<{ [K in keyof T]: T[K] extends { output: infer O } ? O : T[K] }> {
  return {
    __type: 'parallel',
    __steps: steps,
  };
}
