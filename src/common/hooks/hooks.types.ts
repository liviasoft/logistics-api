export type HookHandler<T = unknown, R = T | void> = (
  payload: T,
) => Promise<R> | R;

export interface HookRegistration {
  hookName: string;
  handler: HookHandler;
  /** Optional label for debugging — e.g. 'BillingModule:chargeAfterCreate' */
  label?: string;
}
