import { Injectable } from '@nestjs/common';
import { ProductCategory } from 'src/common/enums';
import { QUANTITY_DISCOUNT_THRESHOLDS, VAT_BY_CATEGORY } from 'src/config/business-rules';

export interface PriceInput {
  category: ProductCategory;
  basePriceHt: number;
  costPrice: number;
  quantity: number;
  isFlashSale: boolean;
  flashPriceHt?: number;
}

export interface PriceBreakdown {
  unitHt: number;
  unitTtc: number;
  totalHt: number;
  totalTtc: number;
  vatRate: number;
  appliedQuantityDiscount: number;
}

@Injectable()
export class PricingService {
  calculate(input: PriceInput): PriceBreakdown {
    const vatRate = VAT_BY_CATEGORY[input.category];
    const quantityDiscount = input.isFlashSale ? 0 : this.getQuantityDiscount(input.quantity);

    let unitHt = input.basePriceHt * (1 - quantityDiscount);
    if (input.isFlashSale && input.flashPriceHt) {
      unitHt = input.flashPriceHt;
    }

    const minAllowedHt = input.costPrice;
    unitHt = Math.max(unitHt, minAllowedHt);

    const unitTtc = this.round(unitHt * (1 + vatRate));
    const totalHt = this.round(unitHt * input.quantity);
    const totalTtc = this.round(unitTtc * input.quantity);

    return {
      unitHt: this.round(unitHt),
      unitTtc,
      totalHt,
      totalTtc,
      vatRate,
      appliedQuantityDiscount: quantityDiscount
    };
  }

  private getQuantityDiscount(quantity: number): number {
    const threshold = QUANTITY_DISCOUNT_THRESHOLDS.find((tier) => quantity >= tier.min);
    return threshold?.discount ?? 0;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
