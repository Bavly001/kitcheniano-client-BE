import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { SyncCartDto } from './dto/sync-cart.dto';
import { ClientJwtGuard } from '../auth/guards/client-jwt.guard';

@ApiTags('Client Cart Sync')
@Controller('client/cart')
@UseGuards(ClientJwtGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current customer persisted cart items and subtotal' })
  async getCart(@Request() req: any) {
    return this.cartService.getCart(req.user.id, req.user.organizationId);
  }

  @Put()
  @ApiOperation({ summary: 'Sync or bulk replace client cart items on the backend' })
  async syncCart(@Request() req: any, @Body() dto: SyncCartDto) {
    return this.cartService.syncCart(req.user.id, req.user.organizationId, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items from customer cart' })
  async clearCart(@Request() req: any) {
    await this.cartService.clearCart(req.user.id, req.user.organizationId);
    return { success: true, message: 'Cart cleared successfully' };
  }
}
