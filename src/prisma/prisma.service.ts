import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

type WhereArgs = { where?: any };

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy{
  constructor(){
    const adapter = new PrismaPg({
      connectionString : process.env.DATABASE_URL
    });
    super({ adapter });

    const runtimeDataModel = (this as any)._runtimeDataModel;
    const softDeleteModels = new Set<string>();

    if (runtimeDataModel?.models) {
      for (const modelName of Object.keys(runtimeDataModel.models)) {
        const fields = runtimeDataModel.models[modelName].fields ?? [];
        if (fields.some((f: any) => f.name === 'deleted_at')) {
          softDeleteModels.add(modelName);
        }
      }
    }

    const xprisma = this.$extends({
      query: {
        $allModels: {
          async findMany({ model, args, query }: { model: string; args: WhereArgs; query: (a: any) => any }) {
            if (softDeleteModels.has(model)) {
              args.where =  withNotDeleted(args.where);
            }
            return query(args);
          },

          async findFirst({ model, args, query }: { model: string; args: WhereArgs; query: (a: any) => any }) {
            if (softDeleteModels.has(model)) {
              args.where =  withNotDeleted(args.where);
            }
            return query(args);
          },
          
          async count({ model, args, query }: { model: string; args: WhereArgs; query: (a: any) => any }) {
            if (softDeleteModels.has(model)) {
              args.where =  withNotDeleted(args.where);
            }
            return query(args);
          },

          // Soft delete: transformar delete em update
          async delete({ model, args, query }: { model: string; args: any; query: (a: any) => any }) {
            if (!softDeleteModels.has(model)) return query(args);

            return (query as any)({
              ...args,
              data: { deleted_at: new Date() },
            });
          },

          async deleteMany({ model, args, query }: { model: string; args: any; query: (a: any) => any }) {
            if (!softDeleteModels.has(model)) return query(args);

            return (query as any)({
              ...args,
              data: { deleted_at: new Date() },
            });
          },
        },
      },
    });

    Object.assign(this, xprisma);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

function withNotDeleted(where: any) {
  if (!where) return { deleted_at: null };
  if (where.deleted_at !== undefined) return where;
  return { AND: [where, { deleted_at: null }] };
}
