import { LoyaltyService } from 'src/modules/loyalty/loyalty.service';

describe('LoyaltyService', () => {
  const service = new LoyaltyService();

  it('limits point payment to 30% of cart', () => {
    const res = service.pointsToDiscount(10000, 100);
    expect(res.discount).toBe(30);
    expect(res.pointsUsed).toBe(600);
  });
});
