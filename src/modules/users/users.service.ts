import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../datasources/prisma/prisma.service';
import { BaseService } from '../../common/base.service';
import { CreateUserDto, UpdateUserDto } from './dto';

const USER_RESOURCE = 'user';

@Injectable()
export class UsersService extends BaseService {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        id: this.createResourceId(USER_RESOURCE),
        email: data.email,
        name: data.name,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        createdAt: true,
      },
    });

    return user;
  }

  async findAll(params: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = this.defaultPaginationLimit } = params;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          active: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      ...this.paginate(total, limit, page),
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, data: UpdateUserDto) {
    const updateData: Record<string, unknown> = {};

    if (data.name) {
      updateData.name = data.name;
    }

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async delete(id: string) {
    await this.prisma.user.delete({
      where: { id },
    });

    return { deleted: true };
  }

  async validatePassword(plainPassword: string, hashedPassword: string) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
