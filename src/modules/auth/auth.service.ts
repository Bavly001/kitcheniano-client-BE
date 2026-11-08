import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Client } from '../clients/entities/client.entity';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginClientDto } from './dto/login-client.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly jwtService: JwtService,
  ) {}

  async register(organizationId: string, dto: RegisterClientDto) {
    const existing = await this.clientRepo.findOne({
      where: { email: dto.email.toLowerCase(), organizationId },
    });

    if (existing) {
      throw new ConflictException(
        `An account with email ${dto.email} already exists for this kitchen.`,
      );
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const client = this.clientRepo.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      address: dto.address,
      organizationId: organizationId || 'org_8492a158b',
    });

    const saved = await this.clientRepo.save(client);
    const token = this.generateToken(saved);

    const { passwordHash: _, ...safeClient } = saved;
    return {
      accessToken: token,
      client: safeClient,
    };
  }

  async login(organizationId: string, dto: LoginClientDto) {
    const client = await this.clientRepo.findOne({
      where: { email: dto.email.toLowerCase(), organizationId },
    });

    if (!client || !client.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const matches = await bcrypt.compare(dto.password, client.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const token = this.generateToken(client);
    const { passwordHash: _, ...safeClient } = client;
    return {
      accessToken: token,
      client: safeClient,
    };
  }

  async getProfile(clientId: number, organizationId: string) {
    const client = await this.clientRepo.findOne({
      where: { id: clientId, organizationId },
    });

    if (!client) {
      throw new UnauthorizedException('Client not found.');
    }

    const { passwordHash: _, ...safeClient } = client;
    return safeClient;
  }

  private generateToken(client: Client): string {
    const payload = {
      sub: client.id,
      email: client.email,
      organizationId: client.organizationId,
      role: 'client',
    };
    return this.jwtService.sign(payload);
  }
}
