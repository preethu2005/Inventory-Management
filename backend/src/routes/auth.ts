import { Router } from 'express';
import { body } from 'express-validator';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// POST /api/auth/register - Register first owner account
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
  ],
  async (req, res) => {
    try {
      // Check if any users exist
      const userCount = await prisma.user.count();
      if (userCount > 0) {
        return res.status(409).json({ error: 'Registration is disabled. Users already exist.' });
      }

      const { email, password, name } = req.body;

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already exists' });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create owner account
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: UserRole.owner,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      res.status(201).json({
        message: 'Owner account created successfully',
        user,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// POST /api/auth/login - Login and receive JWT token
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is inactive' });
      }

      // Verify password
      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = generateToken({
        userId: user.id,
        role: user.role,
      });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// GET /api/auth/me - Get current logged-in user info
router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
