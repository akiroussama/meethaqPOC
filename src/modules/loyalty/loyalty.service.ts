import { Injectable } from '@nestjs/common';
import { LoyaltyTier } from 'src/common/enums';
import { LOYALTY_TIER_CONFIG } from 'src/config/business-rules';

@Injectable()
export class LoyaltyService {
  private static readonly TIER_ORDER: LoyaltyTier[] = [
    LoyaltyTier.BRONZE,
    LoyaltyTier.SILVER,
    LoyaltyTier.GOLD,
    LoyaltyTier.PLATINUM,
  ];

  computeEarnedPoints(orderHt: number, promoLinesHt: number, isHappyHour: boolean): number {
    const base = Math.floor(orderHt - promoLinesHt * 0.5);
    return isHappyHour ? base * 2 : base;
  }

  getTier(pointsLast12Months: number): LoyaltyTier {
    if (pointsLast12Months >= LOYALTY_TIER_CONFIG[LoyaltyTier.PLATINUM].min) return LoyaltyTier.PLATINUM;
    if (pointsLast12Months >= LOYALTY_TIER_CONFIG[LoyaltyTier.GOLD].min) return LoyaltyTier.GOLD;
    if (pointsLast12Months >= LOYALTY_TIER_CONFIG[LoyaltyTier.SILVER].min) return LoyaltyTier.SILVER;
    return LoyaltyTier.BRONZE;
  }

  recalculateMonthly(pointsLast12Months: number, _currentTier: LoyaltyTier): LoyaltyTier {
    // Simplified: just return the tier matching the points
    return this.getTier(pointsLast12Months);
  }

  pointsToDiscount(points: number, cartHt: number): { pointsUsed: number; discount: number } {
    const rawDiscount = (Math.floor(points / 100) * 5);
    const maxDiscount = cartHt * 0.3;
    const discount = Math.min(rawDiscount, maxDiscount);
    const pointsUsed = Math.floor(discount / 5) * 100;
    return { pointsUsed, discount: Math.round(discount * 100) / 100 };
  }
}
