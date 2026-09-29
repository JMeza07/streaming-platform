import { IsOptional, IsString, IsDateString } from 'class-validator';

export class DashboardMetricsDto {
  @IsOptional()
  @IsDateString()
  fechaInicio?: string; // Para filtrar por rango de fechas

  @IsOptional()
  @IsDateString()
  fechaFin?: string;
}