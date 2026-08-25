import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseUUIDPipe,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { EvaluacionService } from './evaluacion.service';
import { CreateEvaluacionDto } from './dto/create-evaluacion.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolePermissions } from '../../common/permissions/role-permissions';
import { GetUser } from '../../common/decorators/get-user.decorator';

@Controller('evaluaciones')
@UseInterceptors(AuditInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluacionController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  /** Contratos activos sobre los que se puede registrar la evaluación 360°. */
  @Roles(...RolePermissions.evaluacionWrite)
  @Get('contratos-elegibles')
  async contratosElegibles(
    @GetUser('userId') userId: string,
    @GetUser('role') role: string,
  ) {
    return this.evaluacionService.getContratosElegibles(userId, role);
  }

  @Roles(...RolePermissions.evaluacionWrite)
  @Get('mias')
  async misEvaluaciones(@GetUser('userId') userId: string) {
    return this.evaluacionService.findMisEvaluaciones(userId);
  }

  @Roles(...RolePermissions.evaluacionWrite)
  @Post()
  async create(
    @Body() createEvaluacionDto: CreateEvaluacionDto,
    @GetUser('userId') userId: string,
    @GetUser('role') role: string,
  ) {
    return this.evaluacionService.registrarEvaluacion(
      createEvaluacionDto,
      userId,
      role,
    );
  }

  @Roles(...RolePermissions.evaluacionWrite)
  @Get('usuario/:userId')
  async findByUsuario(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.evaluacionService.findByEvaluado(userId);
  }
}
