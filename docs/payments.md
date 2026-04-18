# Payments Module

Provider-agnostic payment processing supporting **Stripe**, **Adyen**, and **Paystack**. Swap providers with a single environment variable — no code changes needed.

---

## Quick Start

### 1. Set the active provider

```env
# .env
PAYMENT_PROVIDER=stripe   # stripe | adyen | paystack
```

### 2. Install the SDK for your chosen provider

```bash
# Stripe
npm install stripe

# Adyen
npm install @adyen/api-library

# Paystack — no SDK needed, uses native fetch
```

### 3. Fill in the TODOs

Open the relevant provider file and follow the TODO comments:

| Provider | File |
|---|---|
| Stripe | `src/modules/payments/providers/stripe.provider.ts` |
| Adyen | `src/modules/payments/providers/adyen.provider.ts` |
| Paystack | `src/modules/payments/providers/paystack.provider.ts` |

---

## Environment Variables

### Stripe
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Adyen
```env
ADYEN_API_KEY=AQE...
ADYEN_MERCHANT_ACCOUNT=YourMerchantAccount
ADYEN_ENVIRONMENT=TEST          # or LIVE
ADYEN_HMAC_KEY=...              # Adyen Customer Area → Webhooks
ADYEN_CLIENT_KEY=...            # for Drop-in / Components frontend
```

### Paystack
```env
PAYSTACK_SECRET_KEY=sk_test_...
```

---

## REST API

All endpoints are versioned under `/api/v1/payments` and require authentication.

### Create a payment

```
POST /api/v1/payments
Authorization: Bearer <token>

{
  "amount": 5000,           // in smallest unit: cents / kobo / pesewa
  "currency": "usd",        // ISO 4217
  "captureMethod": "automatic",  // or "manual"
  "returnUrl": "https://yourapp.com/payment/result",
  "metadata": { "orderId": "ord_123" }
}
```

Response includes:
- `clientSecret` (Stripe) — pass to the Stripe.js frontend SDK
- `redirectUrl` (Adyen/Paystack) — redirect the user here to complete payment

### Get / sync a payment

```
GET /api/v1/payments/:id
```

Calls the provider's verify endpoint and syncs the status in your database.

### List payments

```
GET /api/v1/payments?page=1&limit=20
```

### Confirm a payment (after 3DS)

```
POST /api/v1/payments/:id/confirm

{ "paymentMethodId": "pm_...", "returnUrl": "https://..." }
```

### Capture (manual capture flow)

```
POST /api/v1/payments/:id/capture

{ "amountToCapture": 5000 }   // partial capture; omit for full
```

### Cancel / void

```
POST /api/v1/payments/:id/cancel
```

### Refund

```
POST /api/v1/payments/:id/refund

{
  "amount": 2500,              // partial; omit for full refund
  "reason": "requested_by_customer"
}
```

### List refunds

```
GET /api/v1/payments/:id/refunds
```

### Create a customer

```
POST /api/v1/payments/customers

{ "email": "user@example.com", "name": "Jane Doe" }
```

> Adyen does not support explicit customer creation — use `customerId` as `shopperReference` in `createPayment` instead.

---

## Payment Flow by Provider

### Stripe (PaymentIntent)

```
1. POST /api/v1/payments
   → returns clientSecret

2. Frontend: stripe.confirmPayment({ clientSecret, ... })
   → Stripe redirects to returnUrl on success/failure

3. GET /api/v1/payments/:id  (or wait for webhook)
   → status: succeeded
```

### Adyen (Sessions API — recommended)

```
1. POST /api/v1/payments
   → returns raw.sessionId + raw.sessionData

2. Frontend: render Adyen Drop-in with sessionId + sessionData
   → Adyen handles 3DS, redirect, etc.

3. Adyen POSTs webhook → AUTHORISATION / CAPTURE
   → sync via handleWebhookEvent()
```

### Paystack

```
1. POST /api/v1/payments
   → returns redirectUrl (authorization_url)

2. Redirect user to redirectUrl
   → User pays on Paystack's hosted page
   → Paystack redirects to returnUrl with ?reference=...

3. GET /api/v1/payments/:id  (verify by reference)
   → status: succeeded
```

---

## Webhooks

Payment webhooks arrive as signed POST requests. Route them through the existing `WebhooksModule` inbound controller, or create dedicated routes.

### Routing example

```typescript
// In InboundWebhooksController or a new PaymentWebhooksController:

@Post('stripe-payments')
@UseGuards(StripeSignatureGuard)
async stripePayments(@Req() req: RawBodyRequest<Request>) {
  const signature = req.headers['stripe-signature'] as string;
  await this.paymentsService.handleWebhookEvent('stripe', req.rawBody, signature);
  return { received: true };
}

@Post('paystack-payments')
async paystackPayments(@Req() req: RawBodyRequest<Request>) {
  const signature = req.headers['x-paystack-signature'] as string;
  await this.paymentsService.handleWebhookEvent('paystack', req.rawBody, signature);
  return { received: true };
}
```

### Signature algorithms

| Provider | Algorithm | Header |
|---|---|---|
| Stripe | HMAC-SHA256 with `t=<unix>,v1=<hex>` format + 5-min replay protection | `stripe-signature` |
| Adyen | HMAC validated inside notification item (use `hmacValidator` from SDK) | N/A |
| Paystack | HMAC-**SHA512** | `x-paystack-signature` |

---

## Database Schema

```prisma
model Payment {
  id                String   @id @default(cuid())
  userId            String?
  provider          String              // 'stripe' | 'adyen' | 'paystack'
  providerPaymentId String              // provider's own ID / reference
  status            String              // PaymentStatus union
  amount            Int                 // smallest unit
  currency          String
  captureMethod     String   @default("automatic")
  description       String?
  metadata          Json?
  providerResponse  Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user    User?    @relation(...)
  refunds Refund[]

  @@unique([provider, providerPaymentId])
}

model Refund {
  id               String   @id @default(cuid())
  paymentId        String
  provider         String
  providerRefundId String
  amount           Int
  currency         String
  status           String
  reason           String?
  providerResponse Json?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  payment Payment @relation(...)
  @@unique([provider, providerRefundId])
}
```

---

## Adding a New Provider

1. Create `src/modules/payments/providers/myprovider.provider.ts` implementing `IPaymentProvider`
2. Add `'myprovider'` to the `PaymentProviderName` union in `payments.types.ts`
3. Register in `PaymentsModule` providers array
4. Inject in `PaymentsService` and add a case to `resolveProvider()`
5. Set `PAYMENT_PROVIDER=myprovider` in `.env`

---

## Status Reference

| Normalised Status | Stripe | Adyen | Paystack |
|---|---|---|---|
| `pending` | `requires_payment_method` / `requires_confirmation` | — | `pending` |
| `requires_action` | `requires_action` | `RedirectShopper` | — |
| `requires_capture` | `requires_capture` | `AUTHORISATION` | — |
| `processing` | `processing` | `PENDING` / `queued` | `processing` / `queued` |
| `succeeded` | `succeeded` | `CAPTURE` | `success` |
| `failed` | `canceled` (Stripe spelling) | `Refused` / `Error` | `failed` |
| `cancelled` | `canceled` | `CANCELLATION` | `abandoned` |
| `refunded` | — | `REFUND` | `reversed` |
