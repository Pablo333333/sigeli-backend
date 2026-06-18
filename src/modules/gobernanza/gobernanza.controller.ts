import { Controller, Get, Param } from '@nestjs/common';
import { GobernanzaService } from './gobernanza.service';

@Controller('gobernanza')
export class GobernanzaController {
  constructor(private readonly gobernanzaService: GobernanzaService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.gobernanzaService.getDashboardDirectiva();
  }

  @Get('validar-cuota/:ofertaId')
  async validarCuota(@Param('ofertaId') ofertaId: string) {
    return this.gobernanzaService.validarCuotaLocal(ofertaId);
  }
}
