import { Controller, Get, Post, Body, Param, Query, UseGuards, Patch, Delete } from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { RegisterAffiliateDto } from './dto/register-affiliate.dto';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';
import { ApproveWithdrawalDto } from './dto/approve-withdrawal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('affiliates')
@UseGuards(JwtAuthGuard)
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  // ============================================
  // REGISTRO DE AFILIADOS (Solo Admin)
  // ============================================

  // REGISTRAR AFILIADO (Solo Admin - El VENDEDOR no puede afiliar)
  @Post('register')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  registerAffiliate(@Body() dto: any) {
    if (dto.nombre && dto.email) {
      return this.affiliatesService.createAffiliate(dto);
    }
    return this.affiliatesService.registerAffiliate(dto);
  }

  // ============================================
  // ENDPOINTS DE AFILIADO (Solo afiliados)
  // ============================================

  // MI PERFIL DE AFILIADO / VENDEDOR / ASESOR
  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDEDOR, UserRole.ADMIN, UserRole.ASESOR_COMERCIAL)
  getMyProfile(
    @CurrentUser() user: any,
    @Query('affiliateId') affiliateId?: string,
  ) {
    const targetId = (user.rol === UserRole.ADMIN && affiliateId)
      ? affiliateId
      : (user.affiliateId || user.userId || user.id);
    return this.affiliatesService.getAffiliateProfile(targetId);
  }

  // SOLICITAR RETIRO
  @Post('withdraw')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDEDOR, UserRole.ASESOR_COMERCIAL)
  requestWithdrawal(
    @CurrentUser() user: any,
    @Body() dto: RequestWithdrawalDto,
  ) {
    return this.affiliatesService.requestWithdrawal(user.affiliateId, dto);
  }

  // MIS COMISIONES
  @Get('commissions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDEDOR, UserRole.ASESOR_COMERCIAL)
  getMyCommissions(@CurrentUser() user: any) {
    return this.affiliatesService.getCommissionHistory(user.affiliateId);
  }

  // MIS RETIROS
  @Get('withdrawals')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDEDOR, UserRole.ASESOR_COMERCIAL)
  getMyWithdrawals(@CurrentUser() user: any) {
    return this.affiliatesService.getWithdrawalHistory(user.affiliateId);
  }

  // ============================================
  // ENDPOINTS DE ADMIN Y VENDEDORES (Para selección de afiliados en POS)
  // ============================================

  // LISTAR TODOS LOS AFILIADOS
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  getAllAffiliates() {
    return this.affiliatesService.getAllAffiliates();
  }

  // LISTAR SOLICITUDES DE RETIRO
  @Get('withdrawals/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAllWithdrawals(
    @Query('estado') estado?: string,
    @Query('affiliateId') affiliateId?: string,
  ) {
    return this.affiliatesService.getAllWithdrawals({ estado, affiliateId });
  }

  // APROBAR/RECHAZAR RETIRO
  @Post('withdrawals/resolve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  approveWithdrawal(
    @CurrentUser() user: any,
    @Body() dto: ApproveWithdrawalDto,
  ) {
    return this.affiliatesService.approveWithdrawal(user.userId, dto);
  }

  // ASIGNAR COMISIÓN MANUALMENTE (Para correcciones)
  @Post('commissions/assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  manuallyAssignCommission(
    @Body() body: { affiliateId: string; orderId: string; tipo: 'directa' | 'indirecta' },
  ) {
    return this.affiliatesService.manuallyAssignCommission(
      body.affiliateId,
      body.orderId,
      body.tipo,
    );
  }

  // ESTADÍSTICAS GLOBALES
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAffiliateStats() {
    return this.affiliatesService.getAffiliateStats();
  }

  // DETALLE DE UN AFILIADO (Solo Admin)
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAffiliateById(@Param('id') id: string) {
    return this.affiliatesService.getAffiliateById(id);
  }

  // EDITAR AFILIADO (Solo Admin)
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateAffiliate(
    @Param('id') id: string,
    @Body()
    dto: {
      codigoReferido?: string;
      rango?: string;
      walletBalance?: number;
      referidoPor?: string;
      nombre?: string;
      phone?: string;
    },
  ) {
    return this.affiliatesService.updateAffiliate(id, dto);
  }

  // ELIMINAR AFILIADO (Solo Admin)
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  removeAffiliate(@Param('id') id: string) {
    return this.affiliatesService.removeAffiliate(id);
  }
}