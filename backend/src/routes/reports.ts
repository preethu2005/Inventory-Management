import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, requireAdminOrOwner, AuthenticatedRequest } from '../middleware/auth';
import { Prisma, UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/reports/stock - Stock report with filters
router.get('/stock', async (req: AuthenticatedRequest, res) => {
  try {
    // Use same filtering logic as products endpoint
    const where: Prisma.ProductWhereInput = { isActive: true };

    // Apply filters (same as products route)
    if (req.query.search) {
      const search = req.query.search as string;
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (req.query.company) {
      const companies = (req.query.company as string).split(',');
      where.company = { in: companies };
    }

    if (req.query.size) {
      const sizes = (req.query.size as string).split(',');
      where.size = { in: sizes };
    }

    if (req.query.finish_type) {
      const finishTypes = (req.query.finish_type as string).split(',') as any;
      where.finishType = { in: finishTypes };
    }

    if (req.query.category) {
      const categories = (req.query.category as string).split(',');
      where.category = { in: categories };
    }

    if (req.query.stock_status) {
      const status = req.query.stock_status as string;
      if (status === 'in_stock') {
        where.currentStockBoxes = { gt: 0 };
      } else if (status === 'out_of_stock') {
        where.currentStockBoxes = { equals: 0 };
      } else if (status === 'low_stock') {
        where.AND = [{ currentStockBoxes: { gt: 0 } }, { minimumStockBoxes: { gt: 0 } }];
      }
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        sku: true,
        name: true,
        company: true,
        size: true,
        finishType: true,
        category: true,
        unitsPerBox: true,
        currentStockBoxes: true,
        minimumStockBoxes: true,
        sellingPricePerBox: true,
        purchasePricePerBox: req.user?.role === UserRole.owner,
      },
      orderBy: { name: 'asc' },
    });

    // Calculate computed fields
    const productsWithComputed = products
      .map((p: any) => ({
        ...p,
        total_pieces: Number(p.currentStockBoxes) * p.unitsPerBox,
        is_low_stock: p.minimumStockBoxes > 0 && Number(p.currentStockBoxes) < Number(p.minimumStockBoxes),
        stock_value: req.user?.role === UserRole.owner && p.purchasePricePerBox
          ? Number(p.currentStockBoxes) * Number(p.purchasePricePerBox)
          : null,
      }))
      .filter((p) => {
        if (req.query.stock_status === 'low_stock') {
          return p.is_low_stock;
        }
        return true;
      });

    // Calculate summary
    const inStockCount = productsWithComputed.filter((p) => Number(p.currentStockBoxes) > 0).length;
    const lowStockCount = productsWithComputed.filter((p) => p.is_low_stock).length;
    const outOfStockCount = productsWithComputed.filter((p) => Number(p.currentStockBoxes) === 0).length;

    const totalStockValue =
      req.user?.role === UserRole.owner
        ? productsWithComputed.reduce((sum, p) => sum + (p.stock_value || 0), 0)
        : null;

    res.json({
      products: productsWithComputed,
      summary: {
        total_products: productsWithComputed.length,
        total_stock_value: totalStockValue,
        in_stock_count: inStockCount,
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/reports/sales - Sales summary report
router.get('/sales', async (req: AuthenticatedRequest, res) => {
  try {
    // Calculate date range
    let startDate: Date;
    let endDate: Date = new Date();

    const period = req.query.period as string;

    if (period === 'today') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'custom') {
      if (!req.query.start_date || !req.query.end_date) {
        return res.status(400).json({ error: 'start_date and end_date are required for custom period' });
      }
      startDate = new Date(req.query.start_date as string);
      endDate = new Date(req.query.end_date as string);
    } else {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const where: Prisma.SaleWhereInput = {
      saleDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Staff only sees their own sales
    if (req.user?.role === UserRole.staff) {
      where.createdById = req.user.userId;
    }

    // Get sales data
    const [salesSummary, paymentBreakdown, sales] = await Promise.all([
      prisma.sale.aggregate({
        where,
        _sum: {
          totalAmount: true,
        },
        _count: true,
      }),
      prisma.sale.groupBy({
        by: ['paymentMethod'],
        where,
        _sum: {
          totalAmount: true,
        },
      }),
      prisma.sale.findMany({
        where,
        orderBy: { saleDate: 'desc' },
        select: {
          id: true,
          saleNumber: true,
          customerName: true,
          saleDate: true,
          totalAmount: true,
          paymentMethod: true,
          paymentStatus: true,
        },
      }),
    ]);

    // Get pending payments
    const pendingPayments = await prisma.sale.aggregate({
      where: {
        ...where,
        paymentStatus: 'Pending',
      },
      _sum: {
        totalAmount: true,
      },
    });

    // Get top products
    const topProductsData = await prisma.saleItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        sale: where,
      },
      _sum: {
        quantityPieces: true,
        totalPrice: true,
      },
      orderBy: {
        _sum: {
          totalPrice: 'desc',
        },
      },
      take: 10,
    });

    const topProducts = topProductsData.map((item) => ({
      product_id: item.productId,
      product_name: item.productName,
      quantity_sold: Number(item._sum.quantityPieces || 0),
      revenue: Number(item._sum.totalPrice || 0),
    }));

    // Payment breakdown
    const paymentBreakdownObj: any = {
      Cash: 0,
      Card: 0,
      UPI: 0,
      Credit: 0,
    };

    paymentBreakdown.forEach((item) => {
      paymentBreakdownObj[item.paymentMethod] = Number(item._sum.totalAmount || 0);
    });

    const totalRevenue = Number(salesSummary._sum.totalAmount || 0);
    const transactionCount = salesSummary._count;

    res.json({
      summary: {
        total_sales: totalRevenue,
        total_revenue: totalRevenue,
        transaction_count: transactionCount,
        average_sale_value: transactionCount > 0 ? totalRevenue / transactionCount : 0,
        pending_payments_total: Number(pendingPayments._sum.totalAmount || 0),
      },
      payment_breakdown: paymentBreakdownObj,
      top_products: topProducts,
      transactions: sales,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/reports/purchases - Purchase history report (Owner only)
router.get('/purchases', requireAdminOrOwner, async (req, res) => {
  try {
    // Calculate date range
    let startDate: Date;
    let endDate: Date = new Date();

    const period = req.query.period as string;

    if (period === 'today') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'custom') {
      if (!req.query.start_date || !req.query.end_date) {
        return res.status(400).json({ error: 'start_date and end_date are required for custom period' });
      }
      startDate = new Date(req.query.start_date as string);
      endDate = new Date(req.query.end_date as string);
    } else {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const where: Prisma.PurchaseWhereInput = {
      purchaseDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Additional filters
    if (req.query.supplier_id) {
      where.supplierId = req.query.supplier_id as string;
    }

    if (req.query.payment_status) {
      where.paymentStatus = req.query.payment_status as any;
    }

    const [purchaseSummary, purchases] = await Promise.all([
      prisma.purchase.aggregate({
        where,
        _sum: {
          totalAmount: true,
          paymentAmount: true,
        },
        _count: true,
      }),
      prisma.purchase.findMany({
        where,
        orderBy: { purchaseDate: 'desc' },
        select: {
          id: true,
          purchaseNumber: true,
          supplierName: true,
          invoiceNumber: true,
          purchaseDate: true,
          totalAmount: true,
          paymentStatus: true,
          paymentAmount: true,
        },
      }),
    ]);

    const totalAmount = Number(purchaseSummary._sum.totalAmount || 0);
    const paidAmount = Number(purchaseSummary._sum.paymentAmount || 0);
    const pendingAmount = totalAmount - paidAmount;

    res.json({
      summary: {
        total_purchases: purchaseSummary._count,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        pending_amount: pendingAmount,
      },
      purchases,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
