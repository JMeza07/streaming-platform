import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @IsString()
  @MinLength(4, { message: 'La contraseña debe tener al menos 4 caracteres' })
  password: string;

  @IsNotEmpty({ message: 'El WhatsApp o teléfono es obligatorio' })
  @IsString()
  whatsapp: string;

  @IsOptional()
  @IsString()
  pais?: string;
}