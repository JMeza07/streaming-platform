import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.ASESOR_COMERCIAL, UserRole.SOPORTE)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  getMainMetrics(@CurrentUser() user: any) {
    return this.dashboardService.getMainMetrics(user);
  }

  @Get('subscriptions')
  getSubscriptionsByStatus(@CurrentUser() user: any) {
    return this.dashboardService.getSubscriptionsByStatus(user);
  }

  @Get('stock')
  getStockByPlatform() {
    return this.dashboardService.getStockByPlatform();
  }

  @Get('alerts')
  getCriticalAlerts(@CurrentUser() user: any) {
    return this.dashboardService.getCriticalAlerts(user);
  }

  @Get('trend')
  getSalesTrend(@CurrentUser() user: any) {
    return this.dashboardService.getSalesTrend(user);
  }

  @Get('top-platforms')
  getTopPlatforms(@CurrentUser() user: any) {
    return this.dashboardService.getTopPlatforms(user);
  }

  @Get('full')
  getFullDashboard(@CurrentUser() user: any) {
    return this.dashboardService.getFullDashboard(user);
  }
}