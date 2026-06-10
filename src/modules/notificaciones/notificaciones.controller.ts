import { Controller, Get, Patch, Param, ParseUUIDPipe, UseInterceptors } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('notificaciones')
@UseInterceptors(AuditInterceptor)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get('usuario/:userId')
  async getByUsuario(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.notificacionesService.getNotificacionesUsuario(userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.notificacionesService.marcarComoLeida(id);
  }
}
