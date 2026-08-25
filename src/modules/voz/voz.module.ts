import { Module } from '@nestjs/common';
import { VozService } from './voz.service';
import { VozController } from './voz.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VozController],
  providers: [VozService],
})
export class VozModule {}
