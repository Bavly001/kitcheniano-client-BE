import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ClientCart } from './entities/client-cart.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { SyncCartDto } from './dto/sync-cart.dto';

export interface CartLineItem {
  menuItemId: number;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  lineTotal: number;
}

export interface ClientCartResponse {
  items: CartLineItem[];
  totalQuantity: number;
  subtotal: number;
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(ClientCart)
    private readonly cartRepo: Repository<ClientCart>,
    @InjectRepository(MenuItem)
    private readonly menuRepo: Repository<MenuItem>,
  ) {}

  async syncCart(
    clientId: number,
    organizationId: string,
    dto: SyncCartDto,
  ): Promise<ClientCartResponse> {
    const orgId = organizationId || 'org_8492a158b';

    // Remove existing cart entries for this client
    await this.cartRepo.delete({ clientId });

    if (dto.items && dto.items.length > 0) {
      const records = dto.items.map((item) =>
        this.cartRepo.create({
          clientId,
          organizationId: orgId,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        }),
      );
      await this.cartRepo.save(records);
    }

    return this.getCart(clientId, orgId);
  }

  async getCart(
    clientId: number,
    organizationId: string,
  ): Promise<ClientCartResponse> {
    const orgId = organizationId || 'org_8492a158b';
    const cartEntries = await this.cartRepo.find({
      where: { clientId },
    });

    if (cartEntries.length === 0) {
      return { items: [], totalQuantity: 0, subtotal: 0 };
    }

    const menuIds = cartEntries.map((c) => c.menuItemId);
    const dishes = await this.menuRepo.find({
      where: { id: In(menuIds) },
    });

    const dishMap = new Map<number, MenuItem>();
    dishes.forEach((d) => dishMap.set(d.id, d));

    let subtotal = 0;
    let totalQuantity = 0;
    const items: CartLineItem[] = [];

    for (const entry of cartEntries) {
      const dish = dishMap.get(entry.menuItemId);
      if (dish && dish.isActive && dish.isVisibleOnMenu) {
        const price = Number(dish.price || 0);
        const lineTotal = price * entry.quantity;
        subtotal += lineTotal;
        totalQuantity += entry.quantity;

        items.push({
          menuItemId: dish.id,
          name: dish.name,
          price,
          imageUrl: dish.imageUrl,
          quantity: entry.quantity,
          lineTotal: Number(lineTotal.toFixed(2)),
        });
      }
    }

    return {
      items,
      totalQuantity,
      subtotal: Number(subtotal.toFixed(2)),
    };
  }

  async clearCart(clientId: number, organizationId: string): Promise<void> {
    await this.cartRepo.delete({ clientId });
  }
}
