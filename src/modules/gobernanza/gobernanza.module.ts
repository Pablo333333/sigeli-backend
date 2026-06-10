import { Module } from '@nestjs/common';
import { AcuerdosService } from './acuerdos.service';
import { AcuerdosController } from './acuerdos.controller';

@Module({
  controllers: [AcuerdosController],
  providers: [AcuerdosService],
  exports: [AcuerdosService],
})
export class GobernanzaModule {}
