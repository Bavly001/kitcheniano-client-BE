import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MenuService } from './menu.service';
import { MenuItem } from './entities/menu-item.entity';

describe('Client MenuService', () => {
  let service: MenuService;
  let mockMenuItemRepo: any;

  const mockDishes = [
    {
      id: 1,
      organizationId: 'org_8492a158b',
      name: 'Greek Salad',
      description: 'Fresh cucumber and feta',
      imageUrl: '/uploads/salad.jpg',
      price: '12.50',
      isVisibleOnMenu: true,
      isActive: true,
    },
    {
      id: 2,
      organizationId: 'org_8492a158b',
      name: 'Secret Staff Stew',
      description: 'Not for public customers',
      imageUrl: null,
      price: '5.00',
      isVisibleOnMenu: false, // HIDDEN
      isActive: true,
    },
    {
      id: 3,
      organizationId: 'org_8492a158b',
      name: 'Archived Soup',
      description: 'Out of season',
      imageUrl: null,
      price: '8.00',
      isVisibleOnMenu: true,
      isActive: false, // INACTIVE
    },
  ];

  beforeEach(async () => {
    mockMenuItemRepo = {
      find: jest.fn().mockImplementation(async ({ where }) => {
        return mockDishes.filter(
          (d) =>
            d.organizationId === where.organizationId &&
            d.isVisibleOnMenu === true &&
            d.isActive === true,
        );
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        {
          provide: getRepositoryToken(MenuItem),
          useValue: mockMenuItemRepo,
        },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return only dishes where isVisibleOnMenu is true and isActive is true', async () => {
    const dishes = await service.getPublicMenu('org_8492a158b');
    expect(dishes.length).toBe(1);
    expect(dishes[0].name).toBe('Greek Salad');
    expect(dishes[0].price).toBe(12.5);
  });

  it('should filter by search query if provided', async () => {
    const dishes = await service.getPublicMenu('org_8492a158b', 'feta');
    expect(dishes.length).toBe(1);

    const nonMatching = await service.getPublicMenu('org_8492a158b', 'pizza');
    expect(nonMatching.length).toBe(0);
  });
});
