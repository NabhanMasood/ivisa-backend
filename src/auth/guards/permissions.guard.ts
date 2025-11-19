import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, Permission } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const admin = request.admin;
    const adminRole = request.adminRole;

    if (!admin) {
      throw new ForbiddenException('Authentication required');
    }

    // Super admins have access to everything
    if (adminRole === 'superadmin') {
      return true;
    }

    // Sub-admins need to have the required permissions
    const adminPermissions = request.adminPermissions;

    if (!adminPermissions) {
      throw new ForbiddenException('No permissions assigned to this account');
    }

    // Check if admin has all required permissions
    const hasAllPermissions = requiredPermissions.every(
      (permission) => adminPermissions[permission] === true,
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true;
  }
}

