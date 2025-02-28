import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AsyncStorageService } from '../../common/async-storage/async-storage.service';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name, {
    timestamp: true,
  });
  constructor(
    private readonly asyncStorageService: AsyncStorageService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(_: ExecutionContext) {
    const store = this.asyncStorageService.getStore();
    const auth = store.get('auth');
    this.logger.log({ auth });
    if (!auth || !auth?.userId) throw new UnauthorizedException();

    try {
      const user = await this.authService.getContextualUserAccounts(
        auth.userId,
      );
      store.set('user', user);
      this.logger.log({ user });
      return true;
    } catch (error: any) {
      this.logger.error(error);
      throw new UnauthorizedException();
    }
  }
}
