import { IsArray, ValidateNested, IsUUID, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class AccountImportItem {
  @IsString()
  emailCuenta: string;

  @IsString()
  passwordCuenta: string;

  @IsOptional()
  @IsString()
  perfilAsignado?: string;

  @IsOptional()
  @IsString()
  pinPerfil?: string;
}

export class ImportAccountsDto {
  @IsUUID()
  planId: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountImportItem)
  accounts: AccountImportItem[];
}