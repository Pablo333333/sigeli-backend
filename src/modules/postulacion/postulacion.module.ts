import { Module } from '@nestjs/common';
import { PostulacionService } from './postulacion.service';
import { PostulacionController } from './postulacion.controller';

@Module({
  controllers: [PostulacionController],
  providers: [PostulacionService],
  exports: [PostulacionService],
})
export class PostulacionModule {}
