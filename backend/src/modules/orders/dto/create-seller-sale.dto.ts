import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateSellerSaleDto {
  // Cliente existente (opcional si se proporcionan datos de nuevo cliente)
  @IsOptional()
  @IsUUID()
  customerId?: string;

  // Datos para registrar cliente sobre la marcha
  @IsOptional()
  @IsString()
  clienteNombre?: string;

  @IsOptional()
  @IsString()
  clienteEmail?: string;

  @IsOptional()
  @IsString()
  clienteWhatsapp?: string;

  // Plan a vender
  @IsNotEmpty({ message: 'El planId es obligatorio' })
  @IsUUID()
  planId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;

  // Información de pago
  @IsNotEmpty({ message: 'El método de pago es obligatorio' })
  @IsString()
  metodoPago: string;

  @IsOptional()
  @IsString()
  referenciaExterna?: string;

  @IsOptional()
  @IsString()
  notas?: string;

  // Despacho inmediato automático
  @IsOptional()
  @IsBoolean()
  despachoInmediato?: boolean;

  // Comprobante de pago (obligatorio en ventas con medios electrónicos)
  @IsOptional()
  @IsString()
  comprobanteUrl?: string;

  // Asesor Comercial o Afiliado asignado (Opcional)
  @IsOptional()
  @IsString()
  afiliadoId?: string;
}
