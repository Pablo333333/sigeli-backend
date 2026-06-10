import { Controller, Post, Body, Get, Param, ParseUUIDPipe, UseInterceptors } from '@nestjs/common';
import { EvaluacionService } from './evaluacion.service';
import { CreateEvaluacionDto } from './dto/create-evaluacion.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('evaluaciones')
@UseInterceptors(AuditInterceptor)
export class EvaluacionController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  @Post()
  async create(@Body() createEvaluacionDto: CreateEvaluacionDto) {
    return this.evaluacionService.registrarEvaluacion(createEvaluacionDto);
  }

  @Get('usuario/:userId')
  async findByUsuario(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.evaluacionService.findByEvaluado(userId);
  }
}
