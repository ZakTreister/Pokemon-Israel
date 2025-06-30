# Pokemon Tournament Management System

A comprehensive tournament management system for Pokemon card game tournaments in Israel.

## Features

- **Tournament Management**: Create, edit, and manage tournaments
- **User Registration**: Player and admin account management
- **Real-time Updates**: Live tournament updates and notifications
- **Deck Management**: Track and manage deck archetypes
- **Rankings System**: Player rankings and statistics
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend
- React 18 with TypeScript
- Redux Toolkit for state management
- React Router for navigation
- Tailwind CSS for styling
- Vite for build tooling

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT authentication
- Socket.IO for real-time features
- bcryptjs for password hashing

## Development Setup

### Prerequisites
- Node.js 18+ 
- MongoDB (local or cloud)
- npm or yarn

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/pokemon-tournaments

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Admin User Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_NAME=מנהל מערכת

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development servers:
   ```bash
   npm start
   ```

This will start both the frontend (http://localhost:5173) and backend (http://localhost:5000) servers.

### Development Scripts

- `npm run dev` - Start frontend development server only
- `npm run dev:server` - Start backend development server only  
- `npm start` - Start both frontend and backend servers
- `npm run build` - Build frontend for production
- `npm run lint` - Run ESLint

## Production Deployment

### Building for Production

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Set production environment variables:
   ```env
   NODE_ENV=production
   CORS_ORIGIN=https://your-domain.com
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pokemon-tournaments
   ```

3. Start the production server:
   ```bash
   npm run production
   ```

The server will serve both the API and the built frontend from a single port.

### Production Scripts

- `npm run build:full` - Build frontend and start server
- `npm run production` - Start server in production mode

### Deployment Considerations

1. **Database**: Use MongoDB Atlas or another cloud MongoDB service
2. **Environment Variables**: Set all required environment variables on your hosting platform
3. **CORS**: Configure `CORS_ORIGIN` to match your domain
4. **SSL**: Use HTTPS in production
5. **Process Management**: Consider using PM2 or similar for process management

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin only)
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Tournaments
- `GET /api/tournaments` - Get all tournaments
- `POST /api/tournaments` - Create tournament (admin only)
- `GET /api/tournaments/:id` - Get tournament details
- `PUT /api/tournaments/:id` - Update tournament (admin only)
- `DELETE /api/tournaments/:id` - Delete tournament (admin only)
- `POST /api/tournaments/:id/register` - Register for tournament
- `DELETE /api/tournaments/:id/register` - Unregister from tournament

### Users
- `GET /api/users` - Get all users (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)
- `GET /api/users/stats` - Get user statistics
- `GET /api/users/tournaments` - Get user tournament history

### Decks
- `GET /api/decks` - Get all decks
- `POST /api/decks` - Create deck (admin only)
- `PUT /api/decks/:id` - Update deck (admin only)
- `DELETE /api/decks/:id` - Delete deck (admin only)

### Updates
- `GET /api/updates` - Get all updates
- `POST /api/updates` - Create update (admin only)
- `PUT /api/updates/:id` - Update update (admin only)
- `DELETE /api/updates/:id` - Delete update (admin only)

## Default Admin Account

The system automatically creates a default admin account on first startup:

- **Username**: admin (configurable via `ADMIN_USERNAME`)
- **Password**: admin123 (configurable via `ADMIN_PASSWORD`)
- **Name**: מנהל מערכת (configurable via `ADMIN_NAME`)

**Important**: Change the default admin credentials in production!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.