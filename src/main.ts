import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

export interface EnvironmentVariables {
  PORT: number;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<EnvironmentVariables>);
  await app.listen(config.get<number>('PORT', 3001));
}
bootstrap();
