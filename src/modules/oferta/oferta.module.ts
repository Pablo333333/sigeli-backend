import { Module } from '@nestjs/common';
import { OfertaService } from './oferta.service';

@Module({
  providers: [OfertaService],
  exports: [OfertaService],
})
export class OfertaModule {}
