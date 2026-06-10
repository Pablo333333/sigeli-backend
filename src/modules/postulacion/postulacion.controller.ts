import { Controller, Post, Patch, Param, Body, Get, UseInterceptors, ParseUUIDPipe } from '@nestjs/common';
import { PostulacionService } from './postulacion.service';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { UpdatePostulacionStatusDto } from './dto/update-postulacion-status.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('postulaciones')
@UseInterceptors(AuditInterceptor)
export class PostulacionController {
  constructor(private readonly postulacionService: PostulacionService) {}

  @Post()
  async create(@Body() createPostulacionDto: CreatePostulacionDto) {
    return this.postulacionService.createPostulacion(createPostulacionDto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateStatusDto: UpdatePostulacionStatusDto,
  ) {
    return this.postulacionService.updateStatus(
      id,
      updateStatusDto.newStatus,
      updateStatusDto.notes,
    );
  }

  @Get('usuario/:userId')
  async findByUserId(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.postulacionService.findByUserId(userId);
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.postulacionService.findOne(id);
  }
}
