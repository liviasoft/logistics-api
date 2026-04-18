import { Module } from '@nestjs/common';
import { PrismaModule } from '../../datasources/prisma/prisma.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeProvider } from './providers/stripe.provider';
import { AdyenProvider } from './providers/adyen.provider';
import { PaystackProvider } from './providers/paystack.provider';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    // All three providers are registered; PaymentsService picks the active one
    // based on the PAYMENT_PROVIDER env var ('stripe' | 'adyen' | 'paystack').
    StripeProvider,
    AdyenProvider,
    PaystackProvider,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
