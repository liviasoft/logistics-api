import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Case } from 'change-case-all';
import { DeveloperSignupDto } from './dto/developer-signup.dto';
import { BaseService } from '../../common/base.service';
import { DeveloperLoginDto } from './dto/developer-login.dto';
import { DevelopersService } from '../developers/developers.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService extends BaseService {
  private readonly logger = new Logger(AuthService.name, {
    timestamp: true,
  });
  constructor(
    private readonly developersService: DevelopersService,
    private jwtService: JwtService,
  ) {
    super();
  }

  async developerSignup(developerSignupDto: DeveloperSignupDto) {
    const { email, name: rawName, password: rawPassword } = developerSignupDto;
    const existingAccount =
      await this.developersService.findAccountByEmail(email);
    if (existingAccount)
      throw new BadRequestException('Email already registered');

    try {
      const password = await bcrypt.hash(rawPassword, 10);
      const name = Case.capital(rawName);
      const accountDetails = { password, name, email };
      return this.formatResponse({
        data: await this.developersService.createAccount(accountDetails),
        statusCode: 201,
        message: `Developer Account registered successfully`,
      });
    } catch (error: any) {
      this.logger.error(error);
      throw new ServiceUnavailableException(
        'An error occured, please contact support',
      );
    }
  }

  async developerLogin(developerLoginDto: DeveloperLoginDto) {
    const { email, password } = developerLoginDto;
    const existingAccount =
      await this.developersService.findAccountByEmail(email);
    if (!existingAccount)
      throw new NotFoundException(`${email} is not registered`);
    const {
      password: _,
      lastEventId: __,
      lastEventType: ___,
      lastStreamId: ____,
      revision: _____,
      ...data
    } = existingAccount;
    const passwordsMatch = await bcrypt.compare(
      password,
      existingAccount.password,
    );
    if (!passwordsMatch) throw new UnauthorizedException('Invalid credentials');
    return this.formatResponse({ message: 'Logged In Successfully', data });
  }
}
