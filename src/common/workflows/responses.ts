/**
 * StepResponse - Wraps step output with optional compensation data
 *
 * @example
 * // Basic usage
 * return new StepResponse({ orderId: '123' });
 *
 * // With compensation data
 * return new StepResponse(
 *   { orderId: '123' },
 *   { previousState: oldOrder }
 * );
 *
 * // Permanent failure (will trigger compensation)
 * return StepResponse.permanentFailure('Payment declined', { attemptedAmount: 100 });
 */
export class StepResponse<TOutput, TCompensation = TOutput> {
  public readonly __type = 'step-response' as const;
  public readonly output: TOutput;
  public readonly compensationData: TCompensation;
  public readonly isPermanentFailure: boolean;
  public readonly failureMessage?: string;

  constructor(output: TOutput, compensationData?: TCompensation) {
    this.output = output;
    this.compensationData = compensationData ?? (output as unknown as TCompensation);
    this.isPermanentFailure = false;
  }

  /**
   * Creates a permanent failure response that triggers compensation
   */
  static permanentFailure<TCompensation>(
    message: string,
    compensationData?: TCompensation,
  ): StepResponse<never, TCompensation> {
    const response = new StepResponse<never, TCompensation>(
      undefined as never,
      compensationData as TCompensation,
    );
    (response as { isPermanentFailure: boolean }).isPermanentFailure = true;
    (response as { failureMessage: string }).failureMessage = message;
    return response;
  }
}

/**
 * WorkflowResponse - Wraps workflow output
 *
 * @example
 * return new WorkflowResponse({
 *   order: createdOrder,
 *   invoice: generatedInvoice,
 * });
 */
export class WorkflowResponse<TOutput> {
  public readonly __type = 'workflow-response' as const;
  public readonly output: TOutput;

  constructor(output: TOutput) {
    this.output = output;
  }
}
