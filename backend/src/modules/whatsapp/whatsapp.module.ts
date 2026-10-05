import { Global, Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { ChatbotService } from './chatbot.service';

@Global()
@Module({
  controllers: [WhatsappController],
  providers: [WhatsappService, ChatbotService],
  exports: [WhatsappService, ChatbotService],
})
export class WhatsappModule {}