import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AddToCemeteryDto {
  @IsEmail({}, { message: 'El correo debe ser un email válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  email: string;

  @IsOptional()
  @IsString()
  plataforma?: string;

  @IsNotEmpty({ message: 'El motivo de baja es obligatorio' })
  @IsString()
  motivoBaja: string;

  @IsOptional()
  @IsString()
  estadoCuenta?: string; // COMPROMETIDA, CAIDA_PROVEEDOR, VENCIDA_NO_RENOVAR, FRAUDE

  @IsOptional()
  @IsUUID()
  rootAccountId?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;
}
