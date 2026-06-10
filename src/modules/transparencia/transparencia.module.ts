import { Module } from '@nestjs/common';
import { TransparenciaService } from './transparencia.service';
import { TransparenciaController } from './transparencia.controller';

@Module({
  controllers: [TransparenciaController],
  providers: [TransparenciaService],
  exports: [TransparenciaService],
})
export class TransparenciaModule {}
