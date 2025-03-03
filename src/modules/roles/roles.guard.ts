import {
  CanActivate,
  ExecutionContext,
  // forwardRef,
  // Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
// import { AuthService } from '../auth/auth.service';
import { ROLES } from './roles.decorator';
import { AsyncStorageService } from '../../common/async-storage/async-storage.service';
import { ConfigService } from '@nestjs/config';
import { DeveloperAccount } from '../developers/entities/developer.entity';
import { Customer } from '../customers/entities/customer.entity';
import { RolesList } from '../../common/constants/roles-list.constants';
import { CUSTOMER_RESOURCE, DEVELOPER_RESOURCE } from '../../common/constants';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name, {
    timestamp: true,
  });
  constructor(
    private readonly reflector: Reflector,
    private readonly asyncStorageService: AsyncStorageService,
    private readonly configService: ConfigService,
  ) {}
  canActivate(context: ExecutionContext) {
    this.logger.log('Reached Roles Guard');
    const roleNames = this.reflector.getAllAndMerge<string[]>(ROLES, [
      context.getClass(),
      context.getHandler(),
    ]);
    const user = this.asyncStorageService.get<DeveloperAccount | Customer>(
      'user',
    );
    if (!user) throw new UnauthorizedException();
    if (user.email === this.configService.get('SUPERADMIN_EMAIL')) {
      this.asyncStorageService.set(RolesList.SUPER_ADMIN, true);
      return true;
    }
    if (!roleNames || !roleNames.length) return true;
    const requiredRoles: { [key: string]: string } = {};
    roleNames.forEach((role) => {
      requiredRoles[role] = role;
    });
    if (requiredRoles[RolesList.SUPER_ADMIN]) {
      if (user.email !== this.configService.get('SUPERADMIN_EMAIL'))
        throw new UnauthorizedException();
    }
    if (requiredRoles[RolesList.DEVELOPER]) {
      if (!this.asyncStorageService.get(`${DEVELOPER_RESOURCE}Id`))
        throw new UnauthorizedException();
    }
    if (requiredRoles[RolesList.CUSTOMER]) {
      if (!this.asyncStorageService.get(`${CUSTOMER_RESOURCE}Id`))
        throw new UnauthorizedException();
    }
    return true;
  }
}
