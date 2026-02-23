import { PromotionType } from 'src/common/enums';
import { PromotionsService } from 'src/modules/promotions/promotions.service';

describe('PromotionsService', () => {
  const service = new PromotionsService();

  it('caps fixed discount so cart is never negative', () => {
    const res = service.applyPromo(
      { code: 'A', type: PromotionType.FIXED_AMOUNT, value: 100, minCartHt: 0, startsAt: new Date(0), endsAt: new Date('2100-01-01'), maxGlobalUses: 1, maxUsesPerUser: 1, stackable: false, globalUses: 0, userUses: 0 },
      30
    );
    expect(res.totalAfterDiscountHt).toBe(0);
  });
});
