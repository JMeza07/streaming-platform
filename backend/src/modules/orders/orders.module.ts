import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AccountsModule } from '../accounts/accounts.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [AccountsModule, WhatsappModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}