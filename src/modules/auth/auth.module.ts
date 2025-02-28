import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DevelopersService } from '../developers/developers.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomerService } from '../customer/customer.service';
import { AsyncStorageModule } from '../../common/async-storage/async-storage.module';

@Module({
  imports: [
    AsyncStorageModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
        global: true,
      }),
      global: true,
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, DevelopersService, CustomerService],
})
export class AuthModule {}
