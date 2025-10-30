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
  host: process.env.PGHOST ?? 'localhost',
  port: parseInt(process.env.PGPORT ?? '5432', 10),
  username: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? '',
  database: process.env.PGDATABASE ?? 'railway',
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
