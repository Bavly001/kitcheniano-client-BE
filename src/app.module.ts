import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { getTypeOrmConfig } from './config/typeorm.config';
import { AuthModule } from './modules/auth/auth.module';
import { MenuModule } from './modules/menu/menu.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => getTypeOrmConfig(config),
    }),
    AuthModule,
    MenuModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
