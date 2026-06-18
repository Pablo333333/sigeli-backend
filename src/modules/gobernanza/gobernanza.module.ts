import { Module } from '@nestjs/common';
import { AcuerdosService } from './acuerdos.service';
import { AcuerdosController } from './acuerdos.controller';
import { GobernanzaService } from './gobernanza.service';
import { GobernanzaController } from './gobernanza.controller';

@Module({
  controllers: [AcuerdosController, GobernanzaController],
  providers: [AcuerdosService, GobernanzaService],
  exports: [AcuerdosService, GobernanzaService],
})
export class GobernanzaModule {}
