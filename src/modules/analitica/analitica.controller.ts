import { Controller, Get, Query, ParseUUIDPipe, Res } from '@nestjs/common';
import { AnaliticaService } from './analitica.service';
import { MatchingService } from './matching.service';
import { ExportService } from './export.service';
import { Response } from 'express';

@Controller('analitica')
export class AnaliticaController {
  constructor(
    private readonly analiticaService: AnaliticaService,
    private readonly matchingService: MatchingService,
    private readonly exportService: ExportService,
  ) {}

  @Get('dashboards')
  async getDashboards() {
    return this.analiticaService.getIndicadoresClave();
  }

  @Get('mapa-competencias')
  async getMapaCompetencias() {
    return this.analiticaService.getBrechasCompetencias();
  }

  @Get('matching-sugerencias')
  async getSugerencias(@Query('ofertaId', new ParseUUIDPipe()) ofertaId: string) {
    return this.matchingService.sugerirCandidatos(ofertaId);
  }

  @Get('export/gri')
  async getGRIReport() {
    return this.exportService.generateGRIReport();
  }

  @Get('export/comuneros')
  async exportComuneros(@Res() res: Response) {
    const buffer = await this.exportService.exportComunerosToExcel();
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`padron-comuneros-sigeli-${new Date().getTime()}.xlsx`);
    return res.send(buffer);
  }

  @Get('export/csv')
  async exportCSV(@Res() res: Response) {
    const csv = await this.exportService.exportToCSV();
    res.header('Content-Type', 'text/csv');
    res.attachment(`reporte-sigeli-${new Date().getTime()}.csv`);
    return res.send(csv);
  }

  @Get('export/pdf')
  async exportPDF(@Res() res: Response) {
    const buffer = await this.exportService.exportToPDF();
    res.header('Content-Type', 'application/pdf');
    res.attachment(`reporte-sostenibilidad-sigeli-${new Date().getTime()}.pdf`);
    return res.send(buffer);
  }
}
