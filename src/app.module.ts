import { Module } from '@nestjs/common';
import { PricingService } from 'src/modules/pricing/pricing.service';
import { PromotionsService } from 'src/modules/promotions/promotions.service';
import { InventoryService } from 'src/modules/inventory/inventory.service';
import { CartService } from 'src/modules/cart/cart.service';
import { OrdersService } from 'src/modules/orders/orders.service';
import { ShippingService } from 'src/modules/shipping/shipping.service';
import { LoyaltyService } from 'src/modules/loyalty/loyalty.service';

@Module({
  providers: [PricingService, PromotionsService, InventoryService, CartService, OrdersService, ShippingService, LoyaltyService]
})
export class AppModule {}
