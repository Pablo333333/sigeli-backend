import { IsString, IsUUID, IsEnum } from 'class-validator';

export enum TipoNotificacion {
  OFERTA = 'OFERTA',
  VENCIMIENTO = 'VENCIMIENTO',
  GENERAL = 'GENERAL',
}

export class NotificacionDto {
  @IsUUID()
  usuarioId: string;

  @IsString()
  mensaje: string;

  @IsEnum(TipoNotificacion)
  tipo: TipoNotificacion;
}
