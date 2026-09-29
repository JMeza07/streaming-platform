import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsString()
  whatsapp: string; // Se guardará en la tabla User (phone) y Customer (whatsapp)

  @IsOptional()
  @IsString()
  pais?: string;
}