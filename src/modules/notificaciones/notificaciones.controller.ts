import { Controller, Get, Patch, Param, ParseUUIDPipe, UseInterceptors, UseGuards, Post, Query } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolePermissions } from '../../common/permissions/role-permissions';

@Controller('notificaciones')
@UseInterceptors(AuditInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Roles(...RolePermissions.postulacionRead)
  @Get('usuario/:userId')
  async getByUsuario(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.notificacionesService.getNotificacionesUsuario(userId);
  }

  @Roles(...RolePermissions.postulacionRead)
  @Patch(':id/read')
  async markAsRead(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.notificacionesService.marcarComoLeida(id);
  }

  /** Disparo manual del cron de deadlines (admin/directiva/empresa) */
  @Roles(...RolePermissions.dashboard)
  @Post('procesar-deadlines')
  async procesarDeadlines(@Query('dias') dias?: string) {
    const n = dias ? Number(dias) : 5;
    return this.notificacionesService.procesarAlertasDeadline(Number.isFinite(n) ? n : 5);
  }
}
