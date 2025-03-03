import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule } from '@nestjs/config';
import { EventstoreModule } from '../../datasources/eventstore/eventstore.module';
import { PrismaModule } from '../../datasources/prisma/prisma.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DevelopersModule } from '../developers/developers.module';
import { JwtModule } from '@nestjs/jwt';
import { CustomerModule } from '../customers/customers.module';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule,
        PrismaModule,
        EventstoreModule,
        EventEmitterModule.forRoot(),
        CustomerModule,
        DevelopersModule,
        JwtModule,
      ],
      controllers: [AuthController],
      providers: [AuthService],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
