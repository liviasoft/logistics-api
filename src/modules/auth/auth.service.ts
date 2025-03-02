import {
  BadRequestException,
  HttpStatus,
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
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ObjectId } from 'bson';
import {
  MILLISECONDS,
  TIME_PERIOD,
  TIME_PERIOD_KEY,
} from '../../common/constants/time.constants';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { AsyncStorageService } from '../../common/async-storage/async-storage.service';
import { CUSTOMER_RESOURCE, DEVELOPER_RESOURCE } from '../../common/constants';
import { CustomerService } from '../customer/customer.service';
import { CookieOptions, Request, Response } from 'express';

@Injectable()
export class AuthService extends BaseService {
  private readonly logger = new Logger(AuthService.name, {
    timestamp: true,
  });
  private defaultCookieOptions: CookieOptions = {
    httpOnly: true,
    maxAge: 7 * TIME_PERIOD.DAY * MILLISECONDS,
  };
  constructor(
    private readonly developersService: DevelopersService,
    private readonly customerService: CustomerService,
    private readonly asyncStorageService: AsyncStorageService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    super();
  }

  async getContextualUserAccounts(userId: string) {
    if (userId.startsWith(DEVELOPER_RESOURCE)) {
      this.asyncStorageService.set(`${DEVELOPER_RESOURCE}Id`, userId);
      return await this.developersService.findAccountById(userId);
    }
    if (userId.startsWith(CUSTOMER_RESOURCE)) {
      this.asyncStorageService.set(`${CUSTOMER_RESOURCE}Id`, userId);
      return await this.customerService.findAccountById(userId);
    }
    return null;
  }

  async developerSignup(developerSignupDto: DeveloperSignupDto, res: Response) {
    const { email, name: rawName, password: rawPassword } = developerSignupDto;
    const existingAccount =
      await this.developersService.findAccountByEmail(email);
    if (existingAccount) {
      throw new BadRequestException('Email already registered');
    }

    try {
      const password = await bcrypt.hash(rawPassword, 10);
      const name = Case.capital(rawName);
      const accountDetails = { password, name, email };
      const { id: userId } =
        await this.developersService.createAccount(accountDetails);
      const csrfToken = new ObjectId();
      const { token: refreshToken } = await this.generateRefreshToken(
        userId,
        7,
        'DAY',
      );
      const accessToken = await this.generateAccessToken({ userId });
      res.cookie('refreshToken', refreshToken, this.defaultCookieOptions);
      res.cookie('csrfToken', csrfToken, this.defaultCookieOptions);
      return this.formatResponse({
        data: {
          accessToken,
          user: { name, email },
          csrfToken,
          refreshToken,
        },
        message: 'Account registered successfully',
        statusCode: HttpStatus.OK,
      });
    } catch (error: any) {
      this.logger.error(error);
      throw new ServiceUnavailableException(
        'An error occured, please contact support',
      );
    }
  }

  async developerLogin(developerLoginDto: DeveloperLoginDto, res: Response) {
    const { email, password } = developerLoginDto;
    const account = await this.developersService.findAccountByEmail(email);
    if (!account) throw new NotFoundException(`Invalid credentials`);
    const {
      password: _,
      lastEventId: __,
      lastEventType: ___,
      lastStreamId: ____,
      revision: _____,
      ...data
    } = account;
    const passwordsMatch = await bcrypt.compare(password, account.password);
    if (!passwordsMatch) throw new UnauthorizedException('Invalid credentials');
    // TODO: check device login
    const { id: userId } = data;
    const csrfToken = new ObjectId();
    const { token: refreshToken } = await this.generateRefreshToken(
      userId,
      7,
      'DAY',
    );
    const accessToken = await this.generateAccessToken({ userId });
    res.cookie('refreshToken', refreshToken, this.defaultCookieOptions);
    res.cookie('csrfToken', csrfToken, this.defaultCookieOptions);
    return this.formatResponse({
      data: {
        accessToken,
        user: data,
        csrfToken,
        refreshToken,
      },
      message: 'Logged In Successfully',
      statusCode: HttpStatus.OK,
    });
  }

  async developerRefreshAuth(userId: string, token: string, res: Response) {
    const account = await this.developersService.findAccountById(userId);
    if (!account) throw new NotFoundException(`Invalid credentials`);
    const validToken = await this.prisma.refreshToken.findFirst({
      where: {
        AND: [{ userId }, { token }, { expiresAt: { gte: new Date() } }],
      },
    });
    if (!validToken) throw new BadRequestException('Invalid Refresh Token');
    let newToken = validToken;
    const {
      lastEventId: __,
      lastEventType: ___,
      lastStreamId: ____,
      revision: _____,
      ...data
    } = account;
    const csrfToken = new ObjectId();
    const accessToken = await this.generateAccessToken({ userId });
    if (
      Date.parse(String(validToken.expiresAt)) - Date.now() <
      2 * TIME_PERIOD.HOUR * MILLISECONDS
    ) {
      newToken = await this.generateRefreshToken(userId, 7, 'DAY');
    }
    res.cookie('refreshToken', newToken.token, this.defaultCookieOptions);
    res.cookie('csrfToken', csrfToken, this.defaultCookieOptions);
    return this.formatResponse({
      data: {
        accessToken,
        user: data,
        csrfToken,
        refreshToken: newToken.token,
      },
      message: 'Auth Refreshed',
      statusCode: HttpStatus.OK,
    });
  }

  async developerLogout(req: Request, res: Response) {
    const authorization = req.headers?.authorization;
    const token = authorization?.split(' ')[1];
    if (!token) {
      throw new BadRequestException('You are not logged in');
    }
    res.clearCookie('refreshToken', { httpOnly: true });
    res.clearCookie('csrfToken', { httpOnly: true });
    return this.formatResponse({
      message: 'Logged out',
      statusCode: HttpStatus.OK,
    });
  }

  async generateAccessToken(
    payload: Record<string, unknown>,
    options?: Partial<JwtSignOptions>,
  ) {
    return await this.jwtService.signAsync(payload, options);
  }

  async generateRefreshToken(
    userId: string,
    timeAmount: number = 1,
    timePeriod: TIME_PERIOD_KEY = 'DAY',
  ) {
    const expiresAt = new Date(
      Date.now() + timeAmount * TIME_PERIOD[timePeriod] * MILLISECONDS,
    );
    try {
      const token = await this.prisma.refreshToken.create({
        data: { expiresAt, userId },
      });
      return token;
    } catch (error: any) {
      this.logger.error(error);
    }
  }
}
