import { CartService } from 'src/modules/cart/cart.service';
import { InventoryService } from 'src/modules/inventory/inventory.service';

describe('CartService', () => {
  it('reserves and releases stock when cart expires', () => {
    const inventory = new InventoryService();
    inventory.setItem({ productId: 'p1', physicalStock: 5, reservedStock: 0, alertThreshold: 2, available: true });
    const service = new CartService(inventory);

    service.upsertItem('u1', 'p1', 2, 10, new Date('2026-01-01T10:00:00Z'));
    expect(inventory.getAvailable('p1')).toBe(3);

    service.upsertItem('u1', 'p1', 1, 10, new Date('2026-01-01T10:31:00Z'));
    expect(inventory.getAvailable('p1')).toBe(4);
  });
});
