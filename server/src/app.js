import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from './routes/index.js';
import auditContext from './middleware/auditContext.js';
import AppError from './utils/errors.js';
import mongoose from 'mongoose';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError(403, 'Origin is not allowed.'));
  },
}));
app.use(express.json());
app.use(morgan('dev'));
app.use(auditContext);
app.use('/api', apiRoutes);
app.use((req, res, next) => next(new AppError(404, 'Route not found.')));
app.use((error, req, res, next) => {
  const statusCode = error.statusCode || error.status || 500;
  const message = error.expose ? error.message : 'Internal server error.';
  if (statusCode >= 500) {
    console.error(error);
  }
  res.status(statusCode).json({
    error: message,
    ...(error.report || {}),
  });
});

export default app;
