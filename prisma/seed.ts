import { PrismaClient, ProductCategory, PromotionType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.promotionCode.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const pwd = await bcrypt.hash('Password123!', 10);

  const users = await Promise.all([
    prisma.user.create({ data: { email: 'customer@example.com', passwordHash: pwd, role: UserRole.CUSTOMER } }),
    prisma.user.create({ data: { email: 'manager@example.com', passwordHash: pwd, role: UserRole.MANAGER } }),
    prisma.user.create({ data: { email: 'admin@example.com', passwordHash: pwd, role: UserRole.ADMIN } })
  ]);

  const categories = [
    ProductCategory.ELECTRONICS,
    ProductCategory.FOOD,
    ProductCategory.BOOKS,
    ProductCategory.CLOTHING,
    ProductCategory.HYGIENE,
    ProductCategory.MEDICINE
  ];

  const products = [] as { id: string }[];
  for (let i = 0; i < 36; i += 1) {
    const category = categories[i % categories.length];
    const product = await prisma.product.create({
      data: {
        sku: `SKU-${String(i + 1).padStart(4, '0')}`,
        name: `${category}-Product-${i + 1}`,
        category,
        priceHt: 10 + i,
        costPrice: 5 + i * 0.7,
        weightKg: 0.4 + (i % 8) * 0.25,
        domesticOnly: i % 10 === 0,
        stockAlertLevel: 10
      }
    });

    await prisma.inventory.create({
      data: {
        productId: product.id,
        physicalStock: 40 + i,
        flashStockLimit: i < 2 ? 10 : null
      }
    });

    products.push({ id: product.id });
  }

  const now = new Date();
  await prisma.promotionCode.createMany({
    data: [
      { code: 'WELCOME15', type: PromotionType.PERCENTAGE, value: 15, minCartHt: 50, startsAt: now, endsAt: new Date(now.getTime() + 7 * 86400000), maxGlobalUses: 2000, maxUsesPerUser: 1, stackable: false },
      { code: 'ELEC10', type: PromotionType.FIXED_AMOUNT, value: 10, minCartHt: 80, startsAt: now, endsAt: new Date(now.getTime() + 15 * 86400000), maxGlobalUses: 1000, maxUsesPerUser: 2, stackable: true },
      { code: 'SHIPFREE', type: PromotionType.FREE_SHIPPING, value: 0, minCartHt: 30, startsAt: now, endsAt: new Date(now.getTime() + 30 * 86400000), maxGlobalUses: 4000, maxUsesPerUser: 3, stackable: true },
      { code: 'FLASH20', type: PromotionType.PERCENTAGE, value: 20, minCartHt: 100, startsAt: now, endsAt: new Date(now.getTime() + 2 * 86400000), maxGlobalUses: 500, maxUsesPerUser: 1, stackable: false },
      { code: 'SAVE5', type: PromotionType.FIXED_AMOUNT, value: 5, minCartHt: 20, startsAt: now, endsAt: new Date(now.getTime() + 60 * 86400000), maxGlobalUses: 10000, maxUsesPerUser: 10, stackable: true }
    ]
  });

  await prisma.order.create({
    data: {
      userId: users[0].id,
      status: 'DELIVERED',
      subtotalHt: 220,
      shippingHt: 0,
      totalPaidTtc: 264,
      pointsUsed: 200,
      deliveredAt: new Date(now.getTime() - 5 * 86400000),
      lines: {
        create: [
          { productId: products[0].id, quantity: 2, unitPriceHt: 60, paidHt: 120 },
          { productId: products[1].id, quantity: 5, unitPriceHt: 20, paidHt: 100 }
        ]
      }
    }
  });
}

main().finally(async () => prisma.$disconnect());
