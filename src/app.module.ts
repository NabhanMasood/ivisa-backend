import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CountriesModule } from './countries/countries.module';
import { VisaProductModule } from './visa-product/visa-product.module';
import { NationalitiesModule } from './nationalities/nationalities.module';
import { EmbassiesModule } from './embassies/embassies.module';
import { CustomersModule } from './customers/customers.module';
import { VisaApplicationsModule } from './visa-applications/visa-applications.module';
import { TravelersModule } from './travelers/travelers.module';
import { PaymentsModule } from './payments/payments.module';
import { CouponsModule } from './coupons/coupons.module';
import { ProcessingOptionsModule } from './processing-options/processing-options.module';
import { StripeModule } from './stripe/stripe.module';
import { CardInfoModule } from './card-info/card-info.module';
@Module({
  imports: [
    // Load .env globally (MUST come before TypeOrmModule)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // ensures it reads from your local .env
    }),

    // Database config
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
      username: process.env.PGUSER || 'Asad',
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
    EmbassiesModule,
    CustomersModule,
    VisaApplicationsModule,
    TravelersModule,
    PaymentsModule,
    CouponsModule,
    StripeModule,
    CardInfoModule,
    ProcessingOptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }