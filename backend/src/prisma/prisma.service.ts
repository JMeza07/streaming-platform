import { Injectable, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { VaultService } from '../common/vault/vault.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Optional() private readonly vaultService?: VaultService) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Conectado a PostgreSQL');

    if (this.vaultService) {
      this.setupVaultEncryptionMiddleware();
    }
  }

  private setupVaultEncryptionMiddleware() {
    this.$use(async (params, next) => {
      // Intercept Account model operations (Streaming Inventory Credentials)
      if (params.model === 'Account' && this.vaultService) {
        // 1. Encrypt sensitive fields on write operations
        if (['create', 'update'].includes(params.action) && params.args?.data) {
          if (params.args.data.passwordCuenta) {
            params.args.data.passwordCuenta = await this.vaultService.encrypt(params.args.data.passwordCuenta);
          }
          if (params.args.data.pinPerfil) {
            params.args.data.pinPerfil = await this.vaultService.encrypt(params.args.data.pinPerfil);
          }
        } else if (params.action === 'upsert') {
          if (params.args?.create?.passwordCuenta) {
            params.args.create.passwordCuenta = await this.vaultService.encrypt(params.args.create.passwordCuenta);
          }
          if (params.args?.create?.pinPerfil) {
            params.args.create.pinPerfil = await this.vaultService.encrypt(params.args.create.pinPerfil);
          }
          if (params.args?.update?.passwordCuenta) {
            params.args.update.passwordCuenta = await this.vaultService.encrypt(params.args.update.passwordCuenta);
          }
          if (params.args?.update?.pinPerfil) {
            params.args.update.pinPerfil = await this.vaultService.encrypt(params.args.update.pinPerfil);
          }
        }

        const result = await next(params);

        // 2. Decrypt sensitive fields on read operations
        if (result) {
          if (Array.isArray(result)) {
            for (const item of result) {
              await this.decryptAccount(item);
            }
          } else {
            await this.decryptAccount(result);
          }
        }

        return result;
      }

      return next(params);
    });
  }

  private async decryptAccount(account: any) {
    if (!account || !this.vaultService) return;
    if (account.passwordCuenta && typeof account.passwordCuenta === 'string' && account.passwordCuenta.startsWith('vault:v1:')) {
      account.passwordCuenta = await this.vaultService.decrypt(account.passwordCuenta);
    }
    if (account.pinPerfil && typeof account.pinPerfil === 'string' && account.pinPerfil.startsWith('vault:v1:')) {
      account.pinPerfil = await this.vaultService.decrypt(account.pinPerfil);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}