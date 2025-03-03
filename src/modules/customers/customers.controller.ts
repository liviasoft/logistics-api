import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersInterceptor } from './customers.interceptor';

@Controller({ path: 'customers', version: '1' })
@UseInterceptors(CustomersInterceptor)
export class CustomersController {
  constructor(private readonly customerService: CustomersService) {}

  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customerService.create(createCustomerDto);
  }

  @Get()
  findAll() {
    return this.customerService.findAll();
  }

  @Get(':customerId')
  findOne(@Param('customerId') id: string) {
    return this.customerService.findOne(+id);
  }

  @Patch(':customerId')
  update(
    @Param('customerId') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customerService.update(+id, updateCustomerDto);
  }

  @Delete(':customerId')
  remove(@Param('customerId') id: string) {
    return this.customerService.remove(+id);
  }
}
