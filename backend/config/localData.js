const { readJSON, writeJSON, uuidLike } = require('./localStorage');

const FILES = {
  users: 'users.json',
  products: 'products.json',
  orders: 'orders.json',
  settings: 'settings.json',
  counters: 'counters.json'
};

function getDefaultSeedProducts() {
  return [
    {
      id: 'p1',
      name: 'RTX 4070 Ti Super',
      price: 5499.9,
      category: 'Placas de Vídeo',
      stock: 8,
      image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500',
      description: 'Placa gráfica potente para jogos em 4K e Ray Tracing.',
      sales: 18,
      badge: 'new'
    },
    {
      id: 'p2',
      name: 'Intel i9-13900K',
      price: 3899.9,
      category: 'Processadores',
      stock: 12,
      image: 'https://images.unsplash.com/photo-1591405351990-4726e331f141?w=500',
      description: 'Processador de alta performance para gamers e criadores.',
      sales: 27,
      badge: 'bestseller'
    },
    {
      id: 'p3',
      name: 'SSD NVMe 2TB Gen4',
      price: 899.9,
      category: 'Armazenamento',
      stock: 25,
      image: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=500',
      description: 'Carregue seus jogos e arquivos instantaneamente.',
      sales: 35,
      badge: 'sale'
    },
    {
      id: 'p4',
      name: 'RAM DDR5 32GB RGB',
      price: 1299.9,
      category: 'Memória',
      stock: 15,
      image: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=500',
      description: 'Multitarefa fluida e iluminação personalizada.',
      sales: 42,
      badge: 'bestseller'
    },
    {
      id: 'p5',
      name: 'Fonte 850W Gold Modular',
      price: 749.9,
      category: 'Energia',
      stock: 20,
      image: 'https://images.unsplash.com/photo-1587202395160-244303350328?w=500',
      description: 'Eficiência e organização para seu computador.',
      sales: 9,
      badge: ''
    },
    {
      id: 'p6',
      name: 'Gabinete Airflow RGB',
      price: 499.9,
      category: 'Gabinetes',
      stock: 60,
      image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=500',
      description: 'O melhor fluxo de ar para seus componentes.',
      sales: 6,
      badge: ''
    },
    {
      id: 'p7',
      name: 'Placa-Mãe Z790 DDR5',
      price: 2199.9,
      category: 'Placas-Mãe',
      stock: 9,
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500',
      description: 'A base perfeita para o seu PC Gamer.',
      sales: 15,
      badge: 'sale'
    },
    {
      id: 'p8',
      name: 'Mouse Gamer 16K DPI',
      price: 249.9,
      category: 'Acessórios',
      stock: 100,
      image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500',
      description: 'Precisão e rapidez para seus jogos competitivos.',
      sales: 4,
      badge: ''
    },
    {
      id: 'p9',
      name: 'Teclado Mecânico RGB',
      price: 399.9,
      category: 'Acessórios',
      stock: 5,
      image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=500',
      description: 'Resposta rápida e durabilidade premium.',
      sales: 52,
      badge: 'bestseller'
    },
    {
      id: 'p10',
      name: 'Monitor 144Hz 1ms 24"',
      price: 1099.9,
      category: 'Outros',
      stock: 18,
      image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500',
      description: 'Imagens fluidas para sua gameplay.',
      sales: 21,
      badge: 'new'
    }
  ];
}

function seedIfEmpty() {
  const products = readJSON(FILES.products, null);
  if (!products || !Array.isArray(products) || products.length === 0) {
    writeJSON(FILES.products, getDefaultSeedProducts());
  }

  const users = readJSON(FILES.users, null);
  if (!users || !Array.isArray(users) || users.length === 0) {
    writeJSON(FILES.users, [
      {
        id: 'u-admin',
        name: 'Admin',
        email: 'admin@ihcstore.com',
        password: 'admin123',
        role: 'admin',
        phone: '',
        address: '',
        createdAt: new Date().toISOString()
      }
    ]);
  }

  const settings = readJSON(FILES.settings, null);
  if (!settings || typeof settings !== 'object' || !Object.keys(settings).length) {
    writeJSON(FILES.settings, {
      primaryColor: '#00d4ff',
      accentColor: '#bc13fe',
      siteTitle: 'IHC Store',
      welcomeText: 'Sua melhor experiência em hardware',
      logoUrl: ''
    });
  }

  const orders = readJSON(FILES.orders, null);
  if (!orders || !Array.isArray(orders)) writeJSON(FILES.orders, []);
}

seedIfEmpty();

function listProducts() {
  const products = readJSON(FILES.products, []);
  return products.sort((a, b) => (new Date(b.createdAt || 0)) - (new Date(a.createdAt || 0)));
}

function upsertProduct(id, body) {
  const products = readJSON(FILES.products, []);

  if (!id) {
    const newP = {
      id: uuidLike(),
      name: body.name,
      price: Number(body.price),
      category: body.category || 'Outros',
      stock: Number(body.stock || 0),
      image: body.image,
      description: body.description || '',
      badge: body.badge || '',
      sales: Number(body.sales || 0),
      createdAt: new Date().toISOString()
    };
    products.push(newP);
    writeJSON(FILES.products, products);
    return newP;
  }

  const idx = products.findIndex(p => String(p.id) === String(id));
  if (idx === -1) return null;

  const updated = {
    ...products[idx],
    ...['name', 'price', 'category', 'stock', 'image', 'description', 'badge'].reduce((acc, k) => {
      if (body[k] !== undefined) acc[k] = k === 'price' ? Number(body[k]) : k === 'stock' ? Number(body[k]) : body[k];
      return acc;
    }, {})
  };

  if (updated.price !== undefined) updated.price = Number(updated.price);
  if (updated.stock !== undefined) updated.stock = Number(updated.stock);

  products[idx] = updated;
  writeJSON(FILES.products, products);
  return updated;
}

function deleteProduct(id) {
  const products = readJSON(FILES.products, []);
  const before = products.length;
  const next = products.filter(p => String(p.id) !== String(id));
  writeJSON(FILES.products, next);
  return before !== next.length;
}

function listUsers() {
  return readJSON(FILES.users, []).map(u => ({ ...u, password: undefined }));
}

function findUserByEmail(email) {
  return readJSON(FILES.users, []).find(u => u.email === email) || null;
}

function findUserById(id) {
  return readJSON(FILES.users, []).find(u => String(u.id) === String(id)) || null;
}

function createUser({ name, email, password }) {
  const users = readJSON(FILES.users, []);
  if (users.some(u => u.email === email)) return null;
  const newU = {
    id: uuidLike(),
    name,
    email,
    password,
    role: 'customer',
    phone: '',
    address: '',
    createdAt: new Date().toISOString()
  };
  users.push(newU);
  writeJSON(FILES.users, users);
  return newU;
}

function updateAdminPassword(adminId, currentPassword, newPassword) {
  const users = readJSON(FILES.users, []);
  const idx = users.findIndex(u => String(u.id) === String(adminId));
  if (idx === -1) return { ok: false, error: 'Usuário não encontrado' };
  if (users[idx].password !== currentPassword) return { ok: false, error: 'Senha atual incorreta' };
  users[idx].password = newPassword;
  writeJSON(FILES.users, users);
  return { ok: true };
}

function listOrders() {
  const orders = readJSON(FILES.orders, []);
  return orders.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

function listOrdersByCustomer(customerId) {
  return listOrders().filter(o => String(o.customerId) === String(customerId));
}

function createOrder({ customerId, customerEmail, items, total, address, paymentMethod }) {
  const products = readJSON(FILES.products, []);

  for (const item of items) {
    const prod = products.find(p => String(p.id) === String(item.id));
    if (!prod) return { ok: false, error: 'Produto não encontrado' };
    if (prod.stock < item.qty) return { ok: false, error: `Estoque insuficiente para ${prod.name}` };
  }

  for (const item of items) {
    const prod = products.find(p => String(p.id) === String(item.id));
    prod.stock = Number(prod.stock) - Number(item.qty);
    prod.sales = Number(prod.sales || 0) + Number(item.qty);
  }
  writeJSON(FILES.products, products);

  const orders = readJSON(FILES.orders, []);
  const newOrder = {
    id: uuidLike(),
    customerId,
    customerEmail,
    items,
    total: Number(total),
    address: address || '',
    paymentMethod: paymentMethod || 'card',
    status: 'Pendente',
    date: new Date().toISOString()
  };

  orders.push(newOrder);
  writeJSON(FILES.orders, orders);
  return { ok: true, order: newOrder };
}

function deleteOrdersBulk(ids) {
  const orders = readJSON(FILES.orders, []);
  const set = new Set(ids.map(String));
  const next = orders.filter(o => !set.has(String(o.id)));
  writeJSON(FILES.orders, next);
  return orders.length - next.length;
}

function updateOrderStatus(orderId, status) {
  const orders = readJSON(FILES.orders, []);
  const idx = orders.findIndex(o => String(o.id) === String(orderId));
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], status };
  writeJSON(FILES.orders, orders);
  return orders[idx];
}

function getSettings() {
  return readJSON(FILES.settings, {});
}

function saveSettings(newSettings) {
  writeJSON(FILES.settings, newSettings);
  return newSettings;
}

module.exports = {
  listProducts,
  upsertProduct,
  deleteProduct,
  listUsers,
  findUserByEmail,
  findUserById,
  createUser,
  updateAdminPassword,
  listOrders,
  listOrdersByCustomer,
  createOrder,
  deleteOrdersBulk,
  updateOrderStatus,
  getSettings,
  saveSettings
};
