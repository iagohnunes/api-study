import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, permissions } from '@prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // ==================== ROLES ====================
  console.log('📋 Criando roles...');

  const adminRole = await prisma.roles.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrador com acesso total ao sistema',
    },
  });

  const userRole = await prisma.roles.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      description: 'Usuário comum do sistema',
    },
  });

  const moderatorRole = await prisma.roles.upsert({
    where: { name: 'MODERATOR' },
    update: {},
    create: {
      name: 'MODERATOR',
      description: 'Moderador com permissões intermediárias',
    },
  });

  console.log('✅ Roles criadas:', { adminRole, userRole, moderatorRole });

  // ==================== PERMISSIONS ====================
  console.log('🔐 Criando permissões...');

  const permissions = [
    // Permissões de Usuários
    { name: 'users:read', resource: 'users', action: 'read', description: 'Visualizar usuários' },
    { name: 'users:write', resource: 'users', action: 'write', description: 'Criar e editar usuários' },
    { name: 'users:delete', resource: 'users', action: 'delete', description: 'Deletar usuários' },
    { name: 'users:manage', resource: 'users', action: 'manage', description: 'Gerenciar usuários (tudo)' },

    // Permissões de Roles
    { name: 'roles:read', resource: 'roles', action: 'read', description: 'Visualizar roles' },
    { name: 'roles:write', resource: 'roles', action: 'write', description: 'Criar e editar roles' },
    { name: 'roles:delete', resource: 'roles', action: 'delete', description: 'Deletar roles' },
    { name: 'roles:manage', resource: 'roles', action: 'manage', description: 'Gerenciar roles (tudo)' },

    // Permissões de Permissões
    { name: 'permissions:read', resource: 'permissions', action: 'read', description: 'Visualizar permissões' },
    { name: 'permissions:write', resource: 'permissions', action: 'write', description: 'Criar e editar permissões' },
    { name: 'permissions:delete', resource: 'permissions', action: 'delete', description: 'Deletar permissões' },
    { name: 'permissions:manage', resource: 'permissions', action: 'manage', description: 'Gerenciar permissões (tudo)' },

    // Permissões de Sistema
    { name: 'system:settings', resource: 'system', action: 'settings', description: 'Acessar configurações do sistema' },
    { name: 'system:logs', resource: 'system', action: 'logs', description: 'Visualizar logs do sistema' },
    { name: 'system:audit', resource: 'system', action: 'audit', description: 'Visualizar auditoria' },
  ];

  const createdPermissions: permissions[] = [];
  for (const permission of permissions) {
    const created = await prisma.permissions.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
    createdPermissions.push(created);
  }

  console.log(`✅ ${createdPermissions.length} permissões criadas`);

  // ==================== ROLE PERMISSIONS ====================
  console.log('🔗 Vinculando permissões às roles...');

  // ADMIN: Todas as permissões
  for (const permission of createdPermissions) {
    await prisma.role_permissions.upsert({
      where: {
        role_id_permission_id: {
          role_id: adminRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: adminRole.id,
        permission_id: permission.id,
      },
    });
  }

  // MODERATOR: Permissões de leitura e escrita (sem delete)
  const moderatorPermissions = createdPermissions.filter(
    (p) => p.action === 'read' || p.action === 'write',
  );
  for (const permission of moderatorPermissions) {
    await prisma.role_permissions.upsert({
      where: {
        role_id_permission_id: {
          role_id: moderatorRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: moderatorRole.id,
        permission_id: permission.id,
      },
    });
  }

  // USER: Apenas leitura de usuários
  const userPermissions = createdPermissions.filter(
    (p) => p.resource === 'users' && p.action === 'read',
  );
  for (const permission of userPermissions) {
    await prisma.role_permissions.upsert({
      where: {
        role_id_permission_id: {
          role_id: userRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: userRole.id,
        permission_id: permission.id,
      },
    });
  }

  console.log('✅ Permissões vinculadas às roles');

  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
 