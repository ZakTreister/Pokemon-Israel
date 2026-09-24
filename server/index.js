import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import User from './models/userModel.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import tournamentRoutes from './routes/tournamentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import deckRoutes from './routes/deckRoutes.js';
import updateRoutes from './routes/updateRoutes.js';
import seasonRoutes from './routes/seasonRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import badgeRoutes from './routes/badgeRoutes.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Configure CORS origins from environment variable
const getAllowedOrigins = () => {
  const corsOrigin = process.env.CORS_ORIGIN;
  
  if (corsOrigin) {
    // If CORS_ORIGIN is set, use it (can be comma-separated for multiple origins)
    return corsOrigin.split(',').map(origin => origin.trim());
  }
  
  // Fallback for development - allow common development URLs
  if (process.env.NODE_ENV === 'development') {
    return [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];
  }
  
  // In production without CORS_ORIGIN set, be restrictive
  return false;
};

const allowedOrigins = getAllowedOrigins();

console.log('CORS Configuration:', {
  environment: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN,
  allowedOrigins: allowedOrigins
});

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    corsOrigins: allowedOrigins
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/updates', updateRoutes);
app.use('/api/seasons', seasonRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/badges', badgeRoutes);

// Serve static files from the React app build directory
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../dist');
  
  // Serve static files
  app.use(express.static(buildPath));
  
  // Handle React routing - send all non-API requests to index.html
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes that weren't found
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  // Development mode - just show a message for non-API routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    
    res.json({ 
      message: 'Development mode - Frontend should be served by Vite dev server',
      frontendUrl: 'http://localhost:5173'
    });
  });
}

// Error Handling (must be after all routes)
app.use(notFound);
app.use(errorHandler);

// Socket.IO Events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const checkAndCreateAdminUser = async () => {
  try {
    // Check if any admin user exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      console.log('No admin user found. Creating default admin user...');
      
      // Get admin credentials from environment variables
      const adminUsername = process.env.ADMIN_USERNAME;
      const adminPassword = process.env.ADMIN_PASSWORD;
      const adminName = process.env.ADMIN_NAME || 'מנהל מערכת';
      
      if (!adminUsername || !adminPassword) {
        console.error('Admin credentials not found in environment variables');
        console.error('Please set ADMIN_USERNAME and ADMIN_PASSWORD in your .env file');
        return;
      }
      
      // Check if username already exists (in case there's a regular user with this username)
      const existingUser = await User.findOne({ username: adminUsername });
      if (existingUser) {
        console.log(`User with username ${adminUsername} already exists. Updating to admin role...`);
        existingUser.role = 'admin';
        if (adminName) existingUser.name = adminName;
        await existingUser.save();
        console.log(`✅ User ${adminUsername} updated to admin role`);
        return;
      }
      
      // Create new admin user
      const adminUser = await User.create({
        name: adminName,
        username: adminUsername,
        password: adminPassword,
        role: 'admin'
      });
      
      console.log(`✅ Admin user created successfully:`);
      console.log(`   Name: ${adminUser.name}`);
      console.log(`   Username: ${adminUser.username}`);
      console.log(`   Role: ${adminUser.role}`);
      
    } else {
      console.log(`✅ Admin user already exists: ${adminExists.name} (${adminExists.username})`);
    }
  } catch (error) {
    console.error('Error checking/creating admin user:', error.message);
  }
};

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    
    // Check and create admin user after database connection
    await checkAndCreateAdminUser();
    
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Server accessible at: http://0.0.0.0:${PORT}`);
      console.log(`CORS Origins: ${JSON.stringify(allowedOrigins)}`);
      
      if (process.env.NODE_ENV === 'production') {
        console.log(`✅ Serving static files from: ${path.join(__dirname, '../dist')}`);
        console.log(`✅ Frontend and API available at: http://0.0.0.0:${PORT}`);
      } else {
        console.log(`🔧 Development mode - Frontend should be running on: http://localhost:5173`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();