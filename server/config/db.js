import mongoose from 'mongoose';
import User from '../models/userModel.js';

const connectDB = async () => {
  try {
    // Set mongoose options for better connection handling
    mongoose.set('strictQuery', false);
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
    
    // Check and create admin user after successful connection
    await checkAndCreateAdminUser();
    
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

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

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// Handle app termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose connection closed due to app termination');
  process.exit(0);
});

export default connectDB;