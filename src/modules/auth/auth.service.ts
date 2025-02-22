import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Case } from 'change-case-all';
import { DeveloperSignupDto } from './dto/developer-signup.dto';
import { EventstoreService } from '../../datasources/eventstore/eventstore.service';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { BaseService } from '../../common/base.service';
import { DeveloperEventType } from '../../events/developer.events';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DEVELOPER_RESOURCE } from '../../common/constants';

@Injectable()
export class AuthService extends BaseService {
  private readonly logger = new Logger(AuthService.name, {
    timestamp: true,
  });
  constructor(
    private prisma: PrismaService,
    private eventStore: EventstoreService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async developerSignup(developerSignupDto: DeveloperSignupDto) {
    const { email, name, password } = developerSignupDto;
    const emailInUse = await this.prisma.developerAccount.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (emailInUse) throw new BadRequestException('Email already registered');
    const id = this.createResourceId(DEVELOPER_RESOURCE);
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const accountDetails = {
        id,
        password: hashedPassword,
        name: Case.capital(name),
        email,
      };
      await this.eventStore.appendEvent(
        id,
        DeveloperEventType.DeveloperSignedUp,
        {
          ...accountDetails,
          createdAt: new Date(),
        },
      );
      this.eventEmitter.emit(
        DeveloperEventType.DeveloperSignedUp,
        accountDetails,
      );
      return this.formatResponse({
        data: accountDetails,
        message: `This action registers a new developer account - ${id}`,
      });
    } catch (error: any) {
      this.logger.error(error);
      throw new ServiceUnavailableException(
        'An error occured, please contact support',
      );
    }
  }
}
