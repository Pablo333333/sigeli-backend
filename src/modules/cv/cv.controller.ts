import { Controller, Post, Body, Get, Param, Patch, Query, UseInterceptors, UseGuards, UploadedFiles, BadRequestException } from '@nestjs/common';
import { CVService } from './cv.service';
import { CreateCVDto } from './dto/create-cv.dto';
import { UpdateExperienciaDto } from './dto/update-experiencia.dto';
import { UpdateEducacionDto } from './dto/update-educacion.dto';
import { UpdateHabilidadesDto } from './dto/update-habilidades.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { RolePermissions } from '../../common/permissions/role-permissions';

@Controller('cv')
@UseInterceptors(AuditInterceptor)
export class CVController {
  constructor(private readonly cvService: CVService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.cvWrite)
  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'coverPhoto', maxCount: 1 },
    { name: 'dniFront', maxCount: 1 },
    { name: 'dniBack', maxCount: 1 },
    { name: 'presentationVideo', maxCount: 1 },
  ]))
  async createOrUpdate(
    @Body() createCVDto: CreateCVDto,
    @GetUser('userId') actorUserId: string,
    @UploadedFiles() files: {
      profilePhoto?: Express.Multer.File[],
      coverPhoto?: Express.Multer.File[],
      dniFront?: Express.Multer.File[],
      dniBack?: Express.Multer.File[],
      presentationVideo?: Express.Multer.File[],
    }
  ) {
    const data = { ...createCVDto };
    // Alta admin: viene DNI+nombre sin userId → no inyectar el actor
    const esAlta = !!(data.dni && data.fullName && !data.userId);
    if (!data.userId && !esAlta) {
      data.userId = actorUserId;
    }
    return this.cvService.createOrUpdateCV(data, files);
  }

  /**
   * Alta administrativa JSON (sin multipart). Evita que FileFieldsInterceptor
   * vacíe el body y refuerza anti-duplicado DNI.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.cvWrite)
  @Post('registro')
  async registrarNuevo(@Body() createCVDto: CreateCVDto) {
    const { userId: _ignore, ...alta } = createCVDto;
    if (!alta.dni || !alta.fullName) {
      throw new BadRequestException('Para registrar un comunero nuevo se requiere DNI y nombre completo.');
    }
    return this.cvService.createOrUpdateCV(alta);
  }

  /** Anti-duplicado: consulta previa al registrar */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.cvRead)
  @Get('check-dni/:dni')
  async checkDni(
    @Param('dni') dni: string,
    @Query('excludeUserId') excludeUserId?: string,
  ) {
    return this.cvService.checkDniDisponible(dni, excludeUserId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.cvRead)
  @Get('buscar')
  async buscar(
    @Query('q') q?: string,
    @Query('dni') dni?: string,
    @Query('nombre') nombre?: string,
    @Query('empresa') empresa?: string,
  ) {
    return this.cvService.search({ q, dni, nombre, empresa });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.cvRead)
  @Get()
  async findAll(
    @Query('q') q?: string,
    @Query('dni') dni?: string,
    @Query('nombre') nombre?: string,
    @Query('empresa') empresa?: string,
  ) {
    if (q || dni || nombre || empresa) {
      return this.cvService.search({ q, dni, nombre, empresa });
    }
    return this.cvService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.cvRead)
  @Get(':userId')
  async findOne(@Param('userId') userId: string) {
    return this.cvService.findByUserId(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.cvWrite)
  @Patch(':userId/experiencia')
  async updateExperiencia(
    @Param('userId') userId: string,
    @Body() dto: UpdateExperienciaDto
  ) {
    return this.cvService.updateExperiencia(userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.cvWrite)
  @Patch(':userId/educacion')
  async updateEducacion(
    @Param('userId') userId: string,
    @Body() dto: UpdateEducacionDto
  ) {
    return this.cvService.updateEducacion(userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.cvWrite)
  @Patch(':userId/habilidades')
  async updateHabilidades(
    @Param('userId') userId: string,
    @Body() dto: UpdateHabilidadesDto
  ) {
    return this.cvService.updateHabilidades(userId, dto);
  }
}
