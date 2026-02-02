import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db/init.js';
import authRoutes from './routes/auth.js';
import storeRoutes from './routes/stores.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import cartRoutes from './routes/cart.js';
import customerRoutes from './routes/customers.js';
import adminRoutes from './routes/admin.js';
import subscriptionRoutes from './routes/subscriptions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

await initDb();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`StoreLaunch API running on http://localhost:${PORT}`));
