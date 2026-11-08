import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CartService } from './cart.service';
import { ClientCart } from './entities/client-cart.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';

describe('Client CartService', () => {
  let service: CartService;
  let mockCartRepo: any;
  let mockMenuItemRepo: any;

  let storedCart: any[] = [];

  const mockDishes = [
    { id: 1, name: 'Greek Salad', price: '12.50', imageUrl: '/salad.jpg', isVisibleOnMenu: true, isActive: true },
    { id: 2, name: 'Margherita Pizza', price: '18.00', imageUrl: '/pizza.jpg', isVisibleOnMenu: true, isActive: true },
  ];

  beforeEach(async () => {
    storedCart = [];

    mockCartRepo = {
      find: jest.fn().mockImplementation(async ({ where }) => {
        return storedCart.filter((c) => c.clientId === where.clientId);
      }),
      delete: jest.fn().mockImplementation(async (where) => {
        storedCart = storedCart.filter((c) => c.clientId !== where.clientId);
        return { affected: 1 };
      }),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation(async (items) => {
        const arr = Array.isArray(items) ? items : [items];
        arr.forEach((it) => storedCart.push({ id: Math.random(), ...it }));
        return items;
      }),
    };

    mockMenuItemRepo = {
      find: jest.fn().mockResolvedValue(mockDishes),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: getRepositoryToken(ClientCart),
          useValue: mockCartRepo,
        },
        {
          provide: getRepositoryToken(MenuItem),
          useValue: mockMenuItemRepo,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should sync and retrieve customer cart with calculated subtotal', async () => {
    await service.syncCart(101, 'org_8492a158b', {
      items: [
        { menuItemId: 1, quantity: 2 }, // 2 * 12.50 = 25.00
        { menuItemId: 2, quantity: 1 }, // 1 * 18.00 = 18.00
      ],
    });

    const cart = await service.getCart(101, 'org_8492a158b');
    expect(cart.items.length).toBe(2);
    expect(cart.totalQuantity).toBe(3);
    expect(cart.subtotal).toBe(43.0);
  });

  it('should clear cart for client', async () => {
    await service.syncCart(101, 'org_8492a158b', {
      items: [{ menuItemId: 1, quantity: 1 }],
    });
    await service.clearCart(101, 'org_8492a158b');
    const cart = await service.getCart(101, 'org_8492a158b');
    expect(cart.items.length).toBe(0);
    expect(cart.subtotal).toBe(0);
  });
});
