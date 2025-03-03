import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomersService } from './customers.service';

@Injectable()
export class CustomersInterceptor implements NestInterceptor {
  constructor(private readonly customersService: CustomersService) {}
  async intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const customerId = req.params?.customerId;

    if (customerId) {
      const customer = await this.customersService.findAccountById(customerId);
      if (!customer) {
        throw new NotFoundException(`Customer not found`);
      }
      res.locals.customer = customer;
    }
    return next.handle();
  }
}
