import { OrderStatus } from 'src/common/enums';
import { InventoryService } from 'src/modules/inventory/inventory.service';
import { OrdersService } from 'src/modules/orders/orders.service';

describe('OrdersService', () => {
  it('prevents cancellation after preparing', () => {
    const inventory = new InventoryService();
    inventory.setItem({ productId: 'p', physicalStock: 20, reservedStock: 2, alertThreshold: 5, available: true });
    const service = new OrdersService(inventory);
    service.create({ id: 'o1', userId: 'u1', status: OrderStatus.PREPARING, lines: [{ productId: 'p', quantity: 2, paidHt: 50, refundedHt: 0 }], pointsUsed: 0 });
    expect(() => service.cancel('o1')).toThrow();
  });
});
