import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import corsOptions from './config/cors.js';

// api routes
import swaggerRoutes from './routes/swagger.route.js';
import healthRoutes from './routes/health.route.js';
import userAuthRoutes from './routes/userAuth.route.js';
import adminAuthRoutes from './routes/adminAuth.route.js';
import adminManagementRoutes from './routes/adminManagement.route.js';
import adminUsersRoutes from './routes/adminUsers.route.js';
import dentalImagesRoutes from './routes/dentalImages.route.js';
import errorHandler from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimiter.js';

// sample ml route for testing only
import mockMLRoutes from './mocks/mockML.route.js';

const app = express();



// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(cookieParser());
app.set('trust proxy', 2); // Trust two proxies (Vercel + Render)
app.use(globalLimiter);

// Routes
app.use(swaggerRoutes);
app.use(healthRoutes);
app.use(userAuthRoutes);
app.use(adminAuthRoutes);
app.use(adminManagementRoutes);
app.use(adminUsersRoutes);
app.use(dentalImagesRoutes);

// sample ml route for testing only
app.use(mockMLRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;
