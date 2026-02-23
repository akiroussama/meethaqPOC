import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus } from 'src/common/enums';
import { InventoryService } from 'src/modules/inventory/inventory.service';

export interface OrderLine {
  productId: string;
  quantity: number;
  paidHt: number;
  refundedHt: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  lines: OrderLine[];
  deliveredAt?: Date;
  pointsUsed: number;
}

@Injectable()
export class OrdersService {
  private orders = new Map<string, Order>();

  constructor(private readonly inventoryService: InventoryService) {}

  create(order: Order): void {
    this.orders.set(order.id, order);
  }

  advanceStatus(orderId: string, next: OrderStatus): Order {
    const order = this.mustGet(orderId);
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING],
      [OrderStatus.PREPARING]: [OrderStatus.SHIPPED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: []
    };

    if (!allowed[order.status].includes(next)) throw new BadRequestException('Invalid status transition');
    if (next === OrderStatus.CONFIRMED) {
      for (const line of order.lines) this.inventoryService.confirmStock(line.productId, line.quantity);
    }
    if (next === OrderStatus.DELIVERED) order.deliveredAt = new Date();
    order.status = next;
    return order;
  }

  cancel(orderId: string): void {
    const order = this.mustGet(orderId);
    if (![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)) {
      throw new BadRequestException('Cancellation not allowed');
    }
    for (const line of order.lines) this.inventoryService.release(line.productId, line.quantity);
    order.status = OrderStatus.CANCELLED;
  }

  refund(orderId: string, productId: string, quantity: number, now = new Date()): { refundedHt: number; pointsToCredit: number } {
    const order = this.mustGet(orderId);
    if (order.status !== OrderStatus.DELIVERED || !order.deliveredAt) throw new BadRequestException('Refund only for delivered orders');
    const days = (now.getTime() - order.deliveredAt.getTime()) / 86400000;
    if (days > 30) throw new BadRequestException('Refund delay exceeded');

    const line = order.lines.find((x) => x.productId === productId);
    if (!line) throw new BadRequestException('Line not found');

    const maxRefundable = line.paidHt - line.refundedHt;
    const requested = (line.paidHt / line.quantity) * quantity;
    if (requested > maxRefundable) throw new BadRequestException('Refund exceeds paid amount');

    line.refundedHt += requested;
    this.inventoryService.restock(productId, quantity);
    const pointsToCredit = Math.floor((order.pointsUsed * requested) / Math.max(1, order.lines.reduce((s, l) => s + l.paidHt, 0)));
    return { refundedHt: Math.round(requested * 100) / 100, pointsToCredit };
  }

  private mustGet(orderId: string): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    return order;
  }
}
