import {
  BadRequestException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CookieOptions, Response } from 'express';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { HooksService } from '../../common/hooks/hooks.service';
import { AppHooks } from '../../common/hooks/hooks.catalog';
import { AppEvents } from '../../events/app-events';
import { UsersService } from '../users/users.service';
import { BaseService } from '../../common/base.service';
import { SignupDto, LoginDto } from './dto';
import {
  MILLISECONDS,
  TIME_PERIOD,
  TIME_PERIOD_KEY,
} from '../../common/constants/time.constants';

@Injectable()
export class AuthService extends BaseService {
  private readonly cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * TIME_PERIOD.DAY * MILLISECONDS,
  };

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly events: EventEmitter2,
    private readonly hooks: HooksService,
  ) {
    super();
  }

  async signup(dto: SignupDto, res: Response) {
    // Check if user exists
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // before hook — allows modules to enrich or validate signup params
    const finalDto = await this.hooks.callWaterfall(AppHooks.BEFORE_USER_CREATE, {
      email: dto.email, name: dto.name, password: dto.password,
    });

    // Create user
    const user = await this.usersService.create({ ...dto, ...finalDto });

    // after hook + event
    await this.hooks.call(AppHooks.AFTER_USER_CREATE, {
      id: user.id, email: user.email, name: user.name,
    });
    this.events.emit(AppEvents.USER_REGISTERED, {
      userId: user.id, email: user.email, name: user.name, timestamp: new Date(),
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id);

    // Set cookies
    res.cookie('refreshToken', refreshToken, this.cookieOptions);

    return this.formatResponse({
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      message: 'Account created successfully',
      statusCode: HttpStatus.CREATED,
    });
  }

  async login(dto: LoginDto, res: Response) {
    // Find user
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isValid = await this.usersService.validatePassword(
      dto.password,
      user.password,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if active
    if (!user.active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id);

    // Set cookies
    res.cookie('refreshToken', refreshToken, this.cookieOptions);

    return this.formatResponse({
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      message: 'Logged in successfully',
      statusCode: HttpStatus.OK,
    });
  }

  async refresh(userId: string, token: string, res: Response) {
    // Validate refresh token
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        token,
        userId,
        expiresAt: { gte: new Date() },
        revoked: false,
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } =
      await this.generateTokens(userId);

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    // Set new cookie
    res.cookie('refreshToken', newRefreshToken, this.cookieOptions);

    return this.formatResponse({
      data: {
        accessToken,
        user: {
          id: storedToken.user.id,
          email: storedToken.user.email,
          name: storedToken.user.name,
        },
      },
      message: 'Token refreshed',
      statusCode: HttpStatus.OK,
    });
  }

  async logout(userId: string, res: Response) {
    // Revoke all refresh tokens for user
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });

    // Clear cookie
    res.clearCookie('refreshToken', this.cookieOptions);

    return this.formatResponse({
      message: 'Logged out successfully',
      statusCode: HttpStatus.OK,
    });
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    return this.formatResponse({
      data: { user },
      statusCode: HttpStatus.OK,
    });
  }

  private async generateTokens(userId: string) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId },
      { expiresIn: '15m' },
    );

    const refreshToken = await this.createRefreshToken(userId, 7, 'DAY');

    return { accessToken, refreshToken };
  }

  private async createRefreshToken(
    userId: string,
    amount: number = 7,
    period: TIME_PERIOD_KEY = 'DAY',
  ) {
    const expiresAt = new Date(
      Date.now() + amount * TIME_PERIOD[period] * MILLISECONDS,
    );

    const token = await this.prisma.refreshToken.create({
      data: { userId, expiresAt },
    });

    return token.token;
  }
}
