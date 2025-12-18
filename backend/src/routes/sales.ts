import { Router } from 'express';
import { body } from 'express-validator';
import prisma from '../config/database';
import { authenticate, requireAdminOrOwner, AuthenticatedRequest } from '../middleware/auth';
import { generateSaleNumber } from '../utils/generators';
import { Prisma, UserRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/sales - List sales transactions
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {};

    // Staff can only see their own sales
    if (req.user?.role === UserRole.staff) {
      where.createdById = req.user.userId;
    }

    // Filters
    if (req.query.customer_id) {
      where.customerId = req.query.customer_id as string;
    }

    if (req.query.payment_method) {
      where.paymentMethod = req.query.payment_method as any;
    }

    if (req.query.payment_status) {
      where.paymentStatus = req.query.payment_status as any;
    }

    if (req.query.start_date || req.query.end_date) {
      where.saleDate = {};
      if (req.query.start_date) {
        where.saleDate.gte = new Date(req.query.start_date as string);
      }
      if (req.query.end_date) {
        where.saleDate.lte = new Date(req.query.end_date as string);
      }
    }

    // Search
    if (req.query.search) {
      const search = req.query.search as string;
      where.OR = [
        { saleNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { saleDate: 'desc' },
        include: {
          _count: {
            select: { items: true },
          },
        },
      }),
      prisma.sale.count({ where }),
    ]);

    const salesWithCount = sales.map((sale) => ({
      id: sale.id,
      saleNumber: sale.saleNumber,
      customerId: sale.customerId,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      saleDate: sale.saleDate,
      totalAmount: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
      createdAt: sale.createdAt,
      createdById: sale.createdById,
      items_count: sale._count.items,
    }));

    res.json({
      sales: salesWithCount,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/sales/:id - Get sale details with items
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
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

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Staff can only view their own sales
    if (req.user?.role === UserRole.staff && sale.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to view this sale' });
    }

    res.json(sale);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/sales - Create new sale
router.post(
  '/',
  [
    body('sale_date').notEmpty().withMessage('Sale date is required'),
    body('payment_method').notEmpty().withMessage('Payment method is required'),
    body('payment_status').notEmpty().withMessage('Payment status is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        customer,
        sale_date,
        discount_amount,
        discount_percentage,
        payment_method,
        payment_status,
        payment_amount,
        notes,
        items,
      } = req.body;

      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Step 1: Handle customer (find or create)
        let customerId: string;
        let customerName: string;
        let customerPhone: string;

        if (customer.id) {
          const existingCustomer = await tx.customer.findUnique({
            where: { id: customer.id },
          });
          if (!existingCustomer) {
            throw new Error('Customer not found');
          }
          customerId = existingCustomer.id;
          customerName = existingCustomer.name;
          customerPhone = existingCustomer.phone;
        } else {
          // Create new customer
          if (!customer.name || !customer.phone) {
            throw new Error('Customer name and phone are required');
          }

          // Check if customer already exists with same name and phone
          const existingCustomer = await tx.customer.findFirst({
            where: {
              name: customer.name,
              phone: customer.phone,
            },
          });

          if (existingCustomer) {
            customerId = existingCustomer.id;
            customerName = existingCustomer.name;
            customerPhone = existingCustomer.phone;
          } else {
            const newCustomer = await tx.customer.create({
              data: {
                name: customer.name,
                phone: customer.phone,
              },
            });
            customerId = newCustomer.id;
            customerName = newCustomer.name;
            customerPhone = newCustomer.phone;
          }
        }

        // Step 2: Validate all items and check stock
        const saleItems = [];
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

          // Check stock availability
          const currentStock = Number(product.currentStockBoxes);
          if (currentStock < quantityBoxes) {
            const availablePieces = currentStock * product.unitsPerBox;
            throw new Error(
              `Insufficient stock for ${product.name}. Available: ${availablePieces} pieces, Required: ${quantityPieces} pieces`
            );
          }

          // Calculate price
          let totalPrice: number;
          const sellingPricePerBox = item.selling_price_per_box || Number(product.sellingPricePerBox || 0);
          const sellingPricePerPiece = item.selling_price_per_piece || Number(product.sellingPricePerPiece || 0);

          if (item.unit_type === 'boxes') {
            totalPrice = quantityBoxes * sellingPricePerBox;
          } else {
            totalPrice = quantityPieces * sellingPricePerPiece;
          }

          saleItems.push({
            productId: product.id,
            productSku: product.sku,
            productName: product.name,
            quantityBoxes: new Decimal(quantityBoxes),
            quantityPieces: new Decimal(quantityPieces),
            unitsPerBox: product.unitsPerBox,
            sellingPricePerBox: item.selling_price_per_box ? new Decimal(item.selling_price_per_box) : product.sellingPricePerBox,
            sellingPricePerPiece: item.selling_price_per_piece ? new Decimal(item.selling_price_per_piece) : product.sellingPricePerPiece,
            totalPrice: new Decimal(totalPrice),
          });
        }

        // Step 3: Calculate totals
        const subtotal = saleItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
        let discountAmt = discount_amount || 0;

        if (discount_percentage) {
          discountAmt = (subtotal * discount_percentage) / 100;
        }

        const totalAmount = subtotal - discountAmt;

        // Step 4: Generate sale number
        const saleDate = new Date(sale_date);
        const saleNumber = await generateSaleNumber(saleDate);

        // Step 5: Create sale
        const sale = await tx.sale.create({
          data: {
            saleNumber,
            customerId,
            customerName,
            customerPhone,
            saleDate,
            subtotal: new Decimal(subtotal),
            discountAmount: new Decimal(discountAmt),
            discountPercentage: discount_percentage ? new Decimal(discount_percentage) : null,
            totalAmount: new Decimal(totalAmount),
            paymentMethod: payment_method,
            paymentStatus: payment_status,
            paymentAmount: payment_amount ? new Decimal(payment_amount) : new Decimal(totalAmount),
            notes,
            createdById: req.user!.userId,
          },
        });

        // Step 6: Create sale items and update stock
        for (const item of saleItems) {
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              ...item,
            },
          });

          // Update stock
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStockBoxes: {
                decrement: item.quantityBoxes,
              },
            },
          });
        }

        // Step 7: Update customer total purchases
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalPurchases: {
              increment: new Decimal(totalAmount),
            },
          },
        });

        return sale;
      });

      res.status(201).json({
        message: 'Sale created successfully',
        sale: result,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// DELETE /api/sales/:id - Delete sale (Admin/Owner only)
router.delete('/:id', requireAdminOrOwner, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!sale) {
        throw new Error('Sale not found');
      }

      // Reverse stock for each item
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStockBoxes: {
              increment: item.quantityBoxes,
            },
          },
        });
      }

      // Update customer total purchases
      await tx.customer.update({
        where: { id: sale.customerId },
        data: {
          totalPurchases: {
            decrement: sale.totalAmount,
          },
        },
      });

      // Delete sale (cascade deletes items)
      await tx.sale.delete({ where: { id } });
    });

    res.json({ message: 'Sale deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Sale not found') {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.status(400).json({ error: error.message });
  }
});

export default router;
