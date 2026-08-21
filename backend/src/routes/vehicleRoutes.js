import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';
import {
  createVehicle,
  getAllVehicles,
  searchVehicles,
  updateVehicle,
  deleteVehicle,
  purchaseVehicle,
  restockVehicle,
} from '../services/vehicleService.js';

const router = express.Router();

router.use(verifyToken);

router.post(
  '/',
  [
    body('make').trim().notEmpty().withMessage('Make is required'),
    body('model').trim().notEmpty().withMessage('Model is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  ],
  requireAdmin,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const vehicle = await createVehicle(req.body);
      return res.status(201).json(vehicle);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.get('/', async (req, res) => {
  try {
    const vehicles = await getAllVehicles();
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get(
  '/search',
  [
    query('make').optional().isString().trim().withMessage('Make must be a string'),
    query('model').optional().isString().trim().withMessage('Model must be a string'),
    query('category').optional().isString().trim().withMessage('Category must be a string'),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice must be a non-negative number'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice must be a non-negative number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const vehicles = await searchVehicles(req.query);
      return res.status(200).json(vehicles);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.put(
  '/:id',
  [
    body('make').optional().trim().notEmpty().withMessage('Make is required'),
    body('model').optional().trim().notEmpty().withMessage('Model is required'),
    body('category').optional().trim().notEmpty().withMessage('Category is required'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  ],
  requireAdmin,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const vehicle = await updateVehicle(req.params.id, req.body);
      return res.status(200).json(vehicle);
    } catch (error) {
      const status = error.message === 'Vehicle not found' ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }
);

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await deleteVehicle(req.params.id);
    return res.status(200).json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    const status = error.message === 'Vehicle not found' ? 404 : 400;
    return res.status(status).json({ message: error.message });
  }
});

router.post('/:id/purchase', async (req, res) => {
  try {
    const vehicle = await purchaseVehicle(req.params.id);
    res.status(200).json(vehicle);
  } catch (error) {
    const status = error.message === 'Vehicle not found' ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
});

router.post(
  '/:id/restock',
  [
    body('quantity').isInt({ min: 1 }).withMessage('Restock quantity must be a positive integer'),
  ],
  requireAdmin,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const vehicle = await restockVehicle(req.params.id, req.body.quantity);
      return res.status(200).json(vehicle);
    } catch (error) {
      const status = error.message === 'Vehicle not found' ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }
  }
);

export default router;
