import { OrderStatus, ProductCategory } from 'src/common/enums';
import { CartService } from 'src/modules/cart/cart.service';
import { InventoryService } from 'src/modules/inventory/inventory.service';
import { OrdersService } from 'src/modules/orders/orders.service';
import { PricingService } from 'src/modules/pricing/pricing.service';

describe('Integration - cart to order lifecycle', () => {
  it('goes through reservation, confirmation, delivery and refund', () => {
    const inventory = new InventoryService();
    const cart = new CartService(inventory);
    const pricing = new PricingService();
    const orders = new OrdersService(inventory);

    inventory.setItem({ productId: 'p1', physicalStock: 10, reservedStock: 0, alertThreshold: 2, available: true });
    const price = pricing.calculate({ category: ProductCategory.ELECTRONICS, basePriceHt: 100, costPrice: 70, quantity: 2, isFlashSale: false });
    cart.upsertItem('u1', 'p1', 2, price.unitTtc);

    orders.create({ id: 'o1', userId: 'u1', status: OrderStatus.PENDING, lines: [{ productId: 'p1', quantity: 2, paidHt: price.totalHt, refundedHt: 0 }], pointsUsed: 200 });
    orders.advanceStatus('o1', OrderStatus.CONFIRMED);
    orders.advanceStatus('o1', OrderStatus.PREPARING);
    orders.advanceStatus('o1', OrderStatus.SHIPPED);
    orders.advanceStatus('o1', OrderStatus.DELIVERED);

    const refund = orders.refund('o1', 'p1', 1);
    expect(refund.refundedHt).toBe(100);
    expect(inventory.getAvailable('p1')).toBe(9);
  });
});
