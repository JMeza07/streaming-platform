import { IsUUID, IsOptional, IsString } from 'class-validator';

export class RenewSubscriptionDto {
  @IsUUID()
  subscriptionId: string;

  @IsOptional()
  @IsString()
  metodoPago?: string; // 'yape', 'transferencia', 'tarjeta'

  @IsOptional()
  @IsString()
  comprobanteUrl?: string;
}