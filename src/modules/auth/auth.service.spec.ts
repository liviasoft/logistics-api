import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../datasources/prisma/prisma.module';
import { EventstoreModule } from '../../datasources/eventstore/eventstore.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DevelopersModule } from '../developers/developers.module';
import { JwtModule } from '@nestjs/jwt';
import { CustomerModule } from '../customers/customers.module';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule,
        PrismaModule,
        EventstoreModule,
        EventEmitterModule.forRoot(),
        DevelopersModule,
        CustomerModule,
        JwtModule,
      ],
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
