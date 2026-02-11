import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('investments/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentUser() user: any,
  ) {
    return this.transactionsService.create(createTransactionDto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.transactionsService.findAll(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.transactionsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @CurrentUser() user: any,
  ) {
    return this.transactionsService.update(id, updateTransactionDto, user.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.transactionsService.remove(id, user.id);
  }
}