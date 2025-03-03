import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AsyncStorageModule } from '../../common/async-storage/async-storage.module';
import { AuthGuard } from './auth.guard';
import { DevelopersModule } from '../developers/developers.module';
import { CustomerModule } from '../customers/customers.module';

@Module({
  imports: [
    AsyncStorageModule,
    DevelopersModule,
    CustomerModule,
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
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
