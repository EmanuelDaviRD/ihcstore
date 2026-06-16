const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const axios = require('axios');
require('dotenv').config();

const { uploadToCloudinary } = require('./config/cloudinary');
const {
  db, initializeDatabase, listProducts, getProductById, upsertProduct, deleteProduct,
  listUsers, findUserByEmail, createUser, updateAdminPassword, verifyAdminPassword,
  listOrders, listOrdersByCustomer, getOrderById, createOrder, deleteOrdersBulk,
  updateOrderStatus, getSettings, saveSettings
} = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'LOCAL_JWT_SECRET_CHANGE_ME_IN_PRODUCTION';

app.use(cors());
app.use(express.json());

// 🛠️ CORREÇÃO AQUI: Só tenta criar a pasta uploads localmente. A Vercel ignora e não quebra.
const uploadsDir = path.join(__dirname, 'uploads');
if (!process.env.VERCEL && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Token inválido' });
  }
}

function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'landing.html')));
app.get('/loja', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'admin.html')));

app.get('/produtos', async (req, res) => {
  try {
    res.json(await listProducts());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/produtos', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, price, category, stock, image, description, badge } = req.body;
    if (!name || price === undefined) return res.status(400).json({ error: 'Nome e preço são obrigatórios' });

    const id = 'p-' + Date.now();
    await upsertProduct(id, {
      name,
      price,
      category,
      stock,
      image,
      description,
      badge
    });

    const created = await getProductById(id);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/produtos/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const fields = ['name', 'price', 'category', 'stock', 'image', 'description', 'badge'];
    const body = {};
    fields.forEach(f => {
      if (req.body[f] !== undefined) body[f] = req.body[f];
    });

    const exists = await getProductById(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Produto não encontrado' });

    await upsertProduct(req.params.id, body);
    const updated = await getProductById(req.params.id);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/produtos/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const exists = await getProductById(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Produto não encontrado' });

    await deleteProduct(req.params.id);
    res.json({ message: 'Produto removido' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Dados incompletos' });
    if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });

    const lowerEmail = String(email).toLowerCase();
    const exists = await findUserByEmail(lowerEmail);
    if (exists) return res.status(400).json({ error: 'Email já cadastrado' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = 'u-' + Date.now();
    await createUser({ id: userId, name, email: lowerEmail, password: hashedPassword, role: 'customer' });
    const created = await findUserByEmail(lowerEmail);

    const token = jwt.sign({ id: created.id, email: created.email, role: created.role, name: created.name }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: created.id, name: created.name, email: created.email, role: created.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

    const plainPassword = String(password);
    if (!plainPassword) return res.status(400).json({ error: 'Senha inválida' });

    const user = await findUserByEmail(String(email).toLowerCase());
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
    if (!user.password || typeof user.password !== 'string') return res.status(500).json({ error: 'Hash de senha inválido' });

    const passwordMatch = await bcrypt.compare(plainPassword, user.password);
    if (!passwordMatch) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/pedidos', authenticate, async (req, res) => {
  try {
    const { items, total, address, paymentMethod, couponApplied, discountAmount } = req.body;
    if (!items || !total) return res.status(400).json({ error: 'Dados incompletos' });

    const normalizedItems = items.map(it => ({
      id: it.id || it._id,
      name: it.name,
      price: it.price,
      qty: it.qty,
      image: it.image
    }));

    const orderId = 'order-' + Date.now();
    await createOrder({
      id: orderId,
      user_id: req.user.id,
      items: normalizedItems,
      total,
      status: 'pendente',
      shipping_address: address || '',
      payment_method: paymentMethod || 'cartao',
      coupon_applied: couponApplied || '',
      discount_amount: discountAmount || 0
    });

    const order = await getOrderById(orderId);
    res.status(201).json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/pedidos/usuario', authenticate, async (req, res) => {
  try {
    res.json(await listOrdersByCustomer(req.user.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/pedidos', authenticate, isAdmin, async (req, res) => {
  try {
    res.json(await listOrders());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/pedidos/bulk', authenticate, isAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs inválidos' });

    await deleteOrdersBulk(ids);
    res.json({ message: `${ids.length} pedido(s) removido(s)` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/pedidos/:id/status', authenticate, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

    await updateOrderStatus(req.params.id, status);
    const updated = await getOrderById(req.params.id);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/admin/change-password', authenticate, isAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Dados incompletos' });

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Senha inválida' });
    }

    const ok = await verifyAdminPassword(currentPassword);
    if (!ok) return res.status(401).json({ error: 'Senha atual incorreta' });

    const hashed = await bcrypt.hash(newPassword, 10);
    const changed = await updateAdminPassword(hashed);
    if (!changed) return res.status(404).json({ error: 'Admin não encontrado' });

    return res.json({ message: 'Senha alterada com sucesso' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/upload', authenticate, isAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

    if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_API_KEY) {
      try {
        const cloudUrl = await uploadToCloudinary(req.file.path);
        if (cloudUrl) {
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          return res.json({ imageUrl: cloudUrl });
        }
      } catch (err) {
        console.log("Cloudinary não configurado ou erro, usando storage local...");
      }
    }

    return res.json({ imageUrl: `/uploads/${req.file.filename}` });
  } catch (e) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: e.message });
  }
});

app.get('/usuarios', authenticate, isAdmin, async (req, res) => {
  try {
    res.json(await listUsers());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/admin-check', authenticate, isAdmin, (req, res) => res.json({ admin: true }));

app.get('/cep/:cep', async (req, res) => {
  try {
    const cep = req.params.cep.replace(/\D/g, '');
    if (cep.length !== 8) return res.status(400).json({ error: 'CEP inválido' });
    const r = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
    if (r.data.erro) return res.status(404).json({ error: 'CEP não encontrado' });
    res.json(r.data);
  } catch {
    res.status(500).json({ error: 'Erro ao consultar CEP' });
  }
});

app.get('/settings', async (req, res) => {
  try {
    res.json(await getSettings() || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/settings', authenticate, isAdmin, async (req, res) => {
  try {
    const { primaryColor, accentColor, siteTitle, welcomeText, logoUrl } = req.body;
    await saveSettings({ primaryColor, accentColor, siteTitle, welcomeText, logoUrl });
    res.json({ message: 'Configurações salvas' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use(express.static(path.join(__dirname, 'frontend'), { fallthrough: true }));
app.use('/uploads', (req, res) => res.status(404).json({ error: 'Arquivo não encontrado' }));

// 404 para rotas não encontradas (API ou frontend)
app.use((req, res) => {
  if (req.path.startsWith('/produtos') || req.path.startsWith('/pedidos') || req.path.startsWith('/usuarios') || req.path.startsWith('/settings') || req.path.startsWith('/login') || req.path.startsWith('/register')) {
    return res.status(404).json({ error: 'Rota de API não encontrada' });
  }
  res.status(404).sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const start = async () => {
  try {
    await initializeDatabase();
    
    const adminEmail = 'admin@ihcstore.com';
    const admin = await findUserByEmail(adminEmail);
    
    if (!admin) {
      console.log('⚙️ Criando usuário administrador padrão...');
      const hashed = await bcrypt.hash('admin123', 10);
      await createUser({
        id: 'u-admin',
        name: 'Administrador',
        email: adminEmail,
        password: hashed,
        role: 'admin'
      });
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 SITE NO AR: http://localhost:${PORT}`);
      console.log(`🔐 ADMIN: ${adminEmail} / admin123\n`);
    });
  } catch (err) {
    console.error('❌ Erro crítico ao iniciar o site:', err);
  }
};

start();