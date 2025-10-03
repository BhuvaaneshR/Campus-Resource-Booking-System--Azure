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

// --- CORS CONFIGURATION ---
const allowedOrigins: string[] = [
  'http://localhost:3000',  // For local development
  'https://campus-booking-frontend-web.azurewebsites.net'  // For Azure production
];

// Add additional origin from env if present
if (process.env.AZURE_APP_SERVICE_URL) {
  allowedOrigins.push(process.env.AZURE_APP_SERVICE_URL);
}

// Security middleware
app.use(helmet());
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

// --- SERVER STARTUP LOGIC ---
async function startServer() {
  try {
    // Connect to the database first
    await connectToDatabase();
    console.log('🔗 Database connected successfully');

    // Start the server after successful database connection
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
      console.log('✅ Application started successfully!');
    });
  } catch (error) {
    console.error('❌ Failed to start server due to database connection error:', error);
    process.exit(1);
  }
}

// Start the application
startServer();

export default app;