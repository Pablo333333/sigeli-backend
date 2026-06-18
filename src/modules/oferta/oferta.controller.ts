import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { OfertaService } from './oferta.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('ofertas')
@UseInterceptors(AuditInterceptor)
export class OfertaController {
  constructor(private readonly ofertaService: OfertaService) {}

  @Get()
  async findAll() {
    return this.ofertaService.findAll();
  }
}
