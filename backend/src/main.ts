import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Cabeceras de seguridad HTTP
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  
  // Límite de tamaño para comprobantes en base64 ajustado a 15mb (protección contra saturación de memoria)
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));

  // Habilitar CORS para frontend y PWA (LAN e Internet)
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // Validación global de DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Prefijo global para la API
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 API corriendo en http://localhost:${port}/api`);
}
bootstrap();