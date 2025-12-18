import { Router } from 'express';
import { body } from 'express-validator';
import prisma from '../config/database';
import { hashPassword } from '../utils/password';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate, requireAdmin);

// GET /api/users - List all users
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    res.json({
      users,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/users - Create new staff account
router.post(
  '/',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
  ],
  async (req, res) => {
    try {
      const { email, password, name } = req.body;

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already exists' });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user account (role from request, admin can create any role)
      const { role } = req.body;
      const userRole = role && [UserRole.admin, UserRole.owner, UserRole.staff].includes(role) 
        ? role 
        : UserRole.staff;
      
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: userRole,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      res.status(201).json({
        message: 'User created successfully',
        user,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// PATCH /api/users/:id - Update user
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, is_active, role } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (typeof is_active === 'boolean') updateData.isActive = is_active;
    if (role && [UserRole.admin, UserRole.owner, UserRole.staff].includes(role)) {
      updateData.role = role;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    res.json({
      message: 'User updated successfully',
      user,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/users/:id - Delete user account
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    // Cannot delete self
    if (id === req.user?.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists and get their role
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If deleting an admin, check if it's the last admin
    if (userToDelete.role === UserRole.admin) {
      const adminCount = await prisma.user.count({
        where: { role: UserRole.admin },
      });

      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin account' });
      }
    }

    // If deleting an owner, check if it's the last owner
    if (userToDelete.role === UserRole.owner) {
      const ownerCount = await prisma.user.count({
        where: { role: UserRole.owner },
      });

      if (ownerCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last owner account' });
      }
    }

    await prisma.user.delete({ where: { id } });

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(400).json({ error: error.message });
  }
});

export default router;
