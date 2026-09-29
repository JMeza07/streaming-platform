import { IsString, IsUUID, IsOptional } from 'class-validator';

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
}