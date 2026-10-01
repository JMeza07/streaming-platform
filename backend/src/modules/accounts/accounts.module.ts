import { Module, forwardRef } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { ImapService } from './imap.service';
import { WarrantyModule } from '../warranty/warranty.module';

@Module({
  imports: [forwardRef(() => WarrantyModule)],
  controllers: [AccountsController, ProvidersController],
  providers: [AccountsService, ProvidersService, ImapService],
  exports: [AccountsService, ProvidersService, ImapService],
})
export class AccountsModule {}