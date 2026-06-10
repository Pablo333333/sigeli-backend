import { Module } from '@nestjs/common';
import { CapacitacionService } from './capacitacion.service';
import { CapacitacionController } from './capacitacion.controller';

@Module({
  controllers: [CapacitacionController],
  providers: [CapacitacionService],
  exports: [CapacitacionService],
})
export class CapacitacionModule {}
