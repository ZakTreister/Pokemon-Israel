import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import User from './models/userModel.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import tournamentRoutes from './routes/tournamentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import deckRoutes from './routes/deckRoutes.js';
import updateRoutes from './routes/updateRoutes.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins in WebContainer
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({
  origin: "*", // Allow all origins in WebContainer
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/updates', updateRoutes);

// Error Handling
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
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPhone = process.env.ADMIN_PHONE;
      
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
        if (adminEmail) existingUser.email = adminEmail;
        if (adminPhone) existingUser.phone = adminPhone;
        await existingUser.save();
        console.log(`✅ User ${adminUsername} updated to admin role`);
        return;
      }
      
      // Create new admin user
      const adminUser = await User.create({
        username: adminUsername,
        email: adminEmail || '',
        password: adminPassword,
        phone: adminPhone || '0000000000',
        role: 'admin'
      });
      
      console.log(`✅ Admin user created successfully:`);
      console.log(`   Username: ${adminUser.username}`);
      console.log(`   Email: ${adminUser.email || 'Not provided'}`);
      console.log(`   Role: ${adminUser.role}`);
      
    } else {
      console.log(`✅ Admin user already exists: ${adminExists.username}`);
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
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();