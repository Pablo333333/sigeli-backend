import { Module } from '@nestjs/common';
import { AnaliticaService } from './analitica.service';
import { MatchingService } from './matching.service';
import { ExportService } from './export.service';
import { AnaliticaController } from './analitica.controller';

@Module({
  controllers: [AnaliticaController],
  providers: [AnaliticaService, MatchingService, ExportService],
  exports: [ExportService],
})
export class AnaliticaModule {}
