import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, RefundPaymentDto } from './dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // ── Create ────────────────────────────────────────────────────────────────

  @Post()
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Initiate a payment' })
  async createPayment(@Body() dto: CreatePaymentDto, @Req() req: Request) {
    const userId = (req as any).user?.id as string | undefined;
    return this.payments.createPayment(dto, userId);
  }

  // ── List ──────────────────────────────────────────────────────────────────

  @Get()
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "List the authenticated user's payments" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listPayments(
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const userId = (req as any).user.id as string;
    return this.payments.listPayments(userId, +page, +limit);
  }

  // ── Get one ───────────────────────────────────────────────────────────────

  @Get(':id')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get and sync payment status from provider' })
  @ApiParam({ name: 'id', description: 'Internal payment ID' })
  async getPayment(@Param('id') id: string) {
    return this.payments.getPayment(id);
  }

  // ── Confirm ───────────────────────────────────────────────────────────────

  @Post(':id/confirm')
  @Version('1')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a payment (e.g. after 3DS redirect)' })
  async confirmPayment(
    @Param('id') id: string,
    @Body() body: { paymentMethodId?: string; returnUrl?: string },
  ) {
    return this.payments.confirmPayment(id, body.paymentMethodId, body.returnUrl);
  }

  // ── Capture ───────────────────────────────────────────────────────────────

  @Post(':id/capture')
  @Version('1')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Capture an authorised payment (manual capture flow)' })
  async capturePayment(
    @Param('id') id: string,
    @Body() body: { amountToCapture?: number },
  ) {
    return this.payments.capturePayment(id, body);
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  @Post(':id/cancel')
  @Version('1')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel / void a payment before capture' })
  async cancelPayment(@Param('id') id: string) {
    return this.payments.cancelPayment(id);
  }

  // ── Refund ────────────────────────────────────────────────────────────────

  @Post(':id/refund')
  @Version('1')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund a completed payment (full or partial)' })
  async refundPayment(@Param('id') id: string, @Body() dto: RefundPaymentDto) {
    return this.payments.refundPayment(id, dto);
  }

  @Get(':id/refunds')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'List refunds for a payment' })
  async listRefunds(@Param('id') id: string) {
    return this.payments.listRefunds(id);
  }

  // ── Customer ──────────────────────────────────────────────────────────────

  @Post('customers')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a customer record on the active provider (Stripe/Paystack)' })
  async createCustomer(@Body() body: { email: string; name?: string; phone?: string }) {
    return this.payments.createCustomer(body);
  }

  // ── Webhooks ──────────────────────────────────────────────────────────────
  // These routes receive raw signed bodies — they must NOT use the JSON body parser.
  // Register them as dedicated inbound webhook routes in WebhooksModule instead,
  // or mount them here without the global ValidationPipe.
  //
  // Example (add to WebhooksModule inbound controller):
  //   POST /api/v1/webhooks/inbound/stripe-payments  → PaymentsService.handleWebhookEvent('stripe', ...)
  //   POST /api/v1/webhooks/inbound/adyen-payments   → PaymentsService.handleWebhookEvent('adyen', ...)
  //   POST /api/v1/webhooks/inbound/paystack-payments→ PaymentsService.handleWebhookEvent('paystack', ...)
}
