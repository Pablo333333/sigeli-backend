import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  Get,
  Query,
  UseInterceptors,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { PostulacionService } from './postulacion.service';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { UpdatePostulacionStatusDto } from './dto/update-postulacion-status.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { RolePermissions } from '../../common/permissions/role-permissions';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('postulaciones')
@UseInterceptors(AuditInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class PostulacionController {
  constructor(
    private readonly postulacionService: PostulacionService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveActor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, role: true },
    });
    return user
      ? { userId: user.id, role: user.role, fullName: user.fullName }
      : { userId, role: 'COMUNERO', fullName: undefined };
  }

  @Roles(...RolePermissions.postulacionWrite)
  @Post()
  async create(
    @Body() createPostulacionDto: CreatePostulacionDto,
    @GetUser('userId') loggedUserId: string,
    @GetUser('role') role: string,
  ) {
    let userId = createPostulacionDto.userId || loggedUserId;
    if (role === 'COMUNERO') {
      userId = loggedUserId;
    }
    const actor = await this.resolveActor(loggedUserId);
    return this.postulacionService.createPostulacion(
      { ...createPostulacionDto, userId },
      actor,
    );
  }

  @Roles(...RolePermissions.postulacionRead)
  @Get('catalogo-etapas')
  async catalogo() {
    return this.postulacionService.getCatalogoEtapas();
  }

  @Roles(...RolePermissions.postulacionRead)
  @Get('reporte')
  async reporte(@Query('ofertaId') ofertaId?: string) {
    return this.postulacionService.getReportePostulantes(ofertaId);
  }

  @Roles(...RolePermissions.postulacionRead)
  @Get('comuneros')
  async getComuneros() {
    return this.postulacionService.getComuneros();
  }

  @Roles(...RolePermissions.postulacionAdvance)
  @Patch(':id/status')
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateStatusDto: UpdatePostulacionStatusDto,
    @GetUser('userId') loggedUserId: string,
  ) {
    const actor = await this.resolveActor(loggedUserId);
    return this.postulacionService.updateStatus(id, updateStatusDto, actor);
  }

  /** Alias semántico para avance de etapas */
  @Roles(...RolePermissions.postulacionAdvance)
  @Patch(':id/avance')
  async avance(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateStatusDto: UpdatePostulacionStatusDto,
    @GetUser('userId') loggedUserId: string,
  ) {
    const actor = await this.resolveActor(loggedUserId);
    return this.postulacionService.updateStatus(id, updateStatusDto, actor);
  }

  @Roles(...RolePermissions.postulacionRead)
  @Get('usuario/:userId')
  async findByUserId(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.postulacionService.findByUserId(userId);
  }

  @Roles(...RolePermissions.postulacionRead)
  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.postulacionService.findOne(id);
  }

  @Roles(...RolePermissions.postulacionRead)
  @Get()
  async findAll(@Query('ofertaId') ofertaId?: string) {
    return this.postulacionService.findAll(ofertaId);
  }
}
