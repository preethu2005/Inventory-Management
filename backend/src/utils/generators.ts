import prisma from '../config/database';

export const generateSKU = async (): Promise<string> => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const sku = `PROD-${timestamp}-${random}`;

  // Check uniqueness
  const existing = await prisma.product.findUnique({ where: { sku } });
  if (existing) {
    return generateSKU(); // Retry if collision
  }

  return sku;
};

export const generateSaleNumber = async (date: Date): Promise<string> => {
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');

  // Find the last sale number for this date
  const lastSale = await prisma.sale.findFirst({
    where: {
      saleNumber: {
        startsWith: `SAL-${dateStr}-`,
      },
    },
    orderBy: {
      saleNumber: 'desc',
    },
  });

  let sequence = 1;
  if (lastSale) {
    const lastSequence = parseInt(lastSale.saleNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const sequenceStr = sequence.toString().padStart(4, '0');
  return `SAL-${dateStr}-${sequenceStr}`;
};

export const generatePurchaseNumber = async (date: Date): Promise<string> => {
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');

  // Find the last purchase number for this date
  const lastPurchase = await prisma.purchase.findFirst({
    where: {
      purchaseNumber: {
        startsWith: `PUR-${dateStr}-`,
      },
    },
    orderBy: {
      purchaseNumber: 'desc',
    },
  });

  let sequence = 1;
  if (lastPurchase) {
    const lastSequence = parseInt(lastPurchase.purchaseNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const sequenceStr = sequence.toString().padStart(4, '0');
  return `PUR-${dateStr}-${sequenceStr}`;
};
