import { Module } from '@nestjs/common';
import { IAService } from './ia.service';
import { IAController } from './ia.controller';

@Module({
  controllers: [IAController],
  providers: [IAService],
})
export class IAModule {}
