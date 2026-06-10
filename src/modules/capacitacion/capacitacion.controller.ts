import { Controller, Post, Patch, Get, Body, Param, ParseUUIDPipe, UseInterceptors } from '@nestjs/common';
import { CapacitacionService } from './capacitacion.service';
import { CreateCapacitacionDto } from './dto/create-capacitacion.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('capacitaciones')
@UseInterceptors(AuditInterceptor)
export class CapacitacionController {
  constructor(private readonly capacitacionService: CapacitacionService) {}

  @Post()
  async create(@Body() createCapacitacionDto: CreateCapacitacionDto) {
    return this.capacitacionService.createPrograma(createCapacitacionDto);
  }

  @Post('vincular/:capacitacionId/usuario/:userId')
  async vincular(
    @Param('capacitacionId', new ParseUUIDPipe()) capacitacionId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.capacitacionService.vincularTalento(userId, capacitacionId);
  }

  @Patch(':id/usuario/:userId')
  async updateAvance(
    @Param('id', new ParseUUIDPipe()) capacitacionId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body('progress') progress: number,
  ) {
    return this.capacitacionService.registrarAvance(userId, capacitacionId, progress);
  }

  @Get('ruta/:userId')
  async getRuta(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.capacitacionService.getRutaAprendizaje(userId);
  }
}
