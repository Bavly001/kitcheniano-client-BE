import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { Client } from '../clients/entities/client.entity';

describe('Client AuthService', () => {
  let service: AuthService;
  let mockClientRepo: any;
  let mockJwtService: any;

  const demoClient: Partial<Client> = {
    id: 1,
    email: 'test@client.com',
    passwordHash: '$2b$10$hashedpasswordstringsample123',
    firstName: 'Sofia',
    lastName: 'Loren',
    phone: '+1234567890',
    address: '142 Via Roma',
    organizationId: 'org_8492a158b',
  };

  beforeEach(async () => {
    mockClientRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
      save: jest.fn().mockImplementation(async (entity) => ({ id: 1, ...entity })),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock_jwt_token_123'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Client),
          useValue: mockClientRepo,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if client email already exists for organization', async () => {
      mockClientRepo.findOne.mockResolvedValue(demoClient);
      await expect(
        service.register('org_8492a158b', {
          email: 'test@client.com',
          password: 'Password123!',
          firstName: 'Sofia',
          lastName: 'Loren',
          phone: '+1234567890',
          address: '142 Via Roma',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should register new client, hash password, and return accessToken and profile', async () => {
      mockClientRepo.findOne.mockResolvedValue(null);

      const result = await service.register('org_8492a158b', {
        email: 'new@client.com',
        password: 'Password123!',
        firstName: 'Sofia',
        lastName: 'Loren',
        phone: '+1234567890',
        address: '142 Via Roma',
      });

      expect(mockClientRepo.create).toHaveBeenCalled();
      expect(mockClientRepo.save).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock_jwt_token_123');
      expect(result.client.email).toBe('new@client.com');
      expect((result.client as any).passwordHash).toBeUndefined();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if client not found', async () => {
      mockClientRepo.findOne.mockResolvedValue(null);
      await expect(
        service.login('org_8492a158b', {
          email: 'missing@client.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
