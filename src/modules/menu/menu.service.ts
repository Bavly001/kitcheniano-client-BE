import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';

export interface PublicDishDto {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  notes?: string;
}

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
  ) {}

  async getPublicMenu(
    organizationId: string,
    search?: string,
    category?: string,
  ): Promise<PublicDishDto[]> {
    const orgId = organizationId || 'org_8492a158b';
    const items = await this.menuItemRepo.find({
      where: {
        organizationId: orgId,
        isVisibleOnMenu: true,
        isActive: true,
      },
    });

    let filtered = items;

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)),
      );
    }

    if (category && category.trim() && category !== 'all') {
      const cat = category.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(cat) ||
          (item.description && item.description.toLowerCase().includes(cat)) ||
          (item.notes && item.notes.toLowerCase().includes(cat)),
      );
    }

    return filtered.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      price: Number(item.price || 0),
      notes: item.notes,
    }));
  }

  async getDishById(id: number, organizationId: string): Promise<PublicDishDto | null> {
    const orgId = organizationId || 'org_8492a158b';
    const item = await this.menuItemRepo.findOne({
      where: {
        id,
        organizationId: orgId,
        isVisibleOnMenu: true,
        isActive: true,
      },
    });

    if (!item) return null;

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      price: Number(item.price || 0),
      notes: item.notes,
    };
  }
}
