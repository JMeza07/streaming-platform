import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateShiftMovementDto {
  @IsNotEmpty({ message: 'El tipo de movimiento es obligatorio' })
  @IsIn(['ENTRADA', 'SALIDA', 'GASTO', 'ANULACION', 'DEVOLUCION', 'VENTA_SISTEMA'], {
    message: 'Tipo de movimiento no válido',
  })
  tipo: string;

  @IsNotEmpty({ message: 'El concepto es obligatorio' })
  @IsString()
  concepto: string;

  @IsNumber({}, { message: 'El monto debe ser numérico' })
  @Min(0.01, { message: 'El monto debe ser mayor a cero' })
  monto: number;

  @IsOptional()
  @IsString()
  metodoPago?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
