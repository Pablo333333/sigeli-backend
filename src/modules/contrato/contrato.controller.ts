import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  ParseIntPipe,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { ContratoService } from './contrato.service';
import {
  CreateContratoDto,
  UpdateContratoDto,
} from './dto/create-contrato.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolePermissions } from '../../common/permissions/role-permissions';
import { GetUser } from '../../common/decorators/get-user.decorator';

@Controller('contratos')
@UseInterceptors(AuditInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContratoController {
  constructor(private readonly contratoService: ContratoService) {}

  @Roles(...RolePermissions.contratoWrite)
  @Post()
  async create(
    @Body() createContratoDto: CreateContratoDto,
    @GetUser('userId') userId: string,
    @GetUser('role') role: string,
  ) {
    return this.contratoService.createContrato(createContratoDto, {
      userId,
      role,
    });
  }

  @Roles(...RolePermissions.contratoWrite, ...RolePermissions.dashboard)
  @Get('prefill/:postulacionId')
  async prefill(@Param('postulacionId', new ParseUUIDPipe()) postulacionId: string) {
    return this.contratoService.getPrefill(postulacionId);
  }

  @Roles(...RolePermissions.dashboard, ...RolePermissions.contratoWrite)
  @Get('buscar')
  async buscar(
    @Query('q') q?: string,
    @Query('dni') dni?: string,
    @Query('nombre') nombre?: string,
    @Query('empresa') empresa?: string,
  ) {
    return this.contratoService.search({ q, dni, nombre, empresa });
  }

  @Roles(...RolePermissions.dashboard)
  @Get('alertas')
  async getAlertas(
    @Query('dias', new ParseIntPipe({ optional: true })) dias: number = 30,
  ) {
    return this.contratoService.getContratosProximosAVencer(dias);
  }

  @Roles(...RolePermissions.dashboard, ...RolePermissions.contratoWrite)
  @Get()
  async findAll(
    @Query('q') q?: string,
    @Query('dni') dni?: string,
    @Query('nombre') nombre?: string,
    @Query('empresa') empresa?: string,
  ) {
    if (q || dni || nombre || empresa) {
      return this.contratoService.search({ q, dni, nombre, empresa });
    }
    return this.contratoService.findAll();
  }

  @Roles(...RolePermissions.contratoWrite)
  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateContratoDto,
  ) {
    return this.contratoService.updateContrato(id, dto);
  }
}
