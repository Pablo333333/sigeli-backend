import { Controller, Post, Patch, Get, Body, Param, ParseUUIDPipe, UseInterceptors } from '@nestjs/common';
import { AcuerdosService } from './acuerdos.service';
import { CreateAcuerdoDto, UpdateAcuerdoStatusDto } from './dto/acuerdo.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

@Controller('gobernanza/acuerdos')
@UseInterceptors(AuditInterceptor)
export class AcuerdosController {
  constructor(private readonly acuerdosService: AcuerdosService) {}

  @Post()
  async create(@Body() createAcuerdoDto: CreateAcuerdoDto) {
    return this.acuerdosService.createAcuerdo(createAcuerdoDto);
  }

  @Patch(':id/estado')
  async updateEstado(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateStatusDto: UpdateAcuerdoStatusDto,
  ) {
    return this.acuerdosService.updateEstado(id, updateStatusDto);
  }

  @Get()
  async findAll() {
    return this.acuerdosService.findAll();
  }
}
