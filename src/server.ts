import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Load env vars
dotenv.config();

// Connect to Database
import connectDB from './config/db';
connectDB();

import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 5000;


// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.CLIENT_API_URL,
    credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));

// Route Imports
import authRoutes from './routes/auth.routes';
import courseRoutes from './routes/course.routes';
import paymentRoutes from './routes/payment.routes';
import userRoutes from './routes/user.routes';
import tutorRoutes from './routes/tutor.routes';
import notificationRoutes from './routes/notification.routes';

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/tutors', tutorRoutes);
app.use('/api/notifications', notificationRoutes);

// Base Route
app.get('/', (req, res) => {
    res.send('Nexus 4D API is running');
});

// Start Server (Only if not running on Vercel)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default app;
