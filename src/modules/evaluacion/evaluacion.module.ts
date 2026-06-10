import { Module } from '@nestjs/common';
import { EvaluacionService } from './evaluacion.service';
import { EvaluacionController } from './evaluacion.controller';

@Module({
  controllers: [EvaluacionController],
  providers: [EvaluacionService],
  exports: [EvaluacionService],
})
export class EvaluacionModule {}
