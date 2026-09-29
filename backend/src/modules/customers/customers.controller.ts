import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // 1. LISTAR CLIENTES CON FILTROS Y RESUMEN (Admin, Vendedor y Asesor Comercial)
  @Get()
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.ASESOR_COMERCIAL)
  findAll(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('plataforma') plataforma?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('hasOrders') hasOrders?: string
  ) {
    return this.customersService.findAll({
      search,
      status,
      plataforma,
      startDate,
      endDate,
      hasOrders,
    }, user);
  }

  // 2. PERFIL 360° DE UN CLIENTE (Admin, Vendedor y Asesor Comercial)
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.ASESOR_COMERCIAL)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.customersService.findOne(id, user);
  }

  // 3. EDITAR INFORMACIÓN DE CONTACTO Y CONTRASEÑA
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: any,
  ) {
    return this.customersService.update(id, dto, user);
  }

  // 4. SUSPENDER / REACTIVAR ACCESO DEL CLIENTE (Solo Admin)
  @Patch(':id/toggle-active')
  @Roles(UserRole.ADMIN)
  toggleActive(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.customersService.toggleActive(id, user?.userId);
  }

  // 5. ELIMINAR CLIENTE (Solo Admin)
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  deleteCustomer(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.customersService.deleteCustomer(id, user?.userId);
  }
}
