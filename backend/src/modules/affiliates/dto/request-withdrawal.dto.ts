import { IsNumber, IsString, Min } from 'class-validator';

export class RequestWithdrawalDto {
  @IsNumber()
  @Min(20, { message: 'El monto mínimo de retiro es $20' })
  monto: number;

  @IsString()
  metodoPago: string; // 'yape', 'banco', 'paypal', etc.

  @IsString()
  datosPago: string; // JSON con número de cuenta, nombre, etc.
}