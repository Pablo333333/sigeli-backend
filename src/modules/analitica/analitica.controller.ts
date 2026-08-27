import { Controller, Get, Query, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';
import { AnaliticaService } from './analitica.service';
import { MatchingService } from './matching.service';
import { ExportService } from './export.service';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolePermissions } from '../../common/permissions/role-permissions';

@Controller('analitica')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnaliticaController {
  constructor(
    private readonly analiticaService: AnaliticaService,
    private readonly matchingService: MatchingService,
    private readonly exportService: ExportService,
  ) {}

  @Roles(...RolePermissions.dashboard)
  @Get('dashboards')
  async getDashboards(
    @Query('sector') sector?: string,
    @Query('gender') gender?: string,
    @Query('tipoManoObra') tipoManoObra?: string,
    @Query('anio') anio?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.analiticaService.getDashboardPersonalizado({
      sector: sector || undefined,
      gender: gender || undefined,
      tipoManoObra: tipoManoObra || undefined,
      anio: anio ? Number(anio) : undefined,
      tenantId: tenantId || undefined,
    });
  }

  @Roles(...RolePermissions.dashboard)
  @Get('mapa-competencias')
  async getMapaCompetencias() {
    return this.analiticaService.getBrechasCompetencias();
  }

  /** Catálogo de sectores / centros poblados georreferenciados */
  @Roles(...RolePermissions.dashboard)
  @Get('sectores-geo')
  async getSectoresGeo() {
    return this.analiticaService.getSectoresGeograficos();
  }

  /**
   * Heatmap geográfico.
   * capa: ofertas | comuneros | postulantes | todos
   */
  @Roles(...RolePermissions.dashboard)
  @Get('heatmap')
  async getHeatmap(
    @Query('capa') capa?: string,
  ) {
    const allowed = ['ofertas', 'comuneros', 'postulantes', 'todos'] as const;
    const layer = allowed.includes(capa as any) ? (capa as (typeof allowed)[number]) : 'todos';
    return this.analiticaService.getHeatmap(layer);
  }

  @Roles(...RolePermissions.postulacionRead)
  @Get('matching-sugerencias')
  async getSugerencias(@Query('ofertaId', new ParseUUIDPipe()) ofertaId: string) {
    return this.matchingService.sugerirCandidatos(ofertaId);
  }

  @Roles(...RolePermissions.dashboard)
  @Get('export/gri')
  async getGRIReport() {
    return this.exportService.generateGRIReport();
  }

  @Roles(...RolePermissions.dashboard)
  @Get('export/comuneros')
  async exportComuneros(@Res() res: Response) {
    const buffer = await this.exportService.exportComunerosToExcel();
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`padron-comuneros-talento-${new Date().getTime()}.xlsx`);
    return res.send(buffer);
  }

  @Roles(...RolePermissions.dashboard)
  @Get('export/csv')
  async exportCSV(@Res() res: Response) {
    const csv = await this.exportService.exportToCSV();
    res.header('Content-Type', 'text/csv');
    res.attachment(`reporte-talento-${new Date().getTime()}.csv`);
    return res.send(csv);
  }

  @Roles(...RolePermissions.dashboard)
  @Get('export/pdf')
  async exportPDF(@Res() res: Response) {
    const buffer = await this.exportService.exportToPDF();
    res.header('Content-Type', 'application/pdf');
    res.attachment(`reporte-sostenibilidad-talento-${new Date().getTime()}.pdf`);
    return res.send(buffer);
  }
}
