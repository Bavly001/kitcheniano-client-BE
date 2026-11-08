import request from 'supertest';
import app from '../src/server';
import { pool } from '../src/db';
import { signToken } from '../src/utils/jwt';
import { hashPassword } from '../src/utils/password';

jest.mock('../src/db', () => {
  const queryMock = jest.fn();
  const getConnectionMock = jest.fn();
  return {
    pool: {
      query: queryMock,
      getConnection: getConnectionMock,
    },
    initializeDatabase: jest.fn().mockResolvedValue(undefined),
  };
});

describe('Kitcheniano Client Express API Tests', () => {
  const testOrgId = 'org_8492a158b';
  let clientToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    clientToken = signToken({
      clientId: 101,
      email: 'sofia@example.com',
      organizationId: testOrgId,
      role: 'client',
    });
  });

  describe('Health Check', () => {
    it('GET /health should return 200 and service details', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('kitcheniano-client-be');
    });
  });

  describe('Customer Authentication', () => {
    it('POST /client/auth/register should create account and return token', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce([[]]) // no existing email
        .mockResolvedValueOnce([{ insertId: 202 }]); // insert client

      const res = await request(app)
        .post('/client/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
          firstName: 'Mario',
          lastName: 'Rossi',
          phone: '+1234567890',
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.client.id).toBe(202);
      expect(res.body.client.email).toBe('newuser@example.com');
    });

    it('POST /client/auth/register should reject duplicate email with 409', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce([[{ id: 101 }]]); // existing email

      const res = await request(app)
        .post('/client/auth/register')
        .send({
          email: 'sofia@example.com',
          password: 'Password123!',
          firstName: 'Sofia',
          lastName: 'Loren',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('POST /client/auth/login should authenticate and return client profile', async () => {
      const hashedPassword = await hashPassword('Secret123!');
      (pool.query as jest.Mock).mockResolvedValueOnce([
        [
          {
            id: 101,
            organizationId: testOrgId,
            email: 'sofia@example.com',
            passwordHash: hashedPassword,
            firstName: 'Sofia',
            lastName: 'Loren',
            phone: '+1234567890',
            address: '142 Via Roma',
          },
        ],
      ]);

      const res = await request(app)
        .post('/client/auth/login')
        .send({
          email: 'sofia@example.com',
          password: 'Secret123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.client.email).toBe('sofia@example.com');
      expect(res.body.client.passwordHash).toBeUndefined();
    });

    it('POST /client/auth/login should reject invalid credentials with 401', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce([[]]); // no client found

      const res = await request(app)
        .post('/client/auth/login')
        .send({
          email: 'nobody@example.com',
          password: 'WrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('GET /client/auth/me should return authenticated client profile', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce([
        [
          {
            id: 101,
            organizationId: testOrgId,
            email: 'sofia@example.com',
            firstName: 'Sofia',
            lastName: 'Loren',
          },
        ],
      ]);

      const res = await request(app)
        .get('/client/auth/me')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.client.id).toBe(101);
      expect(res.body.client.firstName).toBe('Sofia');
    });
  });

  describe('Public Menu Catalog', () => {
    it('GET /client/menu should return public dishes', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce([
        [
          {
            id: 1,
            organizationId: testOrgId,
            name: 'Greek Salad',
            description: 'Fresh salad',
            price: '12.50',
            imageUrl: '/salad.jpg',
            notes: null,
          },
          {
            id: 2,
            organizationId: testOrgId,
            name: 'Margherita Pizza',
            description: 'Wood fired pizza',
            price: '18.00',
            imageUrl: '/pizza.jpg',
            notes: null,
          },
        ],
      ]);

      const res = await request(app).get('/client/menu');

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(2);
      expect(res.body.items[0].price).toBe(12.5);
      expect(res.body.items[1].price).toBe(18.0);
    });
  });

  describe('Persistent Cart', () => {
    it('GET /client/cart should return items with calculated subtotal', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce([
        [
          {
            id: 10,
            menuItemId: 1,
            quantity: 2,
            name: 'Greek Salad',
            price: '12.50',
            imageUrl: '/salad.jpg',
            isActive: 1,
            isVisibleOnMenu: 1,
          },
        ],
      ]);

      const res = await request(app)
        .get('/client/cart')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(1);
      expect(res.body.subtotal).toBe(25.0);
      expect(res.body.itemCount).toBe(2);
    });

    it('DELETE /client/cart should clear the shopping cart', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce([{}]);

      const res = await request(app)
        .delete('/client/cart')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.subtotal).toBe(0);
    });
  });

  describe('Real-Time Notifications Webhook', () => {
    it('POST /client/notifications/webhook should accept valid event and dispatch', async () => {
      const res = await request(app)
        .post('/client/notifications/webhook')
        .send({
          orderId: 501,
          clientId: 101,
          status: 'in_kitchen',
          message: 'Your order is now being cooked in the kitchen!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
