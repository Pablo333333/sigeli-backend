import { Module } from '@nestjs/common';
import { CVService } from './cv.service';
import { CVController } from './cv.controller';

@Module({
  controllers: [CVController],
  providers: [CVService],
  exports: [CVService],
})
export class CVModule {}
