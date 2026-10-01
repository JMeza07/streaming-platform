import { Module, forwardRef } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { OrdersModule } from '../orders/orders.module';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [OrdersModule, forwardRef(() => AccountsModule)],
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}