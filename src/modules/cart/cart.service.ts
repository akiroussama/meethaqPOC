import { BadRequestException, Injectable } from '@nestjs/common';
import { CART_RULES } from 'src/config/business-rules';
import { InventoryService } from 'src/modules/inventory/inventory.service';

export interface CartItem {
  productId: string;
  quantity: number;
  unitPriceTtc: number;
  updatedAt: Date;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  lastActivityAt: Date;
}

@Injectable()
export class CartService {
  private readonly carts = new Map<string, Cart>();

  constructor(private readonly inventoryService: InventoryService) {}

  upsertItem(userId: string, productId: string, quantity: number, unitPriceTtc: number, now = new Date()): Cart {
    if (quantity < 1 || quantity > CART_RULES.maxUnitsPerItem) {
      throw new BadRequestException('Quantity out of allowed range');
    }
    if (this.inventoryService.getAvailable(productId) === 0) {
      throw new BadRequestException('Product out of stock');
    }

    const cart = this.getOrCreate(userId, now);
    this.expireIfNeeded(cart, now);

    const existing = cart.items.find((item) => item.productId === productId);
    if (!existing && cart.items.length >= CART_RULES.maxDistinctItems) {
      throw new BadRequestException('Max distinct items reached');
    }

    const currentlyReserved = existing?.quantity ?? 0;
    if (quantity > currentlyReserved) {
      const toReserve = quantity - currentlyReserved;
      const ok = this.inventoryService.reserve(productId, toReserve);
      if (!ok) throw new BadRequestException('Insufficient available stock');
    }
    if (quantity < currentlyReserved) {
      this.inventoryService.release(productId, currentlyReserved - quantity);
    }

    if (existing) {
      existing.quantity = quantity;
      existing.unitPriceTtc = unitPriceTtc;
      existing.updatedAt = now;
    } else {
      cart.items.push({ productId, quantity, unitPriceTtc, updatedAt: now });
    }

    cart.lastActivityAt = now;
    return cart;
  }

  expireCart(userId: string): void {
    const cart = this.carts.get(userId);
    if (!cart) return;
    for (const item of cart.items) {
      this.inventoryService.release(item.productId, item.quantity);
    }
    cart.items = [];
  }

  private expireIfNeeded(cart: Cart, now: Date): void {
    const elapsedMinutes = (now.getTime() - cart.lastActivityAt.getTime()) / 60000;
    if (elapsedMinutes > CART_RULES.expirationMinutes) {
      for (const item of cart.items) {
        this.inventoryService.release(item.productId, item.quantity);
      }
      cart.items = [];
    }
  }

  private getOrCreate(userId: string, now: Date): Cart {
    const found = this.carts.get(userId);
    if (found) return found;
    const cart: Cart = { userId, items: [], lastActivityAt: now };
    this.carts.set(userId, cart);
    return cart;
  }
}
