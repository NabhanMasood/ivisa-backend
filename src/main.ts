import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { seedAdmins } from './auth/admin.seeder';
import { DataSource } from 'typeorm';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const dataSource = app.get(DataSource);
  await seedAdmins(dataSource);
  

  await app.listen(5000);
  console.log(`Server running on http://localhost:5000`);
}
bootstrap();
