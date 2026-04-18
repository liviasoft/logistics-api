import { Injectable, Logger } from '@nestjs/common';
import { AppHookName, HookPayloadMap } from './hooks.catalog';
import { HookHandler } from './hooks.types';

@Injectable()
export class HooksService {
  private readonly logger = new Logger(HooksService.name, { timestamp: true });
  private readonly registry = new Map<string, Array<{ handler: HookHandler; label?: string }>>();

  // ── Registration ───────────────────────────────────────────────────────────

  /**
   * Register a handler for a named hook point.
   * Returns an unregister function — call it in onModuleDestroy to clean up.
   *
   * @example — fire-and-forget side effect
   * this.hooks.register(AppHooks.AFTER_PAYMENT_CREATE, async (payment) => {
   *   await this.dispatcher.dispatch('payment.created', payment);
   * }, 'WebhooksModule');
   *
   * @example — waterfall (transform params before an operation)
   * this.hooks.register(AppHooks.BEFORE_PAYMENT_CREATE, (params) => {
   *   return { ...params, metadata: { ...params.metadata, source: 'web' } };
   * }, 'AttributionModule');
   */
  register<K extends AppHookName>(
    hookName: K,
    handler: HookHandler<HookPayloadMap[K]>,
    label?: string,
  ): () => void {
    const list = this.registry.get(hookName) ?? [];
    const entry = { handler: handler as HookHandler, label };
    list.push(entry);
    this.registry.set(hookName, list);

    this.logger.debug(`Hook registered: ${hookName}${label ? ` [${label}]` : ''}`);

    return () => {
      const current = this.registry.get(hookName) ?? [];
      this.registry.set(hookName, current.filter((e) => e !== entry));
    };
  }

  // ── call — parallel, fire-and-forget ──────────────────────────────────────

  /**
   * Run all handlers for a hook in parallel.
   * Errors in individual handlers are caught and logged — they never
   * propagate to the caller. Use for after* side-effects.
   *
   * @example
   * await this.hooks.call(AppHooks.AFTER_PAYMENT_CREATE, { id, amount, currency });
   */
  async call<K extends AppHookName>(
    hookName: K,
    payload: HookPayloadMap[K],
  ): Promise<void> {
    const handlers = this.registry.get(hookName);
    if (!handlers?.length) return;

    await Promise.all(
      handlers.map(async ({ handler, label }) => {
        try {
          await handler(payload);
        } catch (err: any) {
          this.logger.error(
            `Hook handler error [${hookName}]${label ? ` (${label})` : ''}: ${err?.message}`,
            err?.stack,
          );
        }
      }),
    );
  }

  // ── callWaterfall — sequential, transforming ───────────────────────────────

  /**
   * Run all handlers sequentially. Each handler receives the (possibly
   * modified) output of the previous one and can return a new value.
   * If a handler returns undefined, the current value is passed through unchanged.
   * Errors propagate — a throwing before* hook cancels the operation.
   * Use for before* hooks that need to transform params.
   *
   * @example
   * const finalParams = await this.hooks.callWaterfall(AppHooks.BEFORE_PAYMENT_CREATE, params);
   * // then use finalParams instead of the original params
   */
  async callWaterfall<K extends AppHookName>(
    hookName: K,
    initial: HookPayloadMap[K],
  ): Promise<HookPayloadMap[K]> {
    const handlers = this.registry.get(hookName);
    if (!handlers?.length) return initial;

    let current = initial;
    for (const { handler, label } of handlers) {
      const result = await handler(current);
      if (result !== undefined && result !== null) {
        current = result as HookPayloadMap[K];
      }
    }
    return current;
  }

  // ── Introspection ──────────────────────────────────────────────────────────

  /** List all registered hook names and handler counts — useful for diagnostics. */
  listHooks(): { hookName: string; count: number; labels: (string | undefined)[] }[] {
    return Array.from(this.registry.entries())
      .filter(([, handlers]) => handlers.length > 0)
      .map(([hookName, handlers]) => ({
        hookName,
        count:  handlers.length,
        labels: handlers.map((h) => h.label),
      }));
  }
}
