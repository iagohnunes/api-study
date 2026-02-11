import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('investments/assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  create(
    @Body() createAssetDto: CreateAssetDto,
    @CurrentUser() user: any,
  ) {
    return this.assetsService.create(createAssetDto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.assetsService.findAll(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.assetsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAssetDto: UpdateAssetDto,
    @CurrentUser() user: any,
  ) {
    return this.assetsService.update(id, updateAssetDto, user.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.assetsService.remove(id, user.id);
  }
}