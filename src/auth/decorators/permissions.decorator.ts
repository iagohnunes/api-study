import { SetMetadata } from '@nestjs/common';

// Chave usada para guardar os metadados
export const PERMISSIONS_KEY = 'permissions';

// Decorator @Permissions('users:write', 'users:delete')
export const Permissions = (...permissions: string[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);