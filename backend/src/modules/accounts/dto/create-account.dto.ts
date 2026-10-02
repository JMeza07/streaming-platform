import { IsString, IsUUID, IsOptional, IsNumber } from 'class-validator';

export class CreateAccountDto {
  @IsUUID()
  planId: string;

  @IsString()
  emailCuenta: string;

  @IsString()
  passwordCuenta: string;

  @IsOptional()
  @IsString()
  perfilAsignado?: string;

  @IsOptional()
  @IsString()
  pinPerfil?: string;

  @IsOptional()
  @IsUUID()
  batchId?: string; // Para vincular al lote del proveedor

  @IsOptional()
  @IsUUID()
  providerId?: string; // Proveedor directo

  @IsOptional()
  @IsNumber()
  costoCompra?: number; // Costo individual de compra
}