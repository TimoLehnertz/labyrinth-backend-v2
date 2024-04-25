import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { patchNestJsSwagger } from 'nestjs-zod';
import { ValidationPipe } from '@nestjs/common';
import { AsyncApiDocumentBuilder, AsyncApiModule } from 'nestjs-asyncapi';

export interface EnvironmentVariables {
  PORT: number;
  FRONT_END: string;
  DATABASE_HOST: string;
  DATABASE_PORT: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_SCHEMA: string;
  AUTH_SECRET: string;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<EnvironmentVariables>);
  app.enableCors({
    origin: [config.getOrThrow('FRONT_END')],
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
  await app.listen(config.getOrThrow<number>('PORT'));
}
bootstrap();
