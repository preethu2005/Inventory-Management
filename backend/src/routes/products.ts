import { Router } from 'express';
import { body } from 'express-validator';
import prisma from '../config/database';
import { authenticate, requireOwner, requireAdminOrOwner, AuthenticatedRequest } from '../middleware/auth';
import { generateSKU } from '../utils/generators';
import { FinishType, Grade, Prisma, UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/products - List products with search and filters
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { isActive: true };

    // Search
    if (req.query.search) {
      const search = req.query.search as string;
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filters
    if (req.query.company) {
      const companies = (req.query.company as string).split(',');
      where.company = { in: companies };
    }

    if (req.query.size) {
      const sizes = (req.query.size as string).split(',');
      where.size = { in: sizes };
    }

    if (req.query.finish_type) {
      const finishTypes = (req.query.finish_type as string).split(',') as FinishType[];
      where.finishType = { in: finishTypes };
    }

    if (req.query.color) {
      const colors = (req.query.color as string).split(',');
      where.color = { in: colors };
    }

    if (req.query.thickness) {
      where.thickness = parseFloat(req.query.thickness as string);
    }

    if (req.query.grade) {
      const grades = (req.query.grade as string).split(',') as Grade[];
      where.grade = { in: grades };
    }

    if (req.query.category) {
      const categories = (req.query.category as string).split(',');
      where.category = { in: categories };
    }

    // Stock status filter
    if (req.query.stock_status) {
      const status = req.query.stock_status as string;
      if (status === 'in_stock') {
        where.currentStockBoxes = { gt: 0 };
      } else if (status === 'out_of_stock') {
        where.currentStockBoxes = { equals: 0 };
      } else if (status === 'low_stock') {
        where.AND = [
          { currentStockBoxes: { gt: 0 } },
          { minimumStockBoxes: { gt: 0 } },
        ];
      }
    }

    // Price range filter
    if (req.query.min_price) {
      where.sellingPricePerBox = { ...where.sellingPricePerBox, gte: parseFloat(req.query.min_price as string) };
    }
    if (req.query.max_price) {
      where.sellingPricePerBox = { ...where.sellingPricePerBox, lte: parseFloat(req.query.max_price as string) };
    }

    // Sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (req.query.sort_by) {
      const sortBy = req.query.sort_by as string;
      switch (sortBy) {
        case 'name_asc':
          orderBy = { name: 'asc' };
          break;
        case 'name_desc':
          orderBy = { name: 'desc' };
          break;
        case 'stock_asc':
          orderBy = { currentStockBoxes: 'asc' };
          break;
        case 'stock_desc':
          orderBy = { currentStockBoxes: 'desc' };
          break;
        case 'price_asc':
          orderBy = { sellingPricePerBox: 'asc' };
          break;
        case 'price_desc':
          orderBy = { sellingPricePerBox: 'desc' };
          break;
        case 'recent':
          orderBy = { createdAt: 'desc' };
          break;
      }
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          sku: true,
          name: true,
          size: true,
          company: true,
          finishType: true,
          color: true,
          thickness: true,
          grade: true,
          category: true,
          unitsPerBox: true,
          currentStockBoxes: true,
          minimumStockBoxes: true,
          sellingPricePerBox: true,
          sellingPricePerPiece: true,
          imageUrl: true,
          createdAt: true,
          // Hide purchase price from staff
          purchasePricePerBox: req.user?.role === UserRole.owner,
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Calculate computed fields and apply low stock filter if needed
    const productsWithComputed = products
      .map((p: any) => ({
        ...p,
        total_pieces: Number(p.currentStockBoxes) * p.unitsPerBox,
        is_low_stock: p.minimumStockBoxes > 0 && Number(p.currentStockBoxes) < Number(p.minimumStockBoxes),
      }))
      .filter((p) => {
        // Apply low stock filter after computed field calculation
        if (req.query.stock_status === 'low_stock') {
          return p.is_low_stock;
        }
        return true;
      });

    res.json({
      products: productsWithComputed,
      total: req.query.stock_status === 'low_stock' ? productsWithComputed.length : total,
      page,
      limit,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/products/filter-options - Get available filter values
router.get('/filter-options', async (req, res) => {
  try {
    const [companies, sizes, colors, thicknesses, categories] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        distinct: ['company'],
        select: { company: true },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        distinct: ['size'],
        select: { size: true },
      }),
      prisma.product.findMany({
        where: { isActive: true, color: { not: null } },
        distinct: ['color'],
        select: { color: true },
      }),
      prisma.product.findMany({
        where: { isActive: true, thickness: { not: null } },
        distinct: ['thickness'],
        select: { thickness: true },
      }),
      prisma.product.findMany({
        where: { isActive: true, category: { not: null } },
        distinct: ['category'],
        select: { category: true },
      }),
    ]);

    res.json({
      companies: companies.map((c) => c.company).sort(),
      sizes: sizes.map((s) => s.size).sort(),
      finish_types: Object.values(FinishType),
      colors: colors.map((c) => c.color).filter(Boolean).sort(),
      thicknesses: thicknesses.map((t) => Number(t.thickness)).sort((a, b) => a - b),
      grades: Object.values(Grade),
      categories: categories.map((c) => c.category).filter(Boolean).sort(),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/products/:id - Get single product details
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        size: true,
        company: true,
        finishType: true,
        color: true,
        thickness: true,
        grade: true,
        category: true,
        application: true,
        unitsPerBox: true,
        currentStockBoxes: true,
        minimumStockBoxes: true,
        sellingPricePerBox: true,
        sellingPricePerPiece: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        // Hide purchase price from staff
        purchasePricePerBox: req.user?.role === UserRole.owner,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productWithComputed = {
      ...product,
      total_pieces: Number(product.currentStockBoxes) * product.unitsPerBox,
    };

    res.json(productWithComputed);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/products - Create new product (Owner only)
router.post(
  '/',
  requireOwner,
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('size').notEmpty().withMessage('Size is required'),
    body('company').notEmpty().withMessage('Company is required'),
    body('finish_type').isIn(Object.values(FinishType)).withMessage('Valid finish type is required'),
    body('units_per_box').isInt({ min: 1 }).withMessage('Units per box must be at least 1'),
  ],
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        sku,
        name,
        description,
        size,
        company,
        finish_type,
        color,
        thickness,
        grade,
        category,
        application,
        units_per_box,
        minimum_stock_boxes,
        purchase_price_per_box,
        selling_price_per_box,
        selling_price_per_piece,
        image_url,
      } = req.body;

      // Generate SKU if not provided
      const productSku = sku || (await generateSKU());

      // Check if SKU already exists
      if (sku) {
        const existing = await prisma.product.findUnique({ where: { sku } });
        if (existing) {
          return res.status(409).json({ error: 'SKU already exists' });
        }
      }

      const product = await prisma.product.create({
        data: {
          sku: productSku,
          name,
          description,
          size,
          company,
          finishType: finish_type,
          color,
          thickness: thickness ? parseFloat(thickness) : null,
          grade,
          category,
          application,
          unitsPerBox: parseInt(units_per_box),
          minimumStockBoxes: minimum_stock_boxes ? parseFloat(minimum_stock_boxes) : 0,
          purchasePricePerBox: purchase_price_per_box ? parseFloat(purchase_price_per_box) : null,
          sellingPricePerBox: selling_price_per_box ? parseFloat(selling_price_per_box) : null,
          sellingPricePerPiece: selling_price_per_piece ? parseFloat(selling_price_per_piece) : null,
          imageUrl: image_url,
          createdById: req.user!.userId,
        },
      });

      res.status(201).json({
        message: 'Product created successfully',
        product,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// PATCH /api/products/:id - Update product details (Owner only)
router.patch('/:id', requireOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: any = {};

    // Map allowed fields
    const allowedFields = [
      'name',
      'description',
      'size',
      'company',
      'finish_type',
      'color',
      'thickness',
      'grade',
      'category',
      'application',
      'units_per_box',
      'minimum_stock_boxes',
      'purchase_price_per_box',
      'selling_price_per_box',
      'selling_price_per_piece',
      'image_url',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const prismaField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        updateData[prismaField] = req.body[field];
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    res.json({
      message: 'Product updated successfully',
      product,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/products/:id - Soft delete product (Owner only)
router.delete('/:id', requireOwner, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(400).json({ error: error.message });
  }
});

// PATCH /api/products/:id/stock - Direct stock update (Admin/Owner only)
router.patch('/:id/stock', requireAdminOrOwner, [
  body('current_stock_boxes').isFloat({ min: 0 }).withMessage('Stock must be a positive number'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
], async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { current_stock_boxes, notes } = req.body;

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, currentStockBoxes: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { currentStockBoxes: parseFloat(current_stock_boxes) },
      select: { id: true, name: true, sku: true, currentStockBoxes: true, unitsPerBox: true },
    });

    res.json({
      message: 'Stock updated successfully',
      product: updatedProduct,
      previous_stock: Number(product.currentStockBoxes),
      new_stock: Number(updatedProduct.currentStockBoxes),
      notes: notes || 'Direct stock adjustment',
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(400).json({ error: error.message });
  }
});

export default router;
