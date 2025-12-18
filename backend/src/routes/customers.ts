import { Router } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/customers - List customers with search
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    // Search
    if (req.query.search) {
      const search = req.query.search as string;
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          totalPurchases: true,
          createdAt: true,
        },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      customers,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/customers/autocomplete - Autocomplete search for customers
router.get('/autocomplete', async (req, res) => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    res.json({ suggestions: customers });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/customers/:id - Get customer details with purchase history
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          take: 10,
          orderBy: { saleDate: 'desc' },
          select: {
            id: true,
            saleNumber: true,
            saleDate: true,
            totalAmount: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({
      ...customer,
      recent_sales: customer.sales,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
