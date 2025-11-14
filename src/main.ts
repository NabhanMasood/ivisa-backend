import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { seedAdmins } from './auth/admin.seeder';
import { DataSource } from 'typeorm';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors();

  app.use(cookieParser());

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  const dataSource = app.get(DataSource);
  await seedAdmins(dataSource);

  // Use PORT from environment or fallback to 5000
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();