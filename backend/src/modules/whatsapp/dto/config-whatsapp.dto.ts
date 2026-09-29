import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class ConfigWhatsappDto {
  @IsOptional()
  id?: string;

  @IsOptional()
  updatedAt?: any;

  @IsOptional()
  createdAt?: any;

  @IsOptional()
  @IsString()
  nombreConfig?: string;

  @IsOptional()
  @IsString()
  nombreRemitente?: string;

  @IsOptional()
  @IsString()
  numeroWhatsapp?: string;

  @IsOptional()
  @IsString()
  zonaHoraria?: string;

  @IsOptional()
  @IsString()
  horaInicio?: string;

  @IsOptional()
  @IsString()
  horaFin?: string;

  @IsOptional()
  @IsBoolean()
  notificacionesActivas?: boolean;

  @IsOptional()
  @IsString()
  plantillaEntrega?: string;

  @IsOptional()
  @IsString()
  plantillaRecordatorio7d?: string;

  @IsOptional()
  @IsString()
  plantillaRecordatorio1d?: string;

  @IsOptional()
  @IsString()
  plantillaRecuperacion3d?: string;
}