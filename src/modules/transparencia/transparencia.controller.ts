import { Controller, Post, Patch, Get, Body, Param, ParseUUIDPipe, UseInterceptors, UseGuards, Query, Request } from '@nestjs/common';
import { TransparenciaService } from './transparencia.service';
import { CreateReclamoDto } from './dto/create-reclamo.dto';
import { UpdateSemaforoDto } from './dto/update-semaforo.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TrustLevel } from '@prisma/client';

@Controller('transparencia')
@UseInterceptors(AuditInterceptor)
export class TransparenciaController {
  constructor(
    private readonly transparenciaService: TransparenciaService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
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

  @Patch('semaforo/:tenantId')
  @UseGuards(JwtAuthGuard)
  async actualizarSemaforo(
    @Param('tenantId') tenantId: string,
    @Body() dto: { nivel: TrustLevel; justificacion: string },
    @Request() req
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.transparenciaService.actualizarSemaforo(tenantId, dto.nivel, dto.justificacion, userId);
  }

  @Get('reclamos')
  async getReclamos() {
    return this.transparenciaService.getReclamos();
  }

  @Patch('reclamos/:id/estado')
  async resolverReclamo(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('estado') estado: string,
    @Body('respuestaOficial') respuestaOficial?: string,
  ) {
    return this.transparenciaService.actualizarEstadoReclamo(id, estado, respuestaOficial);
  }

  @Get('estado')
  async getEstado() {
    return this.transparenciaService.getIndicadoresTransparencia();
  }
}
