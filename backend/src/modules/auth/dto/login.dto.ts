import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'El correo, WhatsApp o teléfono es obligatorio' })
  @IsString()
  email: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}