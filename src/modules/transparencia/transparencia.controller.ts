import { Controller, Post, Patch, Get, Body, Param, ParseUUIDPipe, UseInterceptors, UseGuards, Request } from '@nestjs/common';
import { TransparenciaService } from './transparencia.service';
import { CreateReclamoDto } from './dto/create-reclamo.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TrustLevel } from '@prisma/client';
import { RolePermissions } from '../../common/permissions/role-permissions';

@Controller('transparencia')
@UseInterceptors(AuditInterceptor)
export class TransparenciaController {
  constructor(
    private readonly transparenciaService: TransparenciaService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.reclamoWrite)
  @Post('reclamos')
  async registrarReclamo(
    @Body() createReclamoDto: Omit<CreateReclamoDto, 'userId'>,
    @GetUser('userId') userId: string
  ) {
    return this.transparenciaService.registrarReclamo({
      ...createReclamoDto,
      userId
    } as CreateReclamoDto);
  }

  @Get('empresas')
  async getEmpresas() {
    return this.prisma.tenant.findMany({
      where: { type: 'MINERA' },
      select: { id: true, name: true }
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.dashboard)
  @Patch('semaforo/:tenantId')
  async actualizarSemaforo(
    @Param('tenantId') tenantId: string,
    @Body() dto: { nivel: TrustLevel; justificacion: string },
    @Request() req
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.transparenciaService.actualizarSemaforo(tenantId, dto.nivel, dto.justificacion, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.dashboard)
  @Get('reclamos')
  async getReclamos() {
    return this.transparenciaService.getReclamos();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.dashboard)
  @Patch('reclamos/:id/estado')
  async resolverReclamo(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('estado') estado: string,
    @Body('respuestaOficial') respuestaOficial?: string,
  ) {
    return this.transparenciaService.actualizarEstadoReclamo(id, estado, respuestaOficial);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.dashboard)
  @Get('estado')
  async getEstado() {
    return this.transparenciaService.getIndicadoresTransparencia();
  }
}
