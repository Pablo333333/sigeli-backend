import { Global, Module } from '@nestjs/common';
import { CryptoService } from './services/crypto.service';
import { BiometriaService } from './services/biometria.service';

@Global()
@Module({
  providers: [CryptoService, BiometriaService],
  exports: [CryptoService, BiometriaService],
})
export class CommonModule {}
