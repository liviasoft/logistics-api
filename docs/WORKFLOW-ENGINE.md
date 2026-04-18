# Workflow Engine

A workflow engine inspired by [Medusa 2's workflow system](https://docs.medusajs.com/learn/fundamentals/workflows). Provides composable, transactional workflows with automatic compensation (rollback) on failure.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Quick Start](#quick-start)
- [Creating Steps](#creating-steps)
- [Creating Workflows](#creating-workflows)
- [Workflow Utilities](#workflow-utilities)
- [Error Handling](#error-handling)
- [Events and Subscribers](#events-and-subscribers)
- [Request Context](#request-context)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)

---

## Overview

The workflow engine provides:

- **Composable Steps**: Define atomic operations that can be reused across workflows
- **Automatic Compensation**: Failed workflows automatically rollback completed steps
- **Domain Events**: Steps can emit business events, dispatched only on success
- **Request Context**: Access to authenticated user, request ID, and metadata
- **Error Mapping**: Step errors automatically map to appropriate HTTP responses
- **Idempotency**: Built-in deduplication support via idempotency keys

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Controller / Service                      │
│                     workflowEngine.run(workflow)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      WorkflowEngineService                       │
│  • Builds context from AsyncStorageService                       │
│  • Executes workflow                                             │
│  • Dispatches events on success                                  │
│  • Converts errors to HTTP exceptions                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Workflow Executor                           │
│  • Executes steps in order                                       │
│  • Collects domain events                                        │
│  • Runs compensation on failure                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         ┌────────┐      ┌────────┐      ┌────────┐
         │ Step 1 │ ───▶ │ Step 2 │ ───▶ │ Step 3 │
         └────────┘      └────────┘      └────────┘
              │               │               │
              ▼               ▼               ▼
         Compensation    Compensation    Compensation
         (on failure)    (on failure)    (on failure)
```

---

## Core Concepts

### Steps

A **step** is an atomic unit of work. Each step:
- Receives input and context
- Returns a `StepResponse` with output and optional compensation data
- Can optionally define a compensation function for rollback

### Workflows

A **workflow** composes multiple steps into a transactional operation. If any step fails:
1. The workflow stops execution
2. Compensation functions run in reverse order
3. An appropriate error is thrown

### Events

The engine supports three types of events:

| Type | Purpose | When Dispatched |
|------|---------|-----------------|
| **Infrastructure** | Observability (logging, metrics) | Always |
| **Domain** | Business logic (notifications, sync) | Only on success |
| **Hooks** | Extension points | At defined points |

---

## Quick Start

### 1. Import the module

```typescript
// app.module.ts
import { WorkflowModule } from './common/workflows';

@Module({
  imports: [WorkflowModule],
})
export class AppModule {}
```

### 2. Define steps

```typescript
// steps/order.steps.ts
import { createStep, StepResponse, makeStepCallable } from '../common/workflows';

const validateCartStepDef = createStep(
  'validate-cart',
  async (input: { cartId: string }, { container }) => {
    const cartService = container.resolve(CartService);
    const cart = await cartService.findById(input.cartId);

    if (!cart) {
      throw WorkflowErrors.notFound('cart', input.cartId);
    }

    return new StepResponse(cart);
  },
);

export const validateCartStep = makeStepCallable(validateCartStepDef);
```

### 3. Create a workflow

```typescript
// workflows/create-order.workflow.ts
import { createWorkflow, WorkflowResponse, WorkflowData } from '../common/workflows';
import { validateCartStep, reserveInventoryStep, processPaymentStep } from '../steps';

export const createOrderWorkflow = createWorkflow(
  'create-order',
  function (input: WorkflowData<{ cartId: string; customerId: string }>) {
    const cart = validateCartStep(input);
    const reservation = reserveInventoryStep(cart);
    const payment = processPaymentStep({ cart, reservation });

    return new WorkflowResponse({ cart, reservation, payment });
  },
);
```

### 4. Execute in a controller

```typescript
// order.controller.ts
@Controller('orders')
export class OrderController {
  constructor(private workflowEngine: WorkflowEngineService) {}

  @Post()
  async createOrder(@Body() dto: CreateOrderDto) {
    const { result } = await this.workflowEngine.run(createOrderWorkflow, {
      input: { cartId: dto.cartId, customerId: dto.customerId },
    });

    return result;
  }
}
```

---

## Creating Steps

### Basic Step

```typescript
import { createStep, StepResponse } from '../common/workflows';

const greetStep = createStep(
  'greet',
  async (input: { name: string }) => {
    return new StepResponse(`Hello, ${input.name}!`);
  },
);
```

### Step with Container Access

```typescript
const findUserStep = createStep(
  'find-user',
  async (input: { userId: string }, { container }) => {
    const userService = container.resolve(UserService);
    const user = await userService.findById(input.userId);
    return new StepResponse(user);
  },
);
```

### Step with Compensation

```typescript
const reserveInventoryStep = createStep(
  'reserve-inventory',
  // Main function
  async (input: { productId: string; quantity: number }, { container }) => {
    const inventoryService = container.resolve(InventoryService);
    const reservation = await inventoryService.reserve(input.productId, input.quantity);

    // Second argument to StepResponse is compensation data
    return new StepResponse(
      reservation,
      { reservationId: reservation.id },
    );
  },
  // Compensation function (runs on workflow failure)
  async (data: { reservationId: string }, { container }) => {
    const inventoryService = container.resolve(InventoryService);
    await inventoryService.release(data.reservationId);
  },
);
```

### Step with Configuration

```typescript
const paymentStep = createStep(
  {
    name: 'process-payment',
    retries: 3,
    timeout: 30000,
  },
  async (input: { amount: number }) => {
    // Process payment...
    return new StepResponse({ transactionId: 'txn_123' });
  },
);
```

### Step Emitting Domain Events

```typescript
const createOrderStep = createStep(
  'create-order',
  async (input: { cart: Cart; payment: Payment }, { container, emit }) => {
    const orderService = container.resolve(OrderService);
    const order = await orderService.create(input);

    // Emit domain event (dispatched only on workflow success)
    emit('order.created', {
      orderId: order.id,
      customerId: order.customerId,
      total: order.total,
    });

    return new StepResponse(order);
  },
);
```

### Step with Request Context

```typescript
const auditStep = createStep(
  'audit-action',
  async (input: { action: string }, { container, requestContext }) => {
    const auditService = container.resolve(AuditService);

    await auditService.log({
      action: input.action,
      userId: requestContext.auth?.sub,
      requestId: requestContext.requestId,
    });

    return new StepResponse({ logged: true });
  },
);
```

---

## Creating Workflows

### Basic Workflow

```typescript
import { createWorkflow, WorkflowResponse, WorkflowData } from '../common/workflows';

const greetWorkflow = createWorkflow(
  'greet-user',
  function (input: WorkflowData<{ name: string }>) {
    const greeting = greetStep(input);
    return new WorkflowResponse(greeting);
  },
);
```

### Workflow with Configuration

```typescript
const createOrderWorkflow = createWorkflow(
  {
    name: 'create-order',
    store: true,           // Store execution history
    retentionTime: 86400,  // Keep for 24 hours
  },
  function (input: WorkflowData<CreateOrderInput>) {
    // ... steps
    return new WorkflowResponse(result);
  },
);
```

### Executing Workflows

```typescript
// Basic execution
const { result, transaction } = await workflowEngine.run(myWorkflow, {
  input: { key: 'value' },
});

// With idempotency key (prevents duplicate execution)
const { result } = await workflowEngine.run(myWorkflow, {
  input: data,
  idempotencyKey: `order-${orderId}`,
});

// Without throwing on error
const { result, transaction } = await workflowEngine.run(myWorkflow, {
  input: data,
  throwOnError: false,
});

if (transaction.status === 'failed') {
  console.error('Workflow failed:', transaction.error);
}
```

---

## Workflow Utilities

### transform

Manipulate data between steps:

```typescript
import { transform } from '../common/workflows';

const workflow = createWorkflow('example', function (input) {
  const user = findUserStep(input);
  const orders = findOrdersStep(input);

  // Transform data for next step
  const summary = transform(
    { user, orders },
    (data) => ({
      userName: data.user.name,
      orderCount: data.orders.length,
      totalSpent: data.orders.reduce((sum, o) => sum + o.total, 0),
    }),
  );

  const report = generateReportStep(summary);
  return new WorkflowResponse(report);
});
```

### parallelize

Run steps concurrently:

```typescript
import { parallelize } from '../common/workflows';

const workflow = createWorkflow('notify', function (input) {
  const order = createOrderStep(input);

  // Run notifications in parallel
  const [emailResult, smsResult, pushResult] = parallelize(
    sendEmailStep({ orderId: order.id }),
    sendSmsStep({ orderId: order.id }),
    sendPushStep({ orderId: order.id }),
  );

  return new WorkflowResponse({ order, notifications: { emailResult, smsResult, pushResult } });
});
```

### when / then

Conditional step execution:

```typescript
import { when } from '../common/workflows';

const workflow = createWorkflow('checkout', function (input) {
  const cart = validateCartStep(input);
  const payment = processPaymentStep(cart);

  // Apply discount only for premium users
  const discount = when(input, (data) => data.isPremium)
    .then(() => applyPremiumDiscountStep(cart));

  // Handle both active and inactive differently
  const activeResult = when(input, (data) => data.status === 'active')
    .then(() => handleActiveStep(input));

  const inactiveResult = when(input, (data) => data.status !== 'active')
    .then(() => handleInactiveStep(input));

  return new WorkflowResponse({ cart, payment, discount });
});
```

---

## Error Handling

### Semantic Errors in Steps

Use `WorkflowErrors` to throw errors that map to HTTP status codes:

```typescript
import { WorkflowErrors } from '../common/workflows';

const findUserStep = createStep('find-user', async (input, { container }) => {
  const user = await userService.findById(input.userId);

  if (!user) {
    // Maps to HTTP 404
    throw WorkflowErrors.notFound('user', input.userId);
  }

  if (!user.isActive) {
    // Maps to HTTP 400
    throw WorkflowErrors.validation(['User account is not active']);
  }

  if (user.email !== input.email) {
    // Maps to HTTP 409
    throw WorkflowErrors.conflict('Email does not match');
  }

  return new StepResponse(user);
});
```

### Error Mapping

| WorkflowErrors Method | HTTP Status |
|-----------------------|-------------|
| `notFound(resource)` | 404 Not Found |
| `validation(errors)` | 400 Bad Request |
| `conflict(message)` | 409 Conflict |
| `unauthorized(message)` | 401 Unauthorized |
| `forbidden(message)` | 403 Forbidden |
| (default) | 500 Internal Server Error |

### Permanent Failure

Force compensation without retries:

```typescript
const batchProcessStep = createStep('batch-process', async (input) => {
  const results = [];
  const processed = [];

  try {
    for (const item of input.items) {
      await processItem(item);
      processed.push(item.id);
    }
    return new StepResponse(results);
  } catch (error) {
    // Ensure compensation receives partial data
    return StepResponse.permanentFailure(
      `Failed at item ${processed.length}`,
      { processedIds: processed },
    );
  }
});
```

---

## Events and Subscribers

### Event Types

#### Infrastructure Events

Emitted for observability (always dispatched):

```typescript
'workflow.started'   // { workflowName, transactionId, requestId, input }
'workflow.completed' // { workflowName, transactionId, requestId, result, durationMs }
'workflow.failed'    // { workflowName, transactionId, requestId, error, compensated }
```

#### Domain Events

Emitted by steps for business logic (only dispatched on success):

```typescript
// In a step
emit('order.created', { orderId, customerId, total });
emit('payment.processed', { transactionId, amount });
emit('inventory.reserved', { productId, quantity });
```

### Creating Subscribers

#### Domain Event Subscriber

```typescript
import { Injectable } from '@nestjs/common';
import { WorkflowSubscriber, DomainEventPayload } from '../common/workflows';

@Injectable()
export class OrderSubscriber {
  constructor(
    private emailService: EmailService,
    private analyticsService: AnalyticsService,
  ) {}

  @WorkflowSubscriber('order.created')
  async onOrderCreated(payload: DomainEventPayload<{ orderId: string; customerId: string }>) {
    const { orderId, customerId, __metadata } = payload;

    // Access event metadata
    console.log(`Order created in workflow: ${__metadata.workflowName}`);
    console.log(`Step: ${__metadata.stepName}`);
    console.log(`Transaction: ${__metadata.transactionId}`);

    // Perform side effects
    await this.emailService.sendOrderConfirmation(orderId);
    await this.analyticsService.track('order_created', { orderId, customerId });
  }

  @WorkflowSubscriber('payment.processed')
  async onPaymentProcessed(payload: DomainEventPayload<{ amount: number }>) {
    await this.analyticsService.track('payment_processed', {
      amount: payload.amount,
    });
  }
}
```

#### Infrastructure Event Subscriber

```typescript
import { Injectable } from '@nestjs/common';
import { WorkflowInfraSubscriber } from '../common/workflows';

@Injectable()
export class WorkflowMetrics {
  constructor(private metrics: MetricsService) {}

  @WorkflowInfraSubscriber('workflow.completed')
  onCompleted(event: { workflowName: string; durationMs: number }) {
    this.metrics.histogram('workflow_duration_ms', event.durationMs, {
      workflow: event.workflowName,
    });
  }

  @WorkflowInfraSubscriber('workflow.failed')
  onFailed(event: { workflowName: string; compensated: boolean }) {
    this.metrics.increment('workflow_failures_total', {
      workflow: event.workflowName,
      compensated: String(event.compensated),
    });
  }
}
```

### Event Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      Workflow Execution                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Step 1: emit('order.created', {...})  ──┐                     │
│                                           │                      │
│   Step 2: emit('payment.processed', {...})├── Collected         │
│                                           │                      │
│   Step 3: (no event)                   ───┘                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │     Workflow Succeeds?        │
              └───────────────────────────────┘
                     │              │
                    Yes             No
                     │              │
                     ▼              ▼
         ┌────────────────┐  ┌────────────────┐
         │ Dispatch domain│  │ Events are     │
         │ events to      │  │ discarded      │
         │ subscribers    │  │                │
         └────────────────┘  └────────────────┘
```

---

## Request Context

Every step has access to the request context:

```typescript
interface RequestContext {
  requestId: string;           // Unique request identifier
  auth?: {                     // JWT payload (if authenticated)
    sub: string;
    email?: string;
    type?: 'developer' | 'customer';
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
}
```

### Usage in Steps

```typescript
const myStep = createStep('my-step', async (input, { requestContext }) => {
  const { requestId, auth } = requestContext;

  console.log(`Request ID: ${requestId}`);
  console.log(`User ID: ${auth?.sub}`);
  console.log(`User Email: ${auth?.email}`);

  return new StepResponse({ ... });
});
```

---

## Best Practices

### 1. Keep Steps Atomic

Each step should do one thing:

```typescript
// Good: Single responsibility
const validateCartStep = createStep('validate-cart', ...);
const reserveInventoryStep = createStep('reserve-inventory', ...);
const processPaymentStep = createStep('process-payment', ...);

// Bad: Too many responsibilities
const doEverythingStep = createStep('do-everything', async (input) => {
  await validateCart(input);
  await reserveInventory(input);
  await processPayment(input);
  return new StepResponse({ ... });
});
```

### 2. Always Provide Compensation for Side Effects

```typescript
// Good: Compensation provided
const chargeCardStep = createStep(
  'charge-card',
  async (input) => {
    const charge = await stripe.charges.create(input);
    return new StepResponse(charge, { chargeId: charge.id });
  },
  async (data) => {
    await stripe.refunds.create({ charge: data.chargeId });
  },
);

// Bad: No compensation for side effect
const chargeCardStep = createStep(
  'charge-card',
  async (input) => {
    const charge = await stripe.charges.create(input);
    return new StepResponse(charge);
  },
);
```

### 3. Use Semantic Errors

```typescript
// Good: Semantic error
throw WorkflowErrors.notFound('product', productId);

// Bad: Generic error
throw new Error('Product not found');
```

### 4. Emit Events for Important Business Operations

```typescript
const createOrderStep = createStep('create-order', async (input, { emit }) => {
  const order = await orderService.create(input);

  // Good: Emit event for subscribers
  emit('order.created', { orderId: order.id, total: order.total });

  return new StepResponse(order);
});
```

### 5. Use Idempotency Keys for User-Initiated Actions

```typescript
@Post('orders')
async createOrder(@Body() dto: CreateOrderDto) {
  const { result } = await this.workflowEngine.run(createOrderWorkflow, {
    input: dto,
    idempotencyKey: `create-order-${dto.cartId}-${dto.customerId}`,
  });
  return result;
}
```

---

## API Reference

### createStep

```typescript
function createStep<TInput, TOutput, TCompensation>(
  nameOrConfig: string | StepConfig,
  invoke: StepFunction<TInput, TOutput>,
  compensate?: CompensationFunction<TCompensation>,
): StepDefinition<TInput, TOutput, TCompensation>
```

### createWorkflow

```typescript
function createWorkflow<TInput, TOutput>(
  nameOrConfig: string | WorkflowConfig,
  handler: (input: WorkflowData<TInput>) => WorkflowResponse<TOutput>,
): WorkflowDefinition<TInput, TOutput>
```

### WorkflowEngineService

```typescript
class WorkflowEngineService {
  run<TInput, TOutput>(
    workflow: WorkflowDefinition<TInput, TOutput>,
    options: WorkflowRunOptions<TInput>,
  ): Promise<WorkflowExecutionResult<TOutput>>

  getTransaction(transactionId: string): WorkflowTransaction | undefined
  getTransactionsByWorkflow(workflowName: string): WorkflowTransaction[]
  clearTransactions(olderThanMs?: number): number
  clearIdempotencyCache(): number
}
```

### StepResponse

```typescript
class StepResponse<TOutput, TCompensation = TOutput> {
  constructor(output: TOutput, compensationData?: TCompensation)
  static permanentFailure<T>(message: string, compensationData?: T): StepResponse<never, T>
}
```

### WorkflowResponse

```typescript
class WorkflowResponse<TOutput> {
  constructor(output: TOutput)
}
```

### Utilities

```typescript
function transform<TData, TResult>(
  data: TData,
  transformer: (data: TData) => TResult,
): TransformResult<TResult>

function when<TInput>(
  input: TInput,
  condition: (input: TInput) => boolean,
): WhenCondition<TInput>

function parallelize<T extends unknown[]>(...steps: T): ParallelResult<T>
```

### WorkflowErrors

```typescript
const WorkflowErrors = {
  notFound: (resource: string, id?: string) => Error,
  validation: (errors: string[]) => Error,
  conflict: (message: string) => Error,
  unauthorized: (message?: string) => Error,
  forbidden: (message?: string) => Error,
}
```
