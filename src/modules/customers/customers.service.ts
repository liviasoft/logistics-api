import { Injectable, Logger } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { BaseService } from '../../common/base.service';
import { AsyncStorageService } from '../../common/async-storage/async-storage.service';
import { PrismaService } from '../../datasources/prisma/prisma.service';

@Injectable()
export class CustomersService extends BaseService {
  private readonly logger = new Logger(CustomersService.name, {
    timestamp: true,
  });
  constructor(
    private readonly asyncStorageService: AsyncStorageService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async findAccountById(id: string) {
    return this.prisma.clientAppCustomer.findUnique({
      where: { id },
      include: { _count: { select: { clientAppOrder: true } } },
    });
  }

  create(createCustomerDto: CreateCustomerDto) {
    this.logger.log({ createCustomerDto });
    return 'This action adds a new customer';
  }

  findAll() {
    return `This action returns all customer`;
  }

  findOne(id: number) {
    return `This action returns a #${id} customer`;
  }

  update(id: number, updateCustomerDto: UpdateCustomerDto) {
    this.logger.log({ updateCustomerDto });
    return `This action updates a #${id} customer`;
  }

  remove(id: number) {
    return `This action removes a #${id} customer`;
  }
}
