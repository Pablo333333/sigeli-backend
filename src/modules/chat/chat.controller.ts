import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendComunicacionDto, UpdateComunicacionEstadoDto } from './dto/comunicacion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolePermissions } from '../../common/permissions/role-permissions';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('chat')
@UseInterceptors(AuditInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  private async actor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, role: true },
    });
    return {
      userId,
      role: user?.role || 'COMUNERO',
      fullName: user?.fullName,
    };
  }

  @Roles(...RolePermissions.postulacionRead)
  @Get('conversaciones')
  async conversaciones(@GetUser('userId') userId: string) {
    return this.chatService.listConversaciones(await this.actor(userId));
  }

  @Roles(...RolePermissions.postulacionRead)
  @Get('postulacion/:postulacionId')
  async mensajes(
    @Param('postulacionId', new ParseUUIDPipe()) postulacionId: string,
    @GetUser('userId') userId: string,
  ) {
    return this.chatService.getMensajes(postulacionId, await this.actor(userId));
  }

  @Roles(...RolePermissions.postulacionRead)
  @Post('send')
  async send(@Body() dto: SendComunicacionDto, @GetUser('userId') userId: string) {
    return this.chatService.send(dto, await this.actor(userId));
  }

  @Roles(...RolePermissions.postulacionRead)
  @Patch(':id/estado')
  async updateEstado(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateComunicacionEstadoDto,
    @GetUser('userId') userId: string,
  ) {
    return this.chatService.updateEstado(id, dto.estado, await this.actor(userId));
  }
}
