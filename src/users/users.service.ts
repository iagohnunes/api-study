import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    
    const user = await  this.prisma.user.findUnique({
      select: {
        id: true,
        name: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
      where: {
        id,
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(createUserDto: CreateUserDto) {
    // return await this.prisma.$transaction(async (cursor) => {
    // });

    return this.prisma.user.create({
        data: {
          ...createUserDto,
          status: 'PENDING',
        },
        select: {
          id: true,
          name: true,
          status: true,
          created_at: true,
        },
      });

  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      return this.prisma.user.update({
        where: { id },
        data: updateUserDto,
        select: {
          id: true,
          name: true,
          status: true,
          updated_at: true,
        },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }
}
