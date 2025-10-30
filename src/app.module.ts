import { Module} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CountriesModule } from './countries/countries.module';
import { VisaProductModule } from './visa-product/visa-product.module';
import { NationalitiesModule } from './nationalities/nationalities.module';

@Module({
  imports: [
 ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true,
      ssl: {
        rejectUnauthorized: false,
      },
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
