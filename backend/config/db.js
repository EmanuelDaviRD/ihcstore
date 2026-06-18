const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 🔗 String de conexão (Mude para sua URI do MongoDB Atlas se preferir)
const MONGO_URI = process.env.MONGODB_URI;

// --- SCHEMAS ---
const productSchema = new mongoose.Schema({
  _id: String,
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  stock: { type: Number, required: true },
  image: String,
  description: String,
  sales: { type: Number, default: 0 },
  badge: { type: String, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  _id: String,
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'customer' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  _id: String,
  user_id: { type: String, ref: 'User', required: true },
  items: { type: Array, required: true },
  total: { type: Number, required: true },
  status: { type: String, default: 'pendente' },
  shipping_address: String,
  payment_method: String,
  coupon_applied: String,
  discount_amount: { type: Number, default: 0 }
}, { timestamps: true });

const settingSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: mongoose.Schema.Types.Mixed
});

// --- MODELS ---
const Product = mongoose.model('Product', productSchema);
const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);
const Setting = mongoose.model('Setting', settingSchema);

async function initializeDatabase() {
  if (mongoose.connection.readyState >= 1) return;
  if (!MONGO_URI) {
    console.error('❌ Erro: MONGODB_URI não definida no arquivo .env');
    return;
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected');
    await seedInitialData();
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
  }
}

async function seedInitialData() {
  // Verifica se o admin já existe pelo e-mail para evitar duplicatas
  const adminEmail = 'admin@ihcstore.com';
  const adminExists = await User.findOne({ email: adminEmail });
  if (!adminExists) {
    console.log('👤 Criando administrador padrão...');
    const hashedPwd = bcrypt.hashSync('admin123', 10);
    await User.create({
      _id: 'u-admin',
      name: 'Administrador',
      email: adminEmail,
      password: hashedPwd,
      role: 'admin'
    });
  }
}

const formatDoc = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id;
  return obj;
};

module.exports = {
  initializeDatabase,
  listProducts: async (showAll = false) => {
    const filter = showAll ? {} : { active: { $ne: false } };
    return (await Product.find(filter).sort({ sales: -1 })).map(formatDoc);
  },
  getProductById: async (id) => formatDoc(await Product.findById(id)),
  upsertProduct: async (id, data) => formatDoc(await Product.findByIdAndUpdate(id, { $set: data }, { upsert: true, new: true })),
  deleteProduct: async (id) => (await Product.findByIdAndDelete(id)) !== null,
  listUsers: async () => (await User.find({}, '-password')).map(formatDoc),
  findUserByEmail: async (email) => formatDoc(await User.findOne({ email })),
  createUser: async (data) => {
    const user = await User.create({ ...data, _id: data.id || 'u-' + Date.now() });
    return formatDoc(user);
  },
  verifyAdminPassword: async (currentPwd) => {
    const admin = await User.findOne({ role: 'admin' });
    return admin ? await bcrypt.compare(currentPwd, admin.password) : false;
  },
  updateAdminPassword: async (pwd) => {
    const res = await User.updateOne({ role: 'admin' }, { password: pwd });
    return res.modifiedCount > 0;
  },
  listOrders: async () => (await Order.find().sort({ createdAt: -1 })).map(formatDoc),
  listOrdersByCustomer: async (uid) => (await Order.find({ user_id: uid }).sort({ createdAt: -1 })).map(formatDoc),
  getOrderById: async (id) => formatDoc(await Order.findById(id)),
  createOrder: async (data) => {
    const order = await Order.create({ ...data, _id: data.id || 'order-' + Date.now() });
    return formatDoc(order);
  },
  updateOrderStatus: async (id, status) => {
    const res = await Order.updateOne({ _id: id }, { status });
    return res.modifiedCount > 0;
  },
  deleteOrdersBulk: async (ids) => {
    const res = await Order.deleteMany({ _id: { $in: ids } });
    return res.deletedCount;
  },
  getSettings: async () => {
    const rows = await Setting.find();
    const res = {};
    rows.forEach(s => res[s.key] = s.value);
    return res;
  },
  saveSettings: async (data) => {
    await Setting.deleteMany({});
    const entries = Object.entries(data).map(([key, value]) => ({ key, value }));
    await Setting.insertMany(entries);
    return data;
  }
};
