import { Controller, Post, Body, Get, Param, Patch, UseInterceptors } from '@nestjs/common';
import { CVService } from './cv.service';
import { CreateCVDto } from './dto/create-cv.dto';
import { UpdateExperienciaDto } from './dto/update-experiencia.dto';
import { UpdateEducacionDto } from './dto/update-educacion.dto';
import { UpdateHabilidadesDto } from './dto/update-habilidades.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('cv')
@UseInterceptors(AuditInterceptor)
export class CVController {
  constructor(private readonly cvService: CVService) {}

  @Post()
  async createOrUpdate(@Body() createCVDto: CreateCVDto) {
    return this.cvService.createOrUpdateCV(createCVDto);
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
}
