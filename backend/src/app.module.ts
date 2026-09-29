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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
})
export class AppModule {}