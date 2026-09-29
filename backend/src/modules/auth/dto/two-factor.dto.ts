import { IsNotEmpty, IsString, Length, IsBoolean, IsOptional } from 'class-validator';

export class VerifyTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'El código 2FA debe tener exactamente 6 dígitos' })
  code: string;
}

export class SetupConfirmTwoFactorDto {
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @IsString()
  @IsNotEmpty()
  secret: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'El código 2FA debe tener exactamente 6 dígitos' })
  code: string;
}

export class ToggleTwoFactorDto {
  @IsBoolean()
  enable: boolean;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  secret?: string;
}
