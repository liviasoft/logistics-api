import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Res,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { DeveloperSignupDto } from './dto/developer-signup.dto';
import { FeatureFlags } from '../feature-flags/feature-flags.decorator';
import { DeveloperLoginDto } from './dto/developer-login.dto';
import { AuthGuard } from './auth.guard';
import { AsyncStorageService } from '../../common/async-storage/async-storage.service';
import { Request, Response } from 'express';
import { DeveloperRefreshTokenDto } from './dto/developer-refresh-token.dto';
import { FeatureFlagsList } from '../../common/constants';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly asyncStorageService: AsyncStorageService,
  ) {}

  @Post('/developer/signup')
  @FeatureFlags(FeatureFlagsList.DEVELOPER_SIGNUP)
  developerRegister(@Body() developerSignupData: DeveloperSignupDto) {
    return this.authService.developerSignup(developerSignupData);
  }

  @Post('/developer/login')
  @FeatureFlags(FeatureFlagsList.DEVELOPER_LOGIN)
  async developerLogin(
    @Body() developerLoginData: DeveloperLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const {
      accessToken,
      refreshToken: { token: refreshToken, expiresAt },
      csrfToken,
      user,
    } = await this.authService.developerLogin(developerLoginData);
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      expires: expiresAt,
    });
    response.cookie('csrfToken', csrfToken);
    return {
      data: { accessToken, refreshToken, csrfToken, user },
      message: 'Logged In Successfully',
      statusCode: HttpStatus.OK,
    };
  }

  @Post('/developer/refresh-token')
  async developerRefreshAuth(
    @Body() { userId }: DeveloperRefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const oldRefreshToken = request.cookies['refreshToken'];
    if (!oldRefreshToken) throw new BadRequestException();
    const {
      accessToken,
      refreshToken: { token: refreshToken, expiresAt },
      csrfToken,
      user,
    } = await this.authService.developerRefreshAuth(userId, oldRefreshToken);
    const cookieOptions = { httpOnly: true, expires: expiresAt };
    response.cookie('refreshToken', refreshToken, cookieOptions);
    response.cookie('csrfToken', csrfToken, cookieOptions);
    return {
      data: { accessToken, refreshToken, csrfToken, user },
      message: 'Token Refreshed',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('/developer/me')
  @UseGuards(AuthGuard)
  getLoggedInDeveloperDetails() {
    return {
      user: this.asyncStorageService.get('user'),
      auth: this.asyncStorageService.get('auth'),
      isDeveloper: this.asyncStorageService.get('isDeveloper'),
      requestId: this.asyncStorageService.get('requestId'),
    };
  }
}
