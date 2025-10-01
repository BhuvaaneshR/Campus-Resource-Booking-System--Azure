import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth';
import { profileAuthRoutes } from './routes/profile-auth';
import { bookingRoutes } from './routes/bookings';
import { resourceRoutes } from './routes/resources';
import { databaseRoutes } from './routes/database';
import { campusDbRoutes } from './routes/campus-db';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';
import { profileRequestRoutes } from './routes/profile-requests';
import { connectToDatabase, getPool } from './config/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

// --- CHANGED CORS CONFIGURATION ---
// Define allowed origins in an array for clarity
// --- CORS CONFIGURATION ---
const allowedOrigins: string[] = [
  'http://localhost:3000',
  process.env.AZURE_APP_SERVICE_URL,
].filter((origin): origin is string => Boolean(origin)); // Type-safe filter

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const pool = getPool();
  const dbStatus = pool && pool.connected ? 'Connected' : 'Disconnected';
  
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: dbStatus
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile-auth', profileAuthRoutes);
app.use('/api/bookings', authenticateToken, bookingRoutes);
app.use('/api/resources', authenticateToken, resourceRoutes);
app.use('/api/db', databaseRoutes);
app.use('/api/campus', campusDbRoutes);
app.use('/api/profile-requests', profileRequestRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// --- CHANGED SERVER STARTUP LOGIC ---
async function startServer() {
  try {
    // 1. Connect to the database first. The app will not start if this fails.
    await connectToDatabase();
    console.log('🔗 Database connected successfully');

    // 2. Only start the server after a successful database connection.
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log('✅ Application started successfully!');
    });
  } catch (error) {
    console.error('❌ Failed to start server due to database connection error:', error);
    process.exit(1); // Exit with an error code to make failures obvious in Azure
  }
}

// Start the application
startServer();

export default app;