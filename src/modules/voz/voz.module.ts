import { Module } from '@nestjs/common';
import { VozService } from './voz.service';
import { VozController } from './voz.controller';
import { PostulacionModule } from '../postulacion/postulacion.module';
import { OfertaModule } from '../oferta/oferta.module';
import { TransparenciaModule } from '../transparencia/transparencia.module';

@Module({
  imports: [PostulacionModule, OfertaModule, TransparenciaModule],
  controllers: [VozController],
  providers: [VozService],
})
export class VozModule {}
