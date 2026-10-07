import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CombosService } from './combos.service';
import { CreateComboDto, UpdateComboDto } from './dto/combo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('combos')
export class CombosController {
  constructor(private readonly combosService: CombosService) {}

  // Consulta pública / de clientes y vendedores
  @Get()
  findAll(@Query('all') all?: string) {
    const onlyActive = all !== 'true';
    return this.combosService.findAll(onlyActive);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.combosService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateComboDto) {
    return this.combosService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateComboDto) {
    return this.combosService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.combosService.remove(id);
  }
}
