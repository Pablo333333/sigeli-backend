import { Controller, Post, Patch, Get, Body, Param, ParseUUIDPipe, UseInterceptors } from '@nestjs/common';
import { TransparenciaService } from './transparencia.service';
import { CreateReclamoDto } from './dto/create-reclamo.dto';
import { UpdateSemaforoDto } from './dto/update-semaforo.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('transparencia')
@UseInterceptors(AuditInterceptor)
export class TransparenciaController {
  constructor(private readonly transparenciaService: TransparenciaService) {}

  @Post('reclamos')
  async registrarReclamo(@Body() createReclamoDto: CreateReclamoDto) {
    return this.transparenciaService.registrarReclamo(createReclamoDto);
  }

  @Patch('semaforo/:tenantId')
  async actualizarSemaforo(
    @Param('tenantId', new ParseUUIDPipe()) tenantId: string,
    @Body() updateSemaforoDto: UpdateSemaforoDto,
  ) {
    return this.transparenciaService.actualizarSemaforo(
      tenantId,
      updateSemaforoDto.nivel,
      updateSemaforoDto.justificacion,
    );
  }

  @Get('reclamos')
  async getReclamos() {
    return this.transparenciaService.getReclamos();
  }

  @Patch('reclamos/:id/estado')
  async resolverReclamo(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('estado') estado: string,
  ) {
    return this.transparenciaService.actualizarEstadoReclamo(id, estado);
  }

  @Get('estado')
  async getEstado() {
    return this.transparenciaService.getIndicadoresTransparencia();
  }
}
