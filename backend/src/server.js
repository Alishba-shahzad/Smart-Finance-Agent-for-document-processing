import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import healthRouter from './routes/health.js';
import dashboardRouter from './routes/dashboard.js';
import documentsRouter from './routes/documents.js';
import chatRouter from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount API routes
app.use('/api/health', healthRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/chat', chatRouter);

// Auth callback redirect helper
app.get('/api/auth/callback', (req, res) => {
  const code = req.query.code;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  if (code) {
    res.redirect(`${frontendUrl}/auth/callback?code=${code}`);
  } else {
    res.redirect(`${frontendUrl}/login`);
  }
});

// Root ping
app.get('/', (_req, res) => {
  res.json({
    name: 'Smart Finance Agent API',
    status: 'Running',
    version: '1.0.0',
    endpoints: [
      '/api/health',
      '/api/dashboard/analytics',
      '/api/documents',
      '/api/chat',
    ],
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.url}`,
    },
    timestamp: new Date().toISOString(),
  });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err?.message || 'An unexpected error occurred.',
    },
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Financial Agent Node.js / Express Backend Running `);
  console.log(` Port:    http://localhost:${PORT}`);
  console.log(` Health:  http://localhost:${PORT}/api/health`);
  console.log(` Chat:    http://localhost:${PORT}/api/chat`);
  console.log(` Docs:    http://localhost:${PORT}/api/documents`);
  console.log(`=======================================================`);
});

export default app;

