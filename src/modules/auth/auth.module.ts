import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client } from '../clients/entities/client.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClientJwtStrategy } from './strategies/client-jwt.strategy';
import { ClientJwtGuard } from './guards/client-jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client]),
    PassportModule.register({ defaultStrategy: 'client-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(
          'CLIENT_JWT_SECRET',
          'kitcheniano_client_secret_jwt_key_2026',
        ),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, ClientJwtStrategy, ClientJwtGuard],
  exports: [AuthService, ClientJwtGuard],
})
export class AuthModule {}
