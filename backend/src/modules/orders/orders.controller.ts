import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateSellerSaleDto } from './dto/create-seller-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, OrderStatus } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // REALIZAR VENTA DIRECTA POR VENDEDOR O ADMIN (POS)
  @Post('seller-sale')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  createSellerSale(
    @Body() dto: CreateSellerSaleDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.createSellerSale(dto, user);
  }

  // CREAR ORDEN (Cliente)
  @Post()
  createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  // APROBAR PAGO Y ENTREGAR (Admin y Vendedor)
  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  approveAndDeliver(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { vendedorId?: string; comprobanteUrl?: string },
  ) {
    return this.ordersService.approveAndDeliver(id, user, body?.vendedorId, body?.comprobanteUrl);
  }

  // ADJUNTAR O ACTUALIZAR COMPROBANTE DE PAGO (Admin, Vendedor y Cliente)
  @Patch(':id/receipt')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CLIENTE)
  attachReceipt(
    @Param('id') id: string,
    @Body() body: { comprobanteUrl: string },
    @CurrentUser() user: any,
  ) {
    return this.ordersService.attachReceipt(id, body.comprobanteUrl, user);
  }

  // VERIFICAR COMPROBANTE DE PAGO (Admin, Vendedor, Soporte)
  @Patch(':id/verify-receipt')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE)
  verifyReceipt(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.verifyReceipt(id, user);
  }

  // REEMBOLSAR ORDEN (Solo Admin)
  @Post(':id/refund')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  refundOrder(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { motivo?: string },
  ) {
    return this.ordersService.refundOrder(id, user.userId, body?.motivo);
  }

  // CANCELAR VENTA Y DEVOLVER CUENTAS AL INVENTARIO (Admin y Vendedor)
  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  cancelSale(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { motivo?: string; accountIdsToRestore?: string[] },
  ) {
    return this.ordersService.cancelSale(id, user, body?.motivo, body?.accountIdsToRestore);
  }

  // TODAS LAS RENOVACIONES (Admin, Vendedor, Soporte) — DEBE ir ANTES de :id
  @Get('renewals')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE)
  getRenewals(
    @Query('estado') estado?: OrderStatus,
    @Query('fecha') fecha?: string,
    @Query('search') search?: string,
  ) {
    return this.ordersService.getRenewals({ estado, fecha, search });
  }

  // APROBAR RENOVACIÓN DE SUSCRIPCIÓN (Admin y Vendedor)
  @Post(':id/approve-renewal')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  approveRenewal(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { comprobanteUrl?: string },
  ) {
    return this.ordersService.approveRenewal(id, user, body?.comprobanteUrl);
  }

  // MIS ÓRDENES (Cliente) — DEBE ir ANTES de :id para que NestJS no lo capture como UUID
  @Get('my-orders')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENTE)
  getMyOrders(@CurrentUser() user: any) {
    return this.ordersService.getCustomerOrders(user.customerId);
  }

  // TODAS LAS ÓRDENES (Admin, Vendedor, Soporte, Asesor Comercial)
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE, UserRole.ASESOR_COMERCIAL)
  getAllOrders(
    @CurrentUser() user: any,
    @Query('estado') estado?: OrderStatus,
    @Query('customerId') customerId?: string,
    @Query('fecha') fecha?: string,
    @Query('vendedor') vendedor?: string,
  ) {
    return this.ordersService.getAllOrders({ estado, customerId, fecha, vendedor }, user);
  }

  // DETALLE DE UNA ORDEN — DEBE ir DESPUÉS de rutas literales como my-orders
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.SOPORTE, UserRole.ASESOR_COMERCIAL)
  getOrderById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.getOrderById(id, user);
  }
}