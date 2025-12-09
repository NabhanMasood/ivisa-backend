import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { seedAdmins } from './auth/admin.seeder';
import { DataSource } from 'typeorm';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { SettingsService } from './settings/settings.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configure CORS with explicit originss
  const allowedOrigins: string[] = [
    'https://ivisa123.vercel.app',
    'https://ivisa123-landing.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3001',
    'http://localhost:5173',
  ];

  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(cookieParser());

  // Add request logging middlewaree
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Seed admins with error handling
  try {
    const dataSource = app.get(DataSource);
    await seedAdmins(dataSource);
  } catch (error) {
    console.error('Error seeding admins (non-fatal):', error.message);
    // Don't crash the app if seeding fails
  }

  // Initialize default settings
  try {
    const settingsService = app.get(SettingsService);
    await settingsService.initializeDefaultSettings();
    console.log('✅ Default settings initialized');
  } catch (error) {
    console.error('Error initializing settings (non-fatal):', error.message);
    // Don't crash the app if settings initialization fails
  }

  // Use PORT from environment or fallback to 5000
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;
  // CRITICAL: Listen on 0.0.0.0, not localhost, so Railway can connect
  await app.listen(port, '0.0.0.0');
  console.log(`✅ Server running on http://0.0.0.0:${port} (accessible from Railway)`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
