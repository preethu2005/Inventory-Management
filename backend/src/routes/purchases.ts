import { Router } from 'express';
import { body } from 'express-validator';
import prisma from '../config/database';
import { authenticate, requireAdminOrOwner } from '../middleware/auth';
import { generatePurchaseNumber } from '../utils/generators';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication; owner-only restrictions applied per-endpoint
router.use(authenticate);

// GET /api/purchases - List purchase orders
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseWhereInput = {};

    // Filters
    if (req.query.supplier_id) {
      where.supplierId = req.query.supplier_id as string;
    }

    if (req.query.payment_status) {
      where.paymentStatus = req.query.payment_status as any;
    }

    if (req.query.start_date || req.query.end_date) {
      where.purchaseDate = {};
      if (req.query.start_date) {
        where.purchaseDate.gte = new Date(req.query.start_date as string);
      }
      if (req.query.end_date) {
        where.purchaseDate.lte = new Date(req.query.end_date as string);
      }
    }

    // Search
    if (req.query.search) {
      const search = req.query.search as string;
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { supplierName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { purchaseDate: 'desc' },
        include: {
          _count: {
            select: { items: true },
          },
        },
      }),
      prisma.purchase.count({ where }),
    ]);

    const purchasesWithCount = purchases.map((purchase) => ({
      id: purchase.id,
      purchaseNumber: purchase.purchaseNumber,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplierName,
      invoiceNumber: purchase.invoiceNumber,
      invoiceDate: purchase.invoiceDate,
      purchaseDate: purchase.purchaseDate,
      totalAmount: purchase.totalAmount,
      paymentStatus: purchase.paymentStatus,
      paymentAmount: purchase.paymentAmount,
      createdAt: purchase.createdAt,
      createdById: purchase.createdById,
      items_count: purchase._count.items,
    }));

    res.json({
      purchases: purchasesWithCount,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/purchases/:id - Get purchase details with items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        items: true,
      },
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    res.json(purchase);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/purchases - Create new purchase order
router.post(
  '/',
  [
    body('supplier_id').notEmpty().withMessage('Supplier is required'),
    body('invoice_number').notEmpty().withMessage('Invoice number is required'),
    body('invoice_date').notEmpty().withMessage('Invoice date is required'),
    body('purchase_date').notEmpty().withMessage('Purchase date is required'),
    body('payment_status').notEmpty().withMessage('Payment status is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        supplier_id,
        invoice_number,
        invoice_date,
        purchase_date,
        payment_status,
        payment_amount,
        notes,
        items,
      } = req.body;

      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Step 1: Validate supplier exists
        const supplier = await tx.supplier.findUnique({
          where: { id: supplier_id },
        });

        if (!supplier) {
          throw new Error('Supplier not found');
        }

        // Step 2: Validate all items and prepare data
        const purchaseItems = [];
        for (const item of items) {
          const product = await tx.product.findUnique({
            where: { id: item.product_id },
          });

          if (!product) {
            throw new Error(`Product not found: ${item.product_id}`);
          }

          // Calculate quantities
          let quantityBoxes: number;
          let quantityPieces: number;

          if (item.unit_type === 'boxes') {
            quantityBoxes = item.quantity;
            quantityPieces = item.quantity * product.unitsPerBox;
          } else {
            quantityPieces = item.quantity;
            quantityBoxes = item.quantity / product.unitsPerBox;
          }

          // Calculate total price
          const totalPrice = quantityBoxes * item.purchase_price_per_box;

          purchaseItems.push({
            productId: product.id,
            productSku: product.sku,
            productName: product.name,
            quantityBoxes: new Decimal(quantityBoxes),
            quantityPieces: new Decimal(quantityPieces),
            unitsPerBox: product.unitsPerBox,
            purchasePricePerBox: new Decimal(item.purchase_price_per_box),
            totalPrice: new Decimal(totalPrice),
          });
        }

        // Step 3: Calculate total amount
        const totalAmount = purchaseItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);

        // Step 4: Generate purchase number
        const purchaseDate = new Date(purchase_date);
        const purchaseNumber = await generatePurchaseNumber(purchaseDate);

        // Step 5: Create purchase
        const purchase = await tx.purchase.create({
          data: {
            purchaseNumber,
            supplierId: supplier_id,
            supplierName: supplier.name,
            invoiceNumber: invoice_number,
            invoiceDate: new Date(invoice_date),
            purchaseDate,
            totalAmount: new Decimal(totalAmount),
            paymentStatus: payment_status,
            paymentAmount: payment_amount ? new Decimal(payment_amount) : new Decimal(0),
            notes,
            createdById: req.user!.userId,
          },
        });

        // Step 6: Create purchase items and update stock
        for (const item of purchaseItems) {
          await tx.purchaseItem.create({
            data: {
              purchaseId: purchase.id,
              ...item,
            },
          });

          // Update stock (increase)
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStockBoxes: {
                increment: item.quantityBoxes,
              },
            },
          });
        }

        return purchase;
      });

      res.status(201).json({
        message: 'Purchase created successfully',
        purchase: result,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// DELETE /api/purchases/:id - Delete purchase order (Admin/Owner only)
router.delete('/:id', requireAdminOrOwner, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!purchase) {
        throw new Error('Purchase not found');
      }

      // Check if stock can be reversed (would it go negative?)
      for (const item of purchase.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          const newStock = Number(product.currentStockBoxes) - Number(item.quantityBoxes);
          if (newStock < 0) {
            throw new Error(
              `Cannot delete purchase. Would result in negative stock for ${product.name}. Current: ${Number(
                product.currentStockBoxes
              )} boxes, Purchase: ${Number(item.quantityBoxes)} boxes`
            );
          }
        }
      }

      // Reverse stock for each item
      for (const item of purchase.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStockBoxes: {
              decrement: item.quantityBoxes,
            },
            
          },
        });
      }

      // Delete purchase (cascade deletes items)
      await tx.purchase.delete({ where: { id } });
    });
    res.json({ message: 'Purchase deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Purchase not found') {
      return res.status(404).json({ error: 'Purchase not found' });
    }
    if (error.message.includes('Cannot delete purchase')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});
export default router;