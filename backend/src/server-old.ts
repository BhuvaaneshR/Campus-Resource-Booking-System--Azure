import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth';
import { bookingRoutes } from './routes/bookings';
import { resourceRoutes } from './routes/resources';
import { databaseRoutes } from './routes/database';
import { campusDbRoutes } from './routes/campus-db';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';
import { connectToDatabase, getPool } from './config/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || process.env.WEBSITES_PORT || '8080', 10);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.AZURE_APP_SERVICE_URL 
    : 'http://localhost:3000',
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
app.use('/api/bookings', authenticateToken, bookingRoutes);
app.use('/api/resources', authenticateToken, resourceRoutes);
app.use('/api/db', databaseRoutes); // Direct database access routes
app.use('/api/campus', campusDbRoutes); // Campus database routes for existing schema

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Initialize database connection and start server
async function startServer() {
  try {
    // Connect to database
    // Start server first - don't block on database
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log('✅ Application started successfully!');
    });

    // Connect to database in background (non-blocking)
    connectToDatabase()
      .then(() => {
        console.log('🔗 Database connected successfully');
      })
      .catch((error) => {
        console.error('❌ Database connection failed (app still running):', error);
      });
    
    return; // Exit function after starting server
    console.log('🔗 Database connected successfully');
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log('✅ Application started successfully!');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();

export default app;
