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
import { CommonModule } from './common/common.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    // Load .env globally (MUST come before TypeOrmModule)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // ensures it reads from your local .env
    }),

    CommonModule,

    CommonModule,

    // Database config
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        // Parse DATABASE_URL if provided (Railway, Heroku, etc.)
        if (process.env.DATABASE_URL) {
          const url = new URL(process.env.DATABASE_URL);
          const config = {
            type: 'postgres' as const,
            host: url.hostname,
            port: parseInt(url.port, 10),
            username: url.username,
            password: url.password,
            database: url.pathname.slice(1), // Remove leading '/'
            ssl: { rejectUnauthorized: false }, // Railway requires SSL
            autoLoadEntities: true,
            synchronize: true,
            retryAttempts: 5,
            retryDelay: 3000,
          };
          console.log(`Connecting to database: ${url.hostname}:${url.port}/${url.pathname.slice(1)}`);
          return config;
        }


        // Fall back to individual environment variables
        return {
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
        };
      },
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
    EmailModule,
  ], controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }