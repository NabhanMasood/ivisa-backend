import { Module} from '@nestjs/common';
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
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true,
      ssl: { rejectUnauthorized: false },
    }),
    AuthModule,
    CountriesModule,
    VisaProductModule,
    NationalitiesModule,
    EmbassiesModule,
    CustomersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
