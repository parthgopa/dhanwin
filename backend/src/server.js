import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import { User } from './models/User.js';
import authRoutes from './routes/authRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import winGoRoutes from './routes/winGoRoutes.js';
import { initGameSockets } from './socket/gameSocket.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());

// Real-time API Request Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : status >= 300 ? '\x1b[36m' : '\x1b[32m';
    const resetColor = '\x1b[0m';
    const methodColor = '\x1b[35m';

    console.log(`[${time}] ${methodColor}${req.method}${resetColor} ${req.originalUrl} -> ${statusColor}${status}${resetColor} (${duration}ms)`);
  });

  next();
});

// Attach routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/superad', superAdminRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/wingo', winGoRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Dhanwin Real-time Gaming Engine operational', timestamp: new Date() });
});

// Seed Default Admin Account if not present
const seedDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'ADMIN' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('adminpassword123', salt);

      await User.create({
        username: 'admin',
        phone: '9999999999',
        passwordHash,
        role: 'ADMIN',
        walletBalance: 100000.00,
      });
      console.log('[Admin Seed] Created default admin account: Username="admin", Password="adminpassword123"');
    }
  } catch (err) {
    console.error('[Admin Seed Error]', err.message);
  }
};

// Start Server
const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await seedDefaultAdmin();

  initGameSockets(server);

  server.listen(PORT, () => {
    console.log(`[Dhanwin Backend] Server running on http://localhost:${PORT}`);
  });
});
