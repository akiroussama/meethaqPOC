import { BadRequestException, Injectable } from '@nestjs/common';
import { LoyaltyTier, ShippingZone } from 'src/common/enums';
import { LOYALTY_TIER_CONFIG, SHIPPING_ZONE_MULTIPLIER } from 'src/config/business-rules';

export interface ShippingItem {
  quantity: number;
  unitWeightKg: number;
  domesticOnly: boolean;
}

@Injectable()
export class ShippingService {
  calculate(zone: ShippingZone, items: ShippingItem[], cartHt: number, loyaltyTier: LoyaltyTier): number {
    if (zone !== ShippingZone.FRANCE_METRO && items.some((x) => x.domesticOnly)) {
      throw new BadRequestException('Cart contains domestic-only product');
    }

    if (loyaltyTier === LoyaltyTier.GOLD || loyaltyTier === LoyaltyTier.PLATINUM) return 0;
    if (zone === ShippingZone.FRANCE_METRO && cartHt > 75) return 0;

    const totalWeight = items.reduce((sum, item) => sum + item.quantity * item.unitWeightKg, 0);
    const base = this.basePriceForWeight(totalWeight) * SHIPPING_ZONE_MULTIPLIER[zone];

    const shippingDiscount = LOYALTY_TIER_CONFIG[loyaltyTier].shippingDiscount;
    return Math.round(base * (1 - shippingDiscount) * 100) / 100;
  }

  private basePriceForWeight(weightKg: number): number {
    if (weightKg <= 2) return 4.99;
    if (weightKg <= 5) return 8.99;
    if (weightKg <= 10) return 14.99;
    if (weightKg <= 30) return 24.99;
    return weightKg * 1.5;
  }
}
