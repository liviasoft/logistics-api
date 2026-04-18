import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { HooksService } from '../../common/hooks/hooks.service';
import { AppHooks } from '../../common/hooks/hooks.catalog';
import { AppEvents } from '../../events/app-events';
import { IPaymentProvider } from './interfaces/payment-provider.interface';
import { StripeProvider } from './providers/stripe.provider';
import { AdyenProvider } from './providers/adyen.provider';
import { PaystackProvider } from './providers/paystack.provider';
import {
  CreatePaymentParams,
  CustomerResult,
  NormalizedPaymentEvent,
  PaymentProviderName,
  PaymentResult,
  RefundParams,
  RefundResult,
  CreateCustomerParams,
  CapturePaymentParams,
} from './payments.types';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name, { timestamp: true });
  private readonly provider: IPaymentProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
    private readonly hooks: HooksService,
    private readonly stripe: StripeProvider,
    private readonly adyen: AdyenProvider,
    private readonly paystack: PaystackProvider,
  ) {
    const name = this.config.get<PaymentProviderName>('PAYMENT_PROVIDER', 'stripe');
    this.provider = this.resolveProvider(name);
    this.logger.log(`Active payment provider: ${this.provider.name}`);
  }

  // ── Provider ──────────────────────────────────────────────────────────────

  private resolveProvider(name: PaymentProviderName): IPaymentProvider {
    switch (name) {
      case 'stripe':   return this.stripe;
      case 'adyen':    return this.adyen;
      case 'paystack': return this.paystack;
      default:
        throw new BadRequestException(`Unknown payment provider: ${name}`);
    }
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async createPayment(params: CreatePaymentParams, userId?: string): Promise<PaymentResult> {
    // before hook — allows other modules to modify params (e.g. add metadata, enforce rules)
    const finalParams = await this.hooks.callWaterfall(AppHooks.BEFORE_PAYMENT_CREATE, params);

    const result = await this.provider.createPayment(finalParams);

    const record = await this.prisma.payment.create({
      data: {
        userId,
        provider:          result.provider,
        providerPaymentId: result.providerPaymentId,
        status:            result.status,
        amount:            result.amount,
        currency:          result.currency,
        captureMethod:     finalParams.captureMethod ?? 'automatic',
        description:       finalParams.description,
        metadata:          finalParams.metadata ?? {},
        providerResponse:  result.raw as object,
      },
    });

    const payment = { ...result, id: record.id };

    // after hook — fire-and-forget side effects
    await this.hooks.call(AppHooks.AFTER_PAYMENT_CREATE, {
      id: record.id, providerPaymentId: result.providerPaymentId,
      amount: result.amount, currency: result.currency,
      status: result.status, userId,
    });

    this.events.emit(AppEvents.PAYMENT_CREATED, {
      paymentId: record.id, userId, provider: result.provider,
      amount: result.amount, currency: result.currency,
      status: result.status, timestamp: new Date(),
    });

    return payment;
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async getPayment(id: string): Promise<PaymentResult> {
    const record = await this.prisma.payment.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Payment ${id} not found`);

    const result = await this.provider.getPayment(record.providerPaymentId);

    // Sync status if it changed
    if (result.status !== record.status) {
      await this.prisma.payment.update({
        where: { id },
        data: { status: result.status, providerResponse: result.raw as object },
      });
    }

    return { ...result, id: record.id };
  }

  async listPayments(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, items] = await this.prisma.$transaction([
      this.prisma.payment.count({ where: { userId } }),
      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    return { total, page, limit, items };
  }

  // ── Confirm ───────────────────────────────────────────────────────────────

  async confirmPayment(id: string, paymentMethodId?: string, returnUrl?: string): Promise<PaymentResult> {
    const record = await this.prisma.payment.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Payment ${id} not found`);

    const result = await this.provider.confirmPayment(record.providerPaymentId, {
      paymentMethodId,
      returnUrl,
    });

    await this.prisma.payment.update({
      where: { id },
      data: { status: result.status, providerResponse: result.raw as object },
    });

    return { ...result, id: record.id };
  }

  // ── Capture ───────────────────────────────────────────────────────────────

  async capturePayment(id: string, params?: CapturePaymentParams): Promise<PaymentResult> {
    const record = await this.prisma.payment.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Payment ${id} not found`);

    const result = await this.provider.capturePayment(record.providerPaymentId, params);

    await this.prisma.payment.update({
      where: { id },
      data: { status: result.status, providerResponse: result.raw as object },
    });

    return { ...result, id: record.id };
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  async cancelPayment(id: string): Promise<PaymentResult> {
    const record = await this.prisma.payment.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Payment ${id} not found`);

    const result = await this.provider.cancelPayment(record.providerPaymentId);

    await this.prisma.payment.update({
      where: { id },
      data: { status: 'cancelled', providerResponse: result.raw as object },
    });

    return { ...result, id: record.id };
  }

  // ── Refund ────────────────────────────────────────────────────────────────

  async refundPayment(id: string, params: RefundParams): Promise<RefundResult> {
    const record = await this.prisma.payment.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Payment ${id} not found`);

    const result = await this.provider.refundPayment(record.providerPaymentId, params);

    const refundRecord = await this.prisma.refund.create({
      data: {
        paymentId:        record.id,
        provider:         result.provider,
        providerRefundId: result.providerRefundId,
        amount:           result.amount,
        currency:         result.currency,
        status:           result.status,
        reason:           params.reason,
        providerResponse: result.raw as object,
      },
    });

    // Update payment status
    const isFullRefund = !params.amount || params.amount >= record.amount;
    await this.prisma.payment.update({
      where: { id },
      data: { status: isFullRefund ? 'refunded' : 'partially_refunded' },
    });

    await this.hooks.call(AppHooks.AFTER_PAYMENT_REFUND, {
      paymentId: record.id, refundId: refundRecord.id, amount: result.amount,
    });

    this.events.emit(AppEvents.PAYMENT_REFUNDED, {
      paymentId: record.id, refundId: refundRecord.id, userId: record.userId,
      amount: result.amount, currency: result.currency, timestamp: new Date(),
    });

    return { ...result, id: refundRecord.id };
  }

  async listRefunds(paymentId: string) {
    return this.prisma.refund.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Customer ──────────────────────────────────────────────────────────────

  async createCustomer(params: CreateCustomerParams): Promise<CustomerResult> {
    if (!this.provider.createCustomer) {
      throw new BadRequestException(`Provider ${this.provider.name} does not support customer creation`);
    }
    return this.provider.createCustomer(params);
  }

  // ── Webhook ───────────────────────────────────────────────────────────────

  async handleWebhookEvent(
    providerName: PaymentProviderName,
    rawBody: Buffer,
    signature: string,
  ): Promise<void> {
    const provider = this.resolveProvider(providerName);
    const event = await provider.constructWebhookEvent(rawBody, signature);

    this.logger.log(`Webhook [${providerName}] ${event.type} for ${event.providerPaymentId}`);

    // Find the payment record and sync status
    const payment = await this.prisma.payment.findFirst({
      where: {
        provider: providerName,
        providerPaymentId: event.providerPaymentId,
      },
    });

    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: event.status },
      });
    }

    if (event.type === 'payment.succeeded') {
      await this.hooks.call(AppHooks.AFTER_PAYMENT_SUCCEED, {
        id: payment?.id ?? '', amount: event.amount ?? 0,
        currency: event.currency ?? '', userId: payment?.userId ?? undefined,
      });
      this.events.emit(AppEvents.PAYMENT_SUCCEEDED, {
        paymentId: payment?.id ?? event.providerPaymentId,
        userId: payment?.userId ?? undefined,
        provider: providerName, amount: event.amount ?? 0,
        currency: event.currency ?? '', timestamp: new Date(),
      });
    }
  }
}
