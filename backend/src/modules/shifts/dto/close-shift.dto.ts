import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseShiftDto {
  @IsNumber({}, { message: 'El saldo real debe ser un número' })
  @Min(0, { message: 'El saldo real no puede ser negativo' })
  saldoReal: number;

  @IsOptional()
  @IsString()
  novedades?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
