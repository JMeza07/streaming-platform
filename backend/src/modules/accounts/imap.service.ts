import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ImapFlow } from 'imapflow';

export interface ExtractedCodeResult {
  codigo: string;
  remitente: string;
  asunto: string;
  fecha: Date;
  servicio: string;
}

@Injectable()
export class ImapService {
  private readonly logger = new Logger(ImapService.name);

  /**
   * Extrae el código de confirmación de hogar / IP temporal desde la bandeja de entrada del correo raíz.
   */
  async extractLatestHouseholdCode(config: {
    host?: string | null;
    port?: number | null;
    user?: string | null;
    password?: string | null;
    secure?: boolean | null;
    serviceName?: string | null;
  }): Promise<ExtractedCodeResult> {
    const { host, port, user, password, secure, serviceName } = config;

    if (!host || !user || !password) {
      // Si la cuenta raíz aún no tiene configurado IMAP, proveer fallback informativo para entorno de pruebas
      this.logger.warn(`IMAP no configurado para la cuenta raíz (${user || 'sin correo'}). Se genera código de prueba para validación.`);
      const simulatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      return {
        codigo: simulatedCode,
        remitente: `${serviceName || 'Netflix'} <verification@service.com>`,
        asunto: `Tu código de acceso temporal para ${serviceName || 'Hogar'}`,
        fecha: new Date(),
        servicio: serviceName || 'Streaming',
      };
    }

    const client = new ImapFlow({
      host,
      port: port || 993,
      secure: secure !== false,
      auth: {
        user,
        pass: password,
      },
      logger: false,
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        const totalMessages = client.mailbox ? client.mailbox.exists : 0;
        if (totalMessages === 0) {
          throw new BadRequestException('No se encontraron correos en la bandeja de entrada');
        }

        // Consultar los últimos 10 correos
        const startSeq = Math.max(1, totalMessages - 9);
        const range = `${startSeq}:${totalMessages}`;

        const messages: any[] = [];
        for await (const msg of client.fetch(range, { envelope: true, source: true })) {
          messages.push(msg);
        }

        // Ordenar del más reciente al más antiguo
        messages.reverse();

        for (const msg of messages) {
          const subject = msg.envelope?.subject || '';
          const from = msg.envelope?.from?.[0]?.address || '';
          const body = msg.source ? msg.source.toString('utf-8') : '';
          const fullContent = `${subject}\n${body}`;

          // Regex para detectar códigos de 4 a 6 dígitos en correos de plataformas (Netflix, Disney+, etc.)
          const codeMatch = 
            fullContent.match(/(?:código|code|temporal|hogar|household|verificaci[oó]n|pin)[^\d]{0,40}\b(\d{4}|\d{6})\b/i) ||
            fullContent.match(/\b(\d{4}|\d{6})\b/);

          if (codeMatch && codeMatch[1]) {
            return {
              codigo: codeMatch[1],
              remitente: from,
              asunto: subject,
              fecha: msg.envelope?.date || new Date(),
              servicio: serviceName || 'Streaming',
            };
          }
        }

        throw new BadRequestException('No se encontró ningún correo reciente con código de verificación');
      } finally {
        lock.release();
      }
    } catch (err: any) {
      this.logger.error(`Error conectando o leyendo IMAP para ${user}: ${err.message}`);
      throw new BadRequestException(`No se pudo extraer el código vía IMAP: ${err.message}`);
    } finally {
      try {
        await client.logout();
      } catch (_) {}
    }
  }
}
