import { Module } from '@nestjs/common';
import { CVService } from './cv.service';
import { CVController } from './cv.controller';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [CVController],
  providers: [CVService],
  exports: [CVService],
})
export class CVModule {}
