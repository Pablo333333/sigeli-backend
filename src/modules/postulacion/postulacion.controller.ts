import { Controller, Post, Patch, Param, Body, Get, UseInterceptors, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { PostulacionService } from './postulacion.service';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { UpdatePostulacionStatusDto } from './dto/update-postulacion-status.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@Controller('postulaciones')
@UseInterceptors(AuditInterceptor)
export class PostulacionController {
  constructor(private readonly postulacionService: PostulacionService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createPostulacionDto: CreatePostulacionDto,
    @GetUser('userId') loggedUserId: string
  ) {
    // Si el admin envía un userId, lo usamos. Si no, usamos el del usuario logueado.
    const userId = createPostulacionDto.userId || loggedUserId;
    return this.postulacionService.createPostulacion({
      ...createPostulacionDto,
      userId
    });
  }

  @Get('comuneros')
  async getComuneros() {
    return this.postulacionService.getComuneros();
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

  @Get()
  async findAll() {
    return this.postulacionService.findAll();
  }
}
