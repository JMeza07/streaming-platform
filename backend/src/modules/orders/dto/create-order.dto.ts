import { IsArray, ValidateNested, IsUUID, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsUUID()
  planId: string;

  @IsInt()
  cantidad: number;
}

export class CreateOrderDto {
  @IsUUID()
  customerId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  metodoPago?: string; // 'yape', 'transferencia', 'tarjeta'

  @IsOptional()
  @IsString()
  comprobanteUrl?: string; // URL de la captura de pago manual

  @IsOptional()
  @IsString()
  codigoReferido?: string;

  @IsOptional()
  @IsString()
  vendedorId?: string;

  @IsOptional()
  @IsString()
  descripcionVenta?: string;

  @IsOptional()
  @IsString()
  clase?: string; // NUEVA, RENOVACION, GARANTIA

  @IsOptional()
  @IsString()
  banco?: string; // Banco o pasarela (Nequi, Bancolombia, Daviplata, etc.)

  @IsOptional()
  @IsString()
  aut?: string; // Código de autorización / comprobante
}