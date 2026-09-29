import { IsString, IsOptional, IsUUID } from 'class-validator';

export class RegisterAffiliateDto {
  @IsUUID()
  userId: string;

  @IsString()
  codigoReferido: string; // Ej: JUAN2024

  @IsOptional()
  @IsString()
  codigoReferidor?: string; // Código del afiliado que lo invitó (Nivel 2)
}