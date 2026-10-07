import { Injectable, OnModuleInit, OnModuleDestroy, Optional, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { VaultService } from '../common/vault/vault.service';

/**
 * Campos sensibles cifrados en reposo (SRS RNF-S02 / RNF-S03).
 * - Account.passwordCuenta / pinPerfil / assignedPin
 * - RootAccount.password / imapPassword
 * - PasswordChange.claveAnterior / claveNueva
 * - SupportTicket.claveReportada / claveAlMomento / claveNuevaEntregada
 */
const SENSITIVE_FIELDS = new Set([
  'passwordCuenta',
  'pinPerfil',
  'assignedPin',
  'password',
  'imapPassword',
  'claveAnterior',
  'claveNueva',
  'claveReportada',
  'claveAlMomento',
  'claveNuevaEntregada',
]);
const ENCRYPTED_MODELS = new Set(['Account', 'RootAccount', 'PasswordChange', 'SupportTicket']);
const WRITE_ACTIONS = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(@Optional() private readonly vaultService?: VaultService) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Conectado a PostgreSQL');

    if (this.vaultService) {
      this.setupEncryptionMiddleware();
    }
  }

  private setupEncryptionMiddleware() {
    this.$use(async (params, next) => {
      // 1. Cifrar en escrituras (incluye escrituras anidadas desde otros modelos, p. ej. rootAccount.create({ accounts: { create: [...] } }))
      if (WRITE_ACTIONS.has(params.action) && params.args) {
        const isTarget = ENCRYPTED_MODELS.has(params.model || '');
        for (const key of ['data', 'create', 'update']) {
          if (params.args[key] !== undefined) {
            await this.encryptDeep(params.args[key], isTarget);
          }
        }
      }

      const result = await next(params);

      // 2. Descifrar en lecturas (incluye relaciones incluidas: subscription.account, root.accounts, etc.)
      if (result && typeof result === 'object') {
        await this.decryptDeep(result, 0);
      }
      return result;
    });
  }

  /**
   * Recorre el payload de escritura cifrando los campos sensibles.
   * `password` solo se cifra cuando el contexto es un modelo cifrado (evita afectar otros modelos).
   */
  private async encryptDeep(node: any, inEncryptedModel: boolean, depth = 0): Promise<void> {
    if (!node || typeof node !== 'object' || depth > 6 || node instanceof Date) return;

    if (Array.isArray(node)) {
      for (const item of node) await this.encryptDeep(item, inEncryptedModel, depth + 1);
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (SENSITIVE_FIELDS.has(key) && (key !== 'password' || inEncryptedModel)) {
        if (typeof value === 'string' && value.length > 0) {
          node[key] = await this.vaultService!.encrypt(value);
        } else if (value && typeof value === 'object' && typeof (value as any).set === 'string') {
          (value as any).set = await this.vaultService!.encrypt((value as any).set);
        }
        continue;
      }

      if (value && typeof value === 'object') {
        // Relaciones anidadas hacia modelos cifrados
        const nestedIsEncrypted = key === 'accounts' || key === 'account' || key === 'rootAccount' || key === 'rootAccounts'
          ? true
          : inEncryptedModel && ['create', 'update', 'data', 'upsert', 'createMany', 'connectOrCreate'].includes(key);
        await this.encryptDeep(value, nestedIsEncrypted, depth + 1);
      }
    }
  }

  /** Descifra cualquier valor con prefijo de cifrado en el árbol de resultados. */
  private async decryptDeep(node: any, depth: number): Promise<void> {
    if (!node || typeof node !== 'object' || depth > 8 || node instanceof Date) return;

    if (Array.isArray(node)) {
      for (const item of node) await this.decryptDeep(item, depth + 1);
      return;
    }

    // Evitar recorrer Decimal / Buffer
    const proto = Object.getPrototypeOf(node);
    if (proto && proto !== Object.prototype && proto !== null) return;

    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string') {
        if (SENSITIVE_FIELDS.has(key) && this.vaultService!.isEncrypted(value)) {
          node[key] = await this.vaultService!.decrypt(value);
        }
      } else if (value && typeof value === 'object') {
        await this.decryptDeep(value, depth + 1);
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}