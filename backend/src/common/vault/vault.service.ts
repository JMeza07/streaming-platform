import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);
  private readonly client: ReturnType<typeof axios.create>;
  private readonly keyName: string;
  private readonly enabled: boolean;

  constructor() {
    const vaultAddr = process.env.VAULT_ADDR || 'http://localhost:8200';
    const vaultToken = process.env.VAULT_TOKEN || 'root_token_streamcontrol_2025';
    this.keyName = process.env.VAULT_KEY_NAME || 'streaming-inventory';
    this.enabled = process.env.VAULT_ENABLED !== 'false';

    this.client = axios.create({
      baseURL: `${vaultAddr}/v1`,
      headers: {
        'X-Vault-Token': vaultToken,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });

    if (this.enabled) {
      this.logger.log(`🔒 Vault Transit KMS Client initialized with key: ${this.keyName}`);
    } else {
      this.logger.warn(`⚠️ Vault Transit KMS is disabled via VAULT_ENABLED=false`);
    }
  }

  /**
   * Encrypts plaintext string using Vault Transit Engine (AES-256-GCM)
   * Returns ciphertext string formatted as 'vault:v1:...'
   */
  async encrypt(plaintext: string): Promise<string> {
    if (!this.enabled || !plaintext) return plaintext;
    if (plaintext.startsWith('vault:v1:')) return plaintext; // Already encrypted

    try {
      const base64Plaintext = Buffer.from(plaintext, 'utf-8').toString('base64');
      const response = await this.client.post(`/transit/encrypt/${this.keyName}`, {
        plaintext: base64Plaintext,
      });

      const resData = response.data as any;
      return resData?.data?.ciphertext;
    } catch (error: any) {
      this.logger.error(`Failed to encrypt data with Vault: ${error.message}`);
      throw new Error(`Vault KMS encryption failure: ${error.message}`);
    }
  }

  /**
   * Decrypts ciphertext string formatted as 'vault:v1:...' using Vault Transit Engine
   * Returns original plaintext UTF-8 string
   */
  async decrypt(ciphertext: string): Promise<string> {
    if (!this.enabled || !ciphertext) return ciphertext;
    if (!ciphertext.startsWith('vault:v1:')) return ciphertext; // Not a Vault ciphertext

    try {
      const response = await this.client.post(`/transit/decrypt/${this.keyName}`, {
        ciphertext,
      });

      const resData = response.data as any;
      const base64Plaintext = resData?.data?.plaintext;
      return Buffer.from(base64Plaintext, 'base64').toString('utf-8');
    } catch (error: any) {
      this.logger.error(`Failed to decrypt data with Vault: ${error.message}`);
      // Return placeholder or bubble up error
      return '[CIPHERTEXT_DECRYPTION_ERROR]';
    }
  }
}
