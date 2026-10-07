import { IsString, IsNumber, IsOptional, IsBoolean, IsUUID, Min } from 'class-validator';

export class CreatePlanDto {
  @IsUUID()
  serviceId: string;

  @IsString()
  nombrePlan: string;

  @IsNumber()
  @Min(0)
  precio: number;

  @IsOptional()
  @IsString()
  resolucion?: string;

  @IsOptional()
  @IsNumber()
  pantallasSimultaneas?: number;

  @IsOptional()
  @IsNumber()
  duracionDias?: number;

  @IsOptional()
  @IsNumber()
  garantiaDias?: number;

  @IsOptional()
  @IsBoolean()
  usaPin?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}