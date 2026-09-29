import { IsUUID, IsString, IsIn, IsOptional } from 'class-validator';

export class ApproveWithdrawalDto {
  @IsUUID()
  withdrawalId: string;

  @IsString()
  @IsIn(['pagado', 'rechazado'])
  decision: string;

  @IsOptional()
  @IsString()
  motivoRechazo?: string;
}