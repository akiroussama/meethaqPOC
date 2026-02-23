import { Injectable } from '@nestjs/common';

export interface InventoryItem {
  productId: string;
  physicalStock: number;
  reservedStock: number;
  alertThreshold: number;
  available: boolean;
}

@Injectable()
export class InventoryService {
  private inventory = new Map<string, InventoryItem>();

  setItem(item: InventoryItem): void {
    this.inventory.set(item.productId, item);
  }

  reserve(productId: string, quantity: number): boolean {
    const item = this.mustGet(productId);
    if (item.physicalStock - item.reservedStock < quantity) return false;
    item.reservedStock += quantity;
    return true;
  }

  release(productId: string, quantity: number): void {
    const item = this.mustGet(productId);
    item.reservedStock = Math.max(0, item.reservedStock - quantity);
  }

  confirmStock(productId: string, quantity: number): void {
    const item = this.mustGet(productId);
    item.physicalStock = Math.max(0, item.physicalStock - quantity);
    item.reservedStock = Math.max(0, item.reservedStock - quantity);
    item.available = item.physicalStock > 0;
  }

  restock(productId: string, quantity: number): void {
    const item = this.mustGet(productId);
    item.physicalStock += quantity;
    if (item.physicalStock > 0) item.available = true;
  }

  getAvailable(productId: string): number {
    const item = this.mustGet(productId);
    return item.physicalStock - item.reservedStock;
  }

  isLowStock(productId: string): boolean {
    const item = this.mustGet(productId);
    return item.physicalStock <= item.alertThreshold;
  }

  private mustGet(productId: string): InventoryItem {
    const item = this.inventory.get(productId);
    if (!item) throw new Error(`Unknown product ${productId}`);
    return item;
  }
}
