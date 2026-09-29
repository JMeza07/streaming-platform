import { IsUUID, IsString } from 'class-validator';

export class BatchQuarantineDto {
  @IsUUID()
  batchId: string;

  @IsString()
  razon: string;
}