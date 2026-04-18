import { OnEvent } from '@nestjs/event-emitter';

/**
 * Metadata attached to domain events from workflows
 */
export interface DomainEventMetadata {
  workflowName: string;
  transactionId: string;
  requestId: string;
  stepName: string;
  timestamp: Date;
}

/**
 * Domain event payload with metadata
 */
export type DomainEventPayload<T = Record<string, unknown>> = T & {
  __metadata: DomainEventMetadata;
};

/**
 * Decorator for subscribing to workflow domain events
 *
 * This is a convenience wrapper around @OnEvent that provides
 * better typing for workflow domain events.
 *
 * @param event - The domain event name to subscribe to
 *
 * @example
 * @Injectable()
 * export class OrderSubscriber {
 *   constructor(
 *     private emailService: EmailService,
 *     private analyticsService: AnalyticsService,
 *   ) {}
 *
 *   @WorkflowSubscriber('order.created')
 *   async onOrderCreated(payload: DomainEventPayload<{ order: Order }>) {
 *     const { order, __metadata } = payload;
 *
 *     // Access event metadata
 *     console.log(`Order created in workflow: ${__metadata.workflowName}`);
 *     console.log(`Transaction ID: ${__metadata.transactionId}`);
 *
 *     // Perform side effects
 *     await this.emailService.sendOrderConfirmation(order);
 *     await this.analyticsService.track('order_created', { orderId: order.id });
 *   }
 *
 *   @WorkflowSubscriber('payment.processed')
 *   async onPaymentProcessed(payload: DomainEventPayload<{ payment: Payment }>) {
 *     const { payment } = payload;
 *     await this.analyticsService.track('payment_processed', {
 *       amount: payment.amount,
 *       method: payment.method,
 *     });
 *   }
 * }
 */
export function WorkflowSubscriber(event: string): MethodDecorator {
  return OnEvent(event);
}

/**
 * Decorator for subscribing to workflow infrastructure events
 *
 * Use this for observability concerns like logging, metrics, and tracing.
 *
 * @param event - The infrastructure event name
 *
 * @example
 * @Injectable()
 * export class WorkflowMetricsCollector {
 *   constructor(private metricsService: MetricsService) {}
 *
 *   @WorkflowInfraSubscriber('workflow.completed')
 *   onWorkflowCompleted(event: {
 *     workflowName: string;
 *     transactionId: string;
 *     durationMs: number;
 *   }) {
 *     this.metricsService.recordHistogram(
 *       'workflow_duration_ms',
 *       event.durationMs,
 *       { workflow: event.workflowName },
 *     );
 *   }
 *
 *   @WorkflowInfraSubscriber('workflow.failed')
 *   onWorkflowFailed(event: {
 *     workflowName: string;
 *     error: string;
 *     compensated: boolean;
 *   }) {
 *     this.metricsService.incrementCounter(
 *       'workflow_failures_total',
 *       { workflow: event.workflowName, compensated: String(event.compensated) },
 *     );
 *   }
 * }
 */
export function WorkflowInfraSubscriber(
  event:
    | 'workflow.started'
    | 'workflow.completed'
    | 'workflow.failed'
    | 'step.started'
    | 'step.completed'
    | 'step.failed',
): MethodDecorator {
  return OnEvent(event);
}
