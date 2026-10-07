import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  usaPin?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}