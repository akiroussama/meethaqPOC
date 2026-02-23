import { BadRequestException, Injectable } from '@nestjs/common';
import { ProductCategory, PromotionType } from 'src/common/enums';

export interface PromoCode {
  code: string;
  type: PromotionType;
  value: number;
  minCartHt: number;
  eligibleCategories?: ProductCategory[];
  startsAt: Date;
  endsAt: Date;
  maxGlobalUses: number;
  maxUsesPerUser: number;
  stackable: boolean;
  globalUses: number;
  userUses: number;
}

@Injectable()
export class PromotionsService {
  validatePromo(code: PromoCode, cartHt: number, categories: ProductCategory[], at: Date): void {
    if (at < code.startsAt || at > code.endsAt) throw new BadRequestException('Promo expired or not active');
    if (cartHt < code.minCartHt) throw new BadRequestException('Minimum cart amount not reached');
    if (code.globalUses >= code.maxGlobalUses) throw new BadRequestException('Promo max usage reached');
    if (code.userUses >= code.maxUsesPerUser) throw new BadRequestException('Promo user max usage reached');
    if (code.eligibleCategories && !categories.some((cat) => code.eligibleCategories?.includes(cat))) {
      throw new BadRequestException('Promo not eligible for cart categories');
    }
    if (code.type === PromotionType.PERCENTAGE && code.value > 50) {
      throw new BadRequestException('Percentage discount cannot exceed 50%');
    }
  }

  applyPromo(code: PromoCode, cartHt: number): { discountHt: number; freeShipping: boolean; totalAfterDiscountHt: number } {
    if (code.type === PromotionType.FREE_SHIPPING) {
      return { discountHt: 0, freeShipping: true, totalAfterDiscountHt: cartHt };
    }

    let discount = 0;
    if (code.type === PromotionType.PERCENTAGE) discount = (cartHt * code.value) / 100;
    if (code.type === PromotionType.FIXED_AMOUNT) discount = code.value;

    const totalAfterDiscountHt = Math.max(0, cartHt - discount);
    return {
      discountHt: Math.min(discount, cartHt),
      freeShipping: false,
      totalAfterDiscountHt
    };
  }
}
