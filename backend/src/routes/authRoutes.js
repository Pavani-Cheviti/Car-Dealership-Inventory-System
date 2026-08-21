import express from 'express';
import { body, validationResult } from 'express-validator';
import { registerUser, loginUser } from '../services/authService.js';

const router = express.Router();

const registerValidationRules = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Email is invalid'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

router.post('/register', registerValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  try {
    const user = await registerUser(req.body);
    return res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ message: error.message });
  }
});

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email is invalid'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const result = await loginUser(req.body);
      res.status(200).json(result);
    } catch (error) {
      res.status(401).json({ message: error.message });
    }
  }
);

export default router;
