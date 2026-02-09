import { SetMetadata } from '@nestjs/common';

// Chave usada para guardar os metadados
export const ROLES_KEY = 'roles';

// Decorator @Roles('ADMIN', 'MODERATOR')
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);