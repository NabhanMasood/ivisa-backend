import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CountriesModule } from './countries/countries.module';
import { VisaProductModule } from './visa-product/visa-product.module';
import { NationalitiesModule } from './nationalities/nationalities.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
      username: process.env.PGUSER || 'hamza',
      password: process.env.PGPASSWORD || '1234',
      database: process.env.PGDATABASE || 'ivisa123_backend_db',
      ssl:
        process.env.PGSSLMODE === 'require'
          ? { rejectUnauthorized: false }
          : false,
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    CountriesModule,
    VisaProductModule,
    NationalitiesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
