import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'El refreshToken es obligatorio' })
  @IsString({ message: 'El refreshToken debe ser una cadena de texto' })
  refreshToken: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
