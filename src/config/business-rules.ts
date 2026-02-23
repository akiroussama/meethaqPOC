import { LoyaltyTier, ProductCategory, ShippingZone } from 'src/common/enums';

export const VAT_BY_CATEGORY: Record<ProductCategory, number> = {
  [ProductCategory.ELECTRONICS]: 0.2,
  [ProductCategory.FOOD]: 0.055,
  [ProductCategory.BOOKS]: 0.055,
  [ProductCategory.CLOTHING]: 0.2,
  [ProductCategory.HYGIENE]: 0.2,
  [ProductCategory.MEDICINE]: 0.1,
  [ProductCategory.ESSENTIALS]: 0.055
};

export const QUANTITY_DISCOUNT_THRESHOLDS = [
  { min: 100, discount: 0.15 },
  { min: 50, discount: 0.1 },
  { min: 10, discount: 0.05 }
];

export const CART_RULES = {
  maxDistinctItems: 50,
  maxUnitsPerItem: 99,
  expirationMinutes: 30
};

export const SHIPPING_ZONE_MULTIPLIER: Record<ShippingZone, number> = {
  [ShippingZone.FRANCE_METRO]: 1,
  [ShippingZone.CORSE]: 1.3,
  [ShippingZone.DOM_TOM]: 1.8,
  [ShippingZone.EUROPE]: 1.5,
  [ShippingZone.INTERNATIONAL]: 2.2
};

export const LOYALTY_TIER_CONFIG: Record<
  LoyaltyTier,
  { min: number; max: number; shippingDiscount: number; orderDiscount: number; freeShipping: boolean }
> = {
  [LoyaltyTier.BRONZE]: { min: 0, max: 499, shippingDiscount: 0, orderDiscount: 0, freeShipping: false },
  [LoyaltyTier.SILVER]: { min: 500, max: 1999, shippingDiscount: 0.2, orderDiscount: 0, freeShipping: false },
  [LoyaltyTier.GOLD]: { min: 2000, max: 4999, shippingDiscount: 1, orderDiscount: 0.05, freeShipping: true },
  [LoyaltyTier.PLATINUM]: { min: 5000, max: Number.MAX_SAFE_INTEGER, shippingDiscount: 1, orderDiscount: 0.1, freeShipping: true }
};
