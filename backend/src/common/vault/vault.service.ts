import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * Servicio de cifrado de credenciales (SRS RNF-S02 / 2.3).
 *
 * Estrategia:
 *  1. Si VAULT_ENABLED=true -> HashiCorp Vault Transit (AES-256-GCM, prefijo `vault:v1:`).
 *  2. Si Vault está deshabilitado o no responde -> AES-256-GCM local con ENCRYPTION_KEY (prefijo `enc:v1:`).
 *  3. NUNCA se persiste texto plano: si no hay ningún mecanismo disponible se lanza error.
 *
 * El descifrado soporta ambos formatos y devuelve tal cual los valores legados en texto plano
 * (para poder migrarlos progresivamente con `prisma/encrypt-existing.ts`).
 */
@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);
  private readonly client: ReturnType<typeof axios.create> | null;
  private readonly keyName: string;
  private readonly enabled: boolean;
  private readonly localKey: Buffer | null;

  static readonly VAULT_PREFIX = 'vault:v1:';
  static readonly LOCAL_PREFIX = 'enc:v1:';

  constructor() {
    const vaultAddr = process.env.VAULT_ADDR || 'http://localhost:8200';
    const vaultToken = process.env.VAULT_TOKEN;
    this.keyName = process.env.VAULT_KEY_NAME || 'streaming-inventory';
    this.enabled = process.env.VAULT_ENABLED === 'true' && !!vaultToken;

    this.client = this.enabled
      ? axios.create({
          baseURL: `${vaultAddr}/v1`,
          headers: { 'X-Vault-Token': vaultToken as string, 'Content-Type': 'application/json' },
          timeout: 3000,
        })
      : null;

    const rawKey = process.env.ENCRYPTION_KEY;
    if (rawKey && rawKey.trim().length >= 32) {
      // Derivación determinista a 32 bytes (AES-256)
      this.localKey = createHash('sha256').update(rawKey.trim()).digest();
    } else {
      this.localKey = null;
    }

    if (this.enabled) {
      this.logger.log(`🔒 Vault Transit KMS activo (clave: ${this.keyName}). Fallback local: ${this.localKey ? 'sí' : 'no'}`);
    } else if (this.localKey) {
      this.logger.log('🔒 Cifrado local AES-256-GCM activo (Vault deshabilitado).');
    } else {
      this.logger.error(
        '❌ No hay mecanismo de cifrado: define ENCRYPTION_KEY (mín. 32 caracteres) o habilita Vault. ' +
          'Las escrituras de credenciales serán rechazadas.',
      );
    }
  }

  isEncrypted(value: unknown): boolean {
    return (
      typeof value === 'string' &&
      (value.startsWith(VaultService.VAULT_PREFIX) || value.startsWith(VaultService.LOCAL_PREFIX))
    );
  }

  async encrypt(plaintext: string): Promise<string> {
    if (!plaintext || typeof plaintext !== 'string') return plaintext;
    if (this.isEncrypted(plaintext)) return plaintext;

    if (this.enabled && this.client) {
      try {
        const response = await this.client.post(`/transit/encrypt/${this.keyName}`, {
          plaintext: Buffer.from(plaintext, 'utf-8').toString('base64'),
        });
        const ciphertext = (response.data as any)?.data?.ciphertext;
        if (ciphertext) return ciphertext;
      } catch (error: any) {
        this.logger.warn(`Vault no disponible (${error.message}). Usando cifrado local.`);
      }
    }

    return this.encryptLocal(plaintext);
  }

  async decrypt(ciphertext: string): Promise<string> {
    if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;

    if (ciphertext.startsWith(VaultService.LOCAL_PREFIX)) {
      return this.decryptLocal(ciphertext);
    }

    if (ciphertext.startsWith(VaultService.VAULT_PREFIX)) {
      if (!this.client) {
        this.logger.error('Valor cifrado con Vault pero Vault está deshabilitado.');
        return '********';
      }
      try {
        const response = await this.client.post(`/transit/decrypt/${this.keyName}`, { ciphertext });
        const b64 = (response.data as any)?.data?.plaintext;
        return Buffer.from(b64, 'base64').toString('utf-8');
      } catch (error: any) {
        this.logger.error(`Vault no disponible para descifrar (${error.message}).`);
        return '********';
      }
    }

    // Valor legado en texto plano
    return ciphertext;
  }

  // ---------- AES-256-GCM local ----------
  private encryptLocal(plaintext: string): string {
    if (!this.localKey) {
      throw new Error(
        'Cifrado no disponible: configure ENCRYPTION_KEY o Vault. Se rechaza guardar credenciales en texto plano.',
      );
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.localKey, iv);
    const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${VaultService.LOCAL_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`;
  }

  private decryptLocal(value: string): string {
    if (!this.localKey) {
      this.logger.error('Valor cifrado localmente pero ENCRYPTION_KEY no está configurada.');
      return '********';
    }
    try {
      const [ivB64, tagB64, dataB64] = value.slice(VaultService.LOCAL_PREFIX.length).split(':');
      const decipher = createDecipheriv('aes-256-gcm', this.localKey, Buffer.from(ivB64, 'base64'));
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
    } catch (err: any) {
      this.logger.error(`Error descifrando valor local: ${err.message}`);
      return '********';
    }
  }
}
