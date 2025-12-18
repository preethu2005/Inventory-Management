import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req: AuthenticatedRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build where clause for today's sales
    const salesWhere: any = {
      saleDate: {
        gte: today,
      },
    };

    // Staff only sees their own sales
    if (req.user?.role === UserRole.staff) {
      salesWhere.createdById = req.user.userId;
    }

    // Today's sales stats
    const todaySales = await prisma.sale.aggregate({
      where: salesWhere,
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    const pendingPayments = await prisma.sale.aggregate({
      where: {
        ...salesWhere,
        paymentStatus: 'Pending',
      },
      _sum: {
        totalAmount: true,
      },
    });

    // Monthly sales/purchases summary
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlySales = await prisma.sale.aggregate({
      where: {
        saleDate: { gte: monthStart },
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    const monthlyPurchases = await prisma.purchase.aggregate({
      where: {
        purchaseDate: { gte: monthStart },
      },
      _sum: { totalAmount: true },
      _count: true,
    });

    // Stock overview
    const totalProducts = await prisma.product.count({
      where: { isActive: true },
    });

    const inStockCount = await prisma.product.count({
      where: {
        isActive: true,
        currentStockBoxes: { gt: 0 },
      },
    });

    // Low stock alerts - products where current < 10 boxes
    const lowStockProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        currentStockBoxes: { lt: 10 },
        lowStockIgnored: { not: true },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStockBoxes: true,
        unitsPerBox: true,
        lowStockIgnored: true,
      },
    });

    const lowStockAlerts = lowStockProducts.map((p) => ({
        product_id: p.id,
        name: p.name,
        sku: p.sku,
        current_stock_boxes: Number(p.currentStockBoxes),
        total_pieces: Number(p.currentStockBoxes) * p.unitsPerBox,
      minimum_stock_boxes: 10,
      }));

    res.json({
      today_sales: {
        total_revenue: Number(todaySales._sum.totalAmount || 0),
        transaction_count: todaySales._count,
        pending_payments: Number(pendingPayments._sum.totalAmount || 0),
      },
      stock_overview: {
        total_products: totalProducts,
        in_stock_count: inStockCount,
        low_stock_count: lowStockAlerts.length,
      },
      month_summary: {
        sales_amount: Number(monthlySales._sum.totalAmount || 0),
        sales_count: monthlySales._count,
        purchases_amount: Number(monthlyPurchases._sum.totalAmount || 0),
        purchases_count: monthlyPurchases._count,
        net: Number(monthlySales._sum.totalAmount || 0) - Number(monthlyPurchases._sum.totalAmount || 0),
      },
      low_stock_alerts: lowStockAlerts,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
