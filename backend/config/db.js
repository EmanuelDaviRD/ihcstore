const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '..', 'data', 'ihc_store.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('❌ DB Error:', err);
  else console.log('✅ SQLite connected');
});

db.run('PRAGMA foreign_keys = ON');

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL,
        category TEXT NOT NULL, stock INTEGER NOT NULL, image TEXT,
        description TEXT, sales INTEGER DEFAULT 0, badge TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

      db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL, role TEXT DEFAULT 'customer',
        phone TEXT DEFAULT '', address TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

      db.run(`CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, items TEXT NOT NULL,
        total REAL NOT NULL, status TEXT DEFAULT 'pendente',
        shipping_address TEXT, payment_method TEXT, coupon_applied TEXT,
        discount_amount REAL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id))`);

      db.run(`CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY, key TEXT UNIQUE NOT NULL, value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`, (err) => {
        if (err) return reject(err);
        console.log('✅ Database schema ready');
        seedInitialData().then(resolve).catch(reject);
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)');
    });
  });
}

async function seedInitialData() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
        if (!err && row && row.count === 0) {
          const products = [
            { id: 'p1', name: 'RTX 4070 Ti Super', price: 5499.9, category: 'Placas de Vídeo', stock: 8, image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500', description: 'Placa gráfica potente para jogos em 4K.', sales: 18, badge: 'new' },
            { id: 'p2', name: 'Intel i9-13900K', price: 3899.9, category: 'Processadores', stock: 12, image: 'https://images.unsplash.com/photo-1591405351990-4726e331f141?w=500', description: 'Processador de alta performance para workstation.', sales: 27, badge: 'bestseller' },
            { id: 'p3', name: 'SSD NVMe 2TB Gen4', price: 899.9, category: 'Armazenamento', stock: 25, image: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=500', description: 'Velocidade extrema para seu sistema.', sales: 35, badge: 'sale' },
            { id: 'p4', name: 'RAM DDR5 32GB RGB', price: 1299.9, category: 'Memória', stock: 15, image: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=500', description: 'Estabilidade e beleza para seu setup.', sales: 9, badge: '' },
            { id: 'p5', name: 'Fonte 850W Gold Modular', price: 749.9, category: 'Energia', stock: 20, image: 'https://images.unsplash.com/photo-1587202395160-244303350328?w=500', description: 'Energia confiável para componentes de ponta.', sales: 5, badge: '' },
            { id: 'p6', name: 'Gabinete Airflow RGB', price: 499.9, category: 'Gabinetes', stock: 10, image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=500', description: 'Excelente refrigeração e design moderno.', sales: 2, badge: 'new' }
          ];
          products.forEach(p => {
            db.run('INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
              [p.id, p.name, p.price, p.category, p.stock, p.image, p.description, p.sales, p.badge]);
          });
        }
      });
      db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) return reject(err);
        if (row && row.count === 0) {
          const hashedPwd = bcrypt.hashSync('admin123', 10);
          db.run(
            'INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))',
            ['u-admin', 'Admin', 'admin@ihcstore.com', hashedPwd, 'admin', '', ''],
            (insertErr) => {
              if (insertErr) return reject(insertErr);
              resolve();
            }
          );
        } else {
          resolve();
        }
      });
    });
  });
}

module.exports = {
  db, initializeDatabase,
  listProducts: () => new Promise((r, e) => db.all('SELECT * FROM products ORDER BY sales DESC', (err, rows) => err ? e(err) : r(rows || []))),
  getProductById: (id) => new Promise((r, e) => db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => err ? e(err) : r(row))),
  upsertProduct: (id, data) => new Promise((r, e) => {
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
      if (err) return e(err);
      if (row) {
        const merged = { ...row, ...data };
        db.run('UPDATE products SET name=?, price=?, category=?, stock=?, image=?, description=?, sales=?, badge=? WHERE id=?',
          [merged.name, merged.price, merged.category, merged.stock, merged.image, merged.description, merged.sales, merged.badge, id],
          (err) => err ? e(err) : r(merged));
      } else {
        db.run('INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
          [id, data.name, data.price, data.category, data.stock, data.image, data.description, data.sales || 0, data.badge || ''],
          (err) => err ? e(err) : r({ id, ...data }));
      }
    });
  }),
  deleteProduct: (id) => new Promise((r, e) => db.run('DELETE FROM products WHERE id = ?', [id], function(err) { err ? e(err) : r(this.changes > 0); })),
  listUsers: () => new Promise((r, e) => db.all('SELECT id, name, email, role, phone, address, created_at FROM users', (err, rows) => err ? e(err) : r(rows || []))),
  findUserByEmail: (email) => new Promise((r, e) => db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => err ? e(err) : r(row))),
  createUser: (data) => new Promise((r, e) => {
    const id = data.id || 'u-' + Date.now();
    db.run('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))',
      [id, data.name, data.email, data.password, data.role || 'customer', data.phone || '', data.address || ''],
      (err) => err ? e(err) : r({id, ...data}));
  }),
  verifyAdminPassword: (currentPwd) => new Promise((r, e) => {
    db.get('SELECT password FROM users WHERE role = "admin" LIMIT 1', async (err, row) => {
      if (err) return e(err);
      if (!row) return r(false);
      try {
        const ok = await bcrypt.compare(currentPwd, row.password);
        r(ok);
      } catch (ex) {
        e(ex);
      }
    });
  }),

  updateAdminPassword: (pwd) => new Promise((r, e) => db.run('UPDATE users SET password = ? WHERE role = "admin"', [pwd], function(err) {
    if (err) return e(err);
    r(this.changes > 0);
  })),

  ensureDefaultAdmin: (defaultEmail, defaultPasswordPlain) => new Promise((r, e) => {
    db.get('SELECT id FROM users WHERE email = ? AND role = "admin" LIMIT 1', async (err, row) => {
      if (err) return e(err);
      if (row) return r(false);
      try {
        const hashed = await bcrypt.hash(defaultPasswordPlain, 10);
        const userId = 'u-admin';
        db.run(
          'INSERT INTO users (id, name, email, password, role, phone, address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))',
          [userId, 'Admin', defaultEmail, hashed, 'admin', '', ''],
          function(insertErr) {
            if (insertErr) return e(insertErr);
            r(true);
          }
        );
      } catch (ex) {
        e(ex);
      }
    });
  }),
  listOrders: () => new Promise((r, e) => db.all('SELECT * FROM orders ORDER BY created_at DESC', (err, rows) => err ? e(err) : r(rows || []))),
  listOrdersByCustomer: (uid) => new Promise((r, e) => db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [uid], (err, rows) => err ? e(err) : r(rows || []))),
  getOrderById: (id) => new Promise((r, e) => db.get('SELECT * FROM orders WHERE id = ?', [id], (err, row) => err ? e(err) : r(row))),
  createOrder: (data) => new Promise((r, e) => {
    const id = data.id || 'order-' + Date.now();
    db.run('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
      [id, data.user_id, JSON.stringify(data.items || []), data.total || 0, data.status || 'pendente', data.shipping_address || '', data.payment_method || '', data.coupon_applied || '', data.discount_amount || 0],
      (err) => err ? e(err) : r({id, ...data}));
  }),
  updateOrderStatus: (id, status) => new Promise((r, e) => db.run('UPDATE orders SET status = ?, updated_at = datetime("now") WHERE id = ?', [status, id], function(err) { err ? e(err) : r(this.changes > 0); })),
  deleteOrdersBulk: (ids) => new Promise((r, e) => {
    if (!ids?.length) return r(0);
    db.run(`DELETE FROM orders WHERE id IN (${ids.map(() => '?').join(',')})`, ids, function(err) { err ? e(err) : r(this.changes); });
  }),
  getSettings: () => new Promise((r, e) => db.all('SELECT key, value FROM settings', (err, rows) => {
    if (err) return e(err);
    const res = {};
    (rows || []).forEach(({key, value}) => { try { res[key] = JSON.parse(value); } catch { res[key] = value; } });
    r(res);
  })),
  saveSettings: (data) => new Promise((r, e) => {
    db.run('DELETE FROM settings', (err) => {
      if (err) return e(err);
      const keys = Object.keys(data);
      if (keys.length === 0) return r();
      let cnt = 0, total = keys.length;
      Object.entries(data).forEach(([k, v], i) => {
        db.run('INSERT INTO settings (id, key, value) VALUES (?, ?, ?)', [`s${i}`, k, JSON.stringify(v)], (err) => {
          if (err) return e(err);
          if (++cnt === total) r();
        });
      });
    });
  })
};
