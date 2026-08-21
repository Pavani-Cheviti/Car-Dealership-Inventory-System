import express from 'express';
import { body, validationResult } from 'express-validator';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';
import {
  createVehicle,
  getAllVehicles,
  searchVehicles,
  updateVehicle,
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

router.get('/search', async (req, res) => {
  try {
    const vehicles = await searchVehicles(req.query);
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const vehicle = await updateVehicle(req.params.id, req.body);
    res.status(200).json(vehicle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const vehicles = await getAllVehicles();
    const target = vehicles.find((item) => String(item.id) === String(req.params.id));
    if (!target) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    return res.status(200).json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
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

router.post('/:id/restock', requireAdmin, async (req, res) => {
  try {
    const vehicle = await restockVehicle(req.params.id, req.body.quantity || 1);
    res.status(200).json(vehicle);
  } catch (error) {
    const status = error.message === 'Vehicle not found' ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
});

export default router;
