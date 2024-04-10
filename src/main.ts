import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { patchNestJsSwagger } from 'nestjs-zod';
import { ValidationPipe } from '@nestjs/common';
import { AsyncApiDocumentBuilder, AsyncApiModule } from 'nestjs-asyncapi';

export interface EnvironmentVariables {
  PORT: number;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    // allowedHeaders: 'localhost:3000',
  });
  app.useGlobalPipes(new ValidationPipe());

  patchNestJsSwagger();

  const documentBuilder = new DocumentBuilder()
    .setTitle('Labyrinth')
    .setDescription('The Labyrinth API description')
    .setVersion('1.0')
    .addTag('labyrinth')
    .addBearerAuth()
    .build();
  // await SwaggerModule.loadPluginMetadata(metadata);
  const document = SwaggerModule.createDocument(app, documentBuilder);
  SwaggerModule.setup('api', app, document);

  const asyncApiOptions = new AsyncApiDocumentBuilder()
    .setTitle('Labyrinth')
    .setDescription('The Labyrinth API description')
    .setVersion('1.0')
    .setDefaultContentType('application/json')
    .addBearerAuth()
    .addServer('labyrinth', {
      url: 'ws://localhost:3001',
      protocol: 'socket.io',
    })
    .build();

  const asyncapiDocument = AsyncApiModule.createDocument(app, asyncApiOptions);
  await AsyncApiModule.setup('asyncapi', app, asyncapiDocument);

  const config = app.get(ConfigService<EnvironmentVariables>);
  await app.listen(config.getOrThrow<number>('PORT'));
}
bootstrap();
