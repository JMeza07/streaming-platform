import { IsUUID, IsString, IsIn, IsOptional } from 'class-validator';

export class ResolveTicketDto {
  @IsUUID()
  ticketId: string;

  @IsString()
  @IsIn(['aprobado_reemplazo', 'rechazado'])
  decision: string;

  @IsOptional()
  @IsString()
  motivoRechazo?: string; // Obligatorio si decision es 'rechazado'
}