import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // REPORTES FINANCIEROS (Días, Meses, Años) - Solo Admin
  @Get('financial')
  @Roles(UserRole.ADMIN)
  getFinancial() {
    return this.reportsService.getFinancialReports();
  }

  // DIRECTORIO DE CLIENTES POR PLATAFORMA Y FECHA - Solo Admin
  @Get('customers')
  @Roles(UserRole.ADMIN)
  getCustomers(
    @Query('platformId') platformId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('search') search?: string,
  ) {
    return this.reportsService.getCustomersReport({
      platformId,
      fechaDesde,
      fechaHasta,
      search,
    });
  }
}
