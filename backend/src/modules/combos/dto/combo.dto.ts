import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ComboItemDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  cantidad?: number = 1;
}

export class CreateComboDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @Min(0)
  precioCombo: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  items: ComboItemDto[];
}

export class UpdateComboDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  precioCombo?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  @IsOptional()
  items?: ComboItemDto[];

  @IsOptional()
  activo?: boolean;
}
