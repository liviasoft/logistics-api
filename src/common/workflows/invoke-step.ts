import { StepDefinition } from './types';

/**
 * Internal step invocation marker
 * This is returned when a step is "called" within a workflow definition
 */
export interface StepInvocation<TOutput> {
  step: StepDefinition;
  input: unknown;
  output?: TOutput;
}

/**
 * Makes a step callable within workflow definitions
 *
 * When you call a step within a workflow handler, it doesn't execute immediately.
 * Instead, it returns a StepInvocation that the workflow executor will process.
 *
 * @example
 * const myStep = createStep('my-step', async (input) => {
 *   return new StepResponse(input.value * 2);
 * });
 *
 * // Make the step callable
 * const callableStep = makeStepCallable(myStep);
 *
 * // Use in workflow
 * const workflow = createWorkflow('my-workflow', (input) => {
 *   const result = callableStep(input); // Returns StepInvocation, not the actual result
 *   return new WorkflowResponse(result);
 * });
 */
export function makeStepCallable<TInput, TOutput, TCompensation>(
  step: StepDefinition<TInput, TOutput, TCompensation>,
): (input: TInput) => StepInvocation<TOutput> {
  return (input: TInput): StepInvocation<TOutput> => ({
    step: step as StepDefinition,
    input,
  });
}

/**
 * Creates a step that is immediately callable
 * This is a convenience wrapper around createStep + makeStepCallable
 *
 * @example
 * const greetStep = createCallableStep(
 *   'greet',
 *   async (input: { name: string }) => {
 *     return new StepResponse(`Hello, ${input.name}!`);
 *   }
 * );
 *
 * // Use directly in workflow
 * const workflow = createWorkflow('my-workflow', (input) => {
 *   const greeting = greetStep(input);
 *   return new WorkflowResponse(greeting);
 * });
 */
export { makeStepCallable as callable };
