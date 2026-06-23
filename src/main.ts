import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors();

  // Railway asigna el puerto mediante la variable de entorno PORT.
  // Si no existe (estás en local), usa 3001.
  const port = process.env.PORT || 3001;
  
  await app.listen(port, '0.0.0.0');
  
  console.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();