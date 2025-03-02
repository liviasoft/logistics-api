import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Res,
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
  developerRegister(
    @Body() developerSignupData: DeveloperSignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.developerSignup(developerSignupData, res);
  }

  @Post('/developer/login')
  @FeatureFlags(FeatureFlagsList.DEVELOPER_LOGIN)
  async developerLogin(
    @Body() developerLoginData: DeveloperLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.developerLogin(developerLoginData, res);
  }

  @Post('/developer/refresh-token')
  async developerRefreshAuth(
    @Body() { userId }: DeveloperRefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = request.cookies['refreshToken'];
    if (!token)
      throw new BadRequestException('Invalid or missing refresh token');
    return await this.authService.developerRefreshAuth(userId, token, res);
  }

  @Get('/developer/me')
  @UseGuards(AuthGuard)
  LoggedInDeveloperDetails() {
    return {
      user: this.asyncStorageService.get('user'),
      auth: this.asyncStorageService.get('auth'),
      isDeveloper: this.asyncStorageService.get('isDeveloper'),
      requestId: this.asyncStorageService.get('requestId'),
    };
  }

  @Get('/developer/logout')
  LogoutDeveloper(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.developerLogout(req, res);
  }
}
