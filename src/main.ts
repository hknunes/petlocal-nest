import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove campos que não estão no DTO (ex: se enviarem password no pet)
      forbidNonWhitelisted: true, // Bloqueia o pedido se enviarem campos desconhecidos
      transform: true, // Converte tipos automaticamente (ex: string "1" para number 1)
    }),
  );

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('PetLocal API')
    .setDescription('Documentação do meu MVP')
    .setVersion('1.0')
    .addBearerAuth() // Isso permite colar o token depois
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // A página ficará em /api

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
