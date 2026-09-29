import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { VaultModule } from './common/vault/vault.module';
import { AuthModule } from './modules/auth/auth.module';
import { ServicesModule } from './modules/services/services.module';
import { PlansModule } from './modules/plans/plans.module'; // ← AÑADIDO
import { AccountsModule } from './modules/accounts/accounts.module';
import { OrdersModule } from './modules/orders/orders.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { DashboardModule } from './modules/dashboard/dashboard.module'; // ← AÑADIDO
import { PortalModule } from './modules/portal/portal.module';
import { WarrantyModule } from './modules/warranty/warranty.module';
import { AffiliatesModule } from './modules/affiliates/affiliates.module';

import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UsersModule } from './modules/users/users.module';
import { SettingsModule } from './modules/settings/settings.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AuditModule } from './modules/audit/audit.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate Limiting Global: 100 peticiones por minuto por IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    VaultModule,
    AuditModule,
    WhatsappModule,
    AuthModule,
    ServicesModule,
    PlansModule,
    AccountsModule,
    OrdersModule,
    DashboardModule,
    PortalModule,
    WarrantyModule,
    AffiliatesModule,
    SubscriptionsModule,
    ReportsModule,
    UsersModule,
    SettingsModule,
    CustomersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}