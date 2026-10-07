import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RenewRootAccountDto {
  @IsInt({ message: 'Los días extendidos deben ser un número entero' })
  @Min(1, { message: 'Debe renovar por al menos 1 día' })
  diasExtendidos: number;

  @IsNotEmpty({ message: 'El costo de renovación es obligatorio' })
  @IsNumber({}, { message: 'El costo de renovación debe ser un número' })
  @Min(0, { message: 'El costo de renovación no puede ser negativo' })
  costoRenovacion: number;

  @IsOptional()
  @IsString()
  notas?: string;
}
