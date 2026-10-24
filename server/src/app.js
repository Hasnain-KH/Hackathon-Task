import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from './routes/index.js';
import AppError from './utils/errors.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));
app.use('/api', apiRoutes);
app.use((req, res, next) => next(new AppError(404, 'Route not found.')));
app.use((error, req, res, next) => {
  const statusCode = error.statusCode || error.status || 500;
  const message = statusCode >= 500 ? 'Internal server error.' : error.message;
  if (statusCode >= 500) {
    console.error(error);
  }
  res.status(statusCode).json({
    error: message,
    ...(error.report || {}),
  });
});

export default app;
