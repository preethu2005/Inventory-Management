import { Router } from 'express';
import { body } from 'express-validator';
import prisma from '../config/database';
import { authenticate, requireAdminOrOwner } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const router = Router();

// All routes require authentication; creation restricted to owner
router.use(authenticate);

// GET /api/suppliers - List suppliers (staff can view)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {};

    // Search
    if (req.query.search) {
      const search = req.query.search as string;
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          contactPerson: true,
          phone: true,
          email: true,
          createdAt: true,
        },
      }),
      prisma.supplier.count({ where }),
    ]);

    res.json({
      suppliers,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/suppliers/autocomplete - Autocomplete search for suppliers (staff can view)
router.get('/autocomplete', async (req, res) => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suppliers = await prisma.supplier.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' },
      },
      take: 10,
      select: {
        id: true,
        name: true,
      },
    });

    res.json({ suggestions: suppliers });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/suppliers - Create new supplier (Admin/Owner only)
router.post(
  '/',
  requireAdminOrOwner,
  [body('name').notEmpty().withMessage('Supplier name is required')],
  async (req, res) => {
    try {
      const { name, contact_person, phone, email, address, notes } = req.body;

      const supplier = await prisma.supplier.create({
        data: {
          name,
          contactPerson: contact_person,
          phone,
          email,
          address,
          notes,
        },
      });

      res.status(201).json({
        message: 'Supplier created successfully',
        supplier,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
