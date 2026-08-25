import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { OfertaService } from './oferta.service';
import { CreateOfertaDto, UpdateOfertaDto } from './dto/create-oferta.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolePermissions } from '../../common/permissions/role-permissions';

@Controller('ofertas')
@UseInterceptors(AuditInterceptor)
export class OfertaController {
  constructor(private readonly ofertaService: OfertaService) {}

  /** Listado público autenticable: vigente por defecto; ?todas=1 incluye culminadas */
  @Get()
  async findAll(@Query('todas') todas?: string) {
    return this.ofertaService.findAll(todas === '1' || todas === 'true');
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.ofertaService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.ofertaWrite)
  @Post()
  async create(@Body() dto: CreateOfertaDto) {
    return this.ofertaService.create(dto, true);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.ofertaWrite)
  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOfertaDto,
  ) {
    return this.ofertaService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...RolePermissions.ofertaWrite)
  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.ofertaService.softDelete(id);
  }
}
