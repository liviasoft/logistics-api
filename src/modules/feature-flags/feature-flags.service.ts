import { Injectable } from '@nestjs/common';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { PrismaService } from 'src/datasources/prisma/prisma.service';

@Injectable()
export class FeatureFlagsService {
  constructor(private prisma: PrismaService) {}
  create(createFeatureFlagDto: CreateFeatureFlagDto) {
    console.log({ createFeatureFlagDto });
    return 'This action adds a new featureFlag';
  }

  findAll() {
    return this.prisma.featureFlag.findMany();
  }

  findOne(id: number) {
    return `This action returns a #${id} featureFlag`;
  }

  update(id: number, updateFeatureFlagDto: UpdateFeatureFlagDto) {
    console.log({ updateFeatureFlagDto });
    return `This action updates a #${id} featureFlag`;
  }

  remove(id: number) {
    return `This action removes a #${id} featureFlag`;
  }
}
