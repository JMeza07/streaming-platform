import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email?: string;

  @IsOptional()
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  password?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Rol inválido' })
  rol?: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  activo?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modulosPermitidos?: string[];
}
