import { Controller, Post, Get, Body, Query, UseInterceptors, ParseIntPipe } from '@nestjs/common';
import { ContratoService } from './contrato.service';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('contratos')
@UseInterceptors(AuditInterceptor)
export class ContratoController {
  constructor(private readonly contratoService: ContratoService) {}

  @Post()
  async create(@Body() createContratoDto: CreateContratoDto) {
    return this.contratoService.createContrato(createContratoDto);
  }

  @Get('alertas')
  async getAlertas(@Query('dias', new ParseIntPipe({ optional: true })) dias: number = 30) {
    return this.contratoService.getContratosProximosAVencer(dias);
  }
}
