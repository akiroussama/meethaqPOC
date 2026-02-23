import { ProductCategory } from 'src/common/enums';
import { PricingService } from 'src/modules/pricing/pricing.service';

describe('PricingService', () => {
  const service = new PricingService();

  it('applies quantity discount before VAT', () => {
    const result = service.calculate({ category: ProductCategory.ELECTRONICS, basePriceHt: 100, costPrice: 60, quantity: 10, isFlashSale: false });
    expect(result.unitHt).toBe(95);
    expect(result.unitTtc).toBe(114);
  });

  it('never goes below cost price', () => {
    const result = service.calculate({ category: ProductCategory.ELECTRONICS, basePriceHt: 50, costPrice: 49, quantity: 100, isFlashSale: false });
    expect(result.unitHt).toBe(49);
  });

  it('disables quantity discount during flash sale', () => {
    const result = service.calculate({ category: ProductCategory.FOOD, basePriceHt: 50, costPrice: 30, quantity: 55, isFlashSale: true, flashPriceHt: 35 });
    expect(result.appliedQuantityDiscount).toBe(0);
    expect(result.unitHt).toBe(35);
  });
});
