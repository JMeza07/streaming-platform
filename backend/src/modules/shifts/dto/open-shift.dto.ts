import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenShiftDto {
  @IsNumber({}, { message: 'La base inicial debe ser un valor numérico' })
  @Min(0, { message: 'La base inicial no puede ser negativa' })
  baseInicial: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
