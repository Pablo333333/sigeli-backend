import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors();

  // Forzamos a Nest a escuchar en todas las IPs de la red local
// Forzamos a Nest a escuchar en el puerto 3001 y en toda la red local
await app.listen(3001, '0.0.0.0');
console.log(`Application is running on: http://192.168.0.113:3001`);
}
bootstrap();