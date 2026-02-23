import { LoyaltyTier, ShippingZone } from 'src/common/enums';
import { ShippingService } from 'src/modules/shipping/shipping.service';

describe('ShippingService', () => {
  const service = new ShippingService();

  it('applies free shipping for GOLD', () => {
    const fee = service.calculate(ShippingZone.INTERNATIONAL, [{ quantity: 1, unitWeightKg: 2, domesticOnly: false }], 20, LoyaltyTier.GOLD);
    expect(fee).toBe(0);
  });
});
