import { IsArray, IsString } from 'class-validator';

export class UpdateUserModulesDto {
  @IsArray({ message: 'modulosPermitidos debe ser un arreglo de rutas de módulos' })
  @IsString({ each: true, message: 'Cada módulo debe ser una cadena de texto válida' })
  modulosPermitidos: string[];
}
