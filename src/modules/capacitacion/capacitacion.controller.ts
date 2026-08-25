import {
  Controller,
  Post,
  Patch,
  Put,
  Get,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { CapacitacionService } from './capacitacion.service';
import { CreateCapacitacionDto, UpsertEncuestaEntrenamientoDto } from './dto/create-capacitacion.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolePermissions } from '../../common/permissions/role-permissions';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { TipoCapacitacion } from '@prisma/client';

@Controller('capacitaciones')
@UseInterceptors(AuditInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class CapacitacionController {
  constructor(private readonly capacitacionService: CapacitacionService) {}

  @Roles(...RolePermissions.capacitacionWrite)
  @Post()
  async create(@Body() createCapacitacionDto: CreateCapacitacionDto) {
    return this.capacitacionService.createPrograma(createCapacitacionDto);
  }

  @Roles(...RolePermissions.cvRead)
  @Post('vincular/:capacitacionId/usuario/:userId')
  async vincular(
    @Param('capacitacionId', new ParseUUIDPipe()) capacitacionId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.capacitacionService.vincularTalento(userId, capacitacionId);
  }

  @Roles(...RolePermissions.cvRead)
  @Patch(':id/usuario/:userId')
  async updateAvance(
    @Param('id', new ParseUUIDPipe()) capacitacionId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body('progress') progress: number,
  ) {
    return this.capacitacionService.registrarAvance(userId, capacitacionId, progress);
  }

  /** Encuesta del programa de entrenamiento laboral (Antamina / socio) */
  @Roles(...RolePermissions.cvRead)
  @Get('encuesta/mia')
  async getMiEncuesta(@GetUser('userId') userId: string) {
    return this.capacitacionService.getEncuesta(userId);
  }

  @Roles(...RolePermissions.cvWrite)
  @Put('encuesta/mia')
  async upsertMiEncuesta(
    @GetUser('userId') userId: string,
    @Body() dto: UpsertEncuestaEntrenamientoDto,
  ) {
    return this.capacitacionService.upsertEncuesta(userId, dto);
  }

  @Roles(...RolePermissions.dashboard)
  @Get('entrenamiento/stats')
  async entrenamientoStats() {
    const participantes = await this.capacitacionService.countParticipantesEntrenamiento();
    return { participantes };
  }

  @Roles(...RolePermissions.cvRead)
  @Get('ruta/:userId')
  async getRuta(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('tipo') tipo?: TipoCapacitacion,
  ) {
    return this.capacitacionService.getRutaAprendizaje(userId, tipo);
  }

  @Roles(...RolePermissions.dashboard)
  @Get('metricas-ia')
  async getMetricasIA() {
    return this.capacitacionService.getMetricasIA();
  }

  @Roles(...RolePermissions.cvRead)
  @Get()
  async findAll(@Query('tipo') tipo?: TipoCapacitacion) {
    return this.capacitacionService.findAll(tipo);
  }
}
