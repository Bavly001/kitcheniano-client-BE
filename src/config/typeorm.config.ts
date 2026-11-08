/**
 * Shared TypeORM Database Configuration for Client Microservice
 *
 * Connects directly to the existing kitcheniano_db MySQL database instance.
 */

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: parseInt(configService.get<string>('DB_PORT', '3306'), 10),
  username: configService.get<string>('DB_USER', 'kitcheniano_user'),
  password: configService.get<string>('DB_PASSWORD', 'kitcheniano_pass'),
  database: configService.get<string>('DB_NAME', 'kitcheniano_db'),
  autoLoadEntities: true,
  synchronize: false, // Schema managed via main dashboard / migrations
});
