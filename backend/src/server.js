import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import { requireAdmin, verifyToken } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', verifyToken, (req, res) => {
  res.json({ status: 'ok', user: req.user || null });
});

app.get('/api/admin/health', verifyToken, requireAdmin, (req, res) => {
  res.json({ status: 'ok', user: req.user || null });
});

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);

const PORT = process.env.PORT || 5000;

if (process.argv[1]?.includes('server.js')) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
