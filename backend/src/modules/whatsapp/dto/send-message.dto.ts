import { IsString, IsOptional, IsObject } from 'class-validator';

export class SendMessageDto {
  @IsString()
  numero: string; // Formato: 51999888777 (sin + ni espacios)

  @IsString()
  mensaje: string;

  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @IsOptional()
  @IsObject()
  botones?: {
    texto: string;
    id: string;
  }[];
}