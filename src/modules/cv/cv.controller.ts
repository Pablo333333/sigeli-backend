import { Controller, Post, Body, Get, Param, Patch, UseInterceptors, UseGuards, UploadedFiles } from '@nestjs/common';
import { CVService } from './cv.service';
import { CreateCVDto } from './dto/create-cv.dto';
import { UpdateExperienciaDto } from './dto/update-experiencia.dto';
import { UpdateEducacionDto } from './dto/update-educacion.dto';
import { UpdateHabilidadesDto } from './dto/update-habilidades.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('cv')
@UseInterceptors(AuditInterceptor)
export class CVController {
  constructor(private readonly cvService: CVService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'dniFront', maxCount: 1 },
    { name: 'dniBack', maxCount: 1 },
    { name: 'presentationVideo', maxCount: 1 },
  ]))
  async createOrUpdate(
    @Body() createCVDto: CreateCVDto,
    @GetUser('userId') userId: string,
    @UploadedFiles() files: {
      profilePhoto?: Express.Multer.File[],
      dniFront?: Express.Multer.File[],
      dniBack?: Express.Multer.File[],
      presentationVideo?: Express.Multer.File[],
    }
  ) {
    const data = { ...createCVDto };
    // Si no se especifica un userId y no hay datos para crear uno nuevo (dni/fullName),
    // usamos el ID del usuario autenticado.
    if (!data.userId && !data.dni && !data.fullName) {
      data.userId = userId;
    }
    
    return this.cvService.createOrUpdateCV(data, files);
  }

  @Get(':userId')
  async findOne(@Param('userId') userId: string) {
    return this.cvService.findByUserId(userId);
  }

  @Patch(':userId/experiencia')
  async updateExperiencia(
    @Param('userId') userId: string,
    @Body() dto: UpdateExperienciaDto
  ) {
    return this.cvService.updateExperiencia(userId, dto);
  }

  @Patch(':userId/educacion')
  async updateEducacion(
    @Param('userId') userId: string,
    @Body() dto: UpdateEducacionDto
  ) {
    return this.cvService.updateEducacion(userId, dto);
  }

  @Patch(':userId/habilidades')
  async updateHabilidades(
    @Param('userId') userId: string,
    @Body() dto: UpdateHabilidadesDto
  ) {
    return this.cvService.updateHabilidades(userId, dto);
  }

  @Get()
  async findAll() {
    return this.cvService.findAll();
  }
}
