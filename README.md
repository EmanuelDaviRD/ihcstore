# IHC Store - Loja de Peças de Computador

Uma plataforma de e-commerce moderna para venda de componentes de computador, com painel administrativo completo.

## 🚀 Funcionalidades

✅ **Catálogo de Produtos** - Amplo catálogo com filtros, busca e categorias
✅ **Sistema de Autenticação** - Login/Registro seguro com JWT
✅ **Carrinho de Compras** - Adicionar/remover produtos, cupons de desconto
✅ **Gerenciamento de Pedidos** - Histórico completo com rastreamento
✅ **Painel Administrativo** - Dashboard para gerenciar produtos, pedidos e usuários
✅ **Banco de Dados SQLite** - Armazenamento robusto e seguro
✅ **Segurança com Bcrypt** - Senhas criptografadas
✅ **Upload de Imagens** - Integração com Cloudinary (opcional)
✅ **Design Responsivo** - Interface moderna e mobile-friendly
✅ **Integração ViaCEP** - Busca automática de endereços

## 📋 Pré-requisitos

- Node.js v14+
- npm ou yarn

## 🔧 Instalação

### 1. Instalar dependências
```bash
cd backend
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` se necessário (geralmente funciona com valores padrão)

### 3. Executar o servidor

```bash
npm start
```

O servidor rodará em `http://localhost:3000`

## 👤 Credenciais Padrão

**Admin:**
- Email: `admin@ihcstore.com`
- Senha: `admin123`

⚠️ **IMPORTANTE**: Altere essas credenciais em produção!

## 📱 Usando a Aplicação

### Para Clientes
1. Acesse `http://localhost:3000`
2. Procure por produtos ou use filtros
3. Adicione ao carrinho
4. Faça login ou registre-se
5. Proceda para checkout

### Para Administradores
1. Acesse `http://localhost:3000/admin`
2. Use as credenciais de admin
3. Gerenciar produtos, pedidos e usuários
4. Personalizar layout e configurações

## 📊 Estrutura do Projeto

```
backend/
├── server.js              # Servidor Express
├── config/
│   ├── db.js              # SQLite (novo)
│   └── cloudinary.js      # Upload de imagens
├── data/
│   └── ihc_store.db       # Banco de dados SQLite
└── frontend/
    ├── index.html         # Loja
    ├── admin.html         # Admin
    ├── landing.html       # Home
    ├── app.js             # Lógica
    └── *.css              # Estilos
```

## 🗄️ Banco de Dados

SQLite com tabelas automáticas:
- **products** - Catálogo
- **users** - Usuários
- **orders** - Pedidos
- **settings** - Configurações

## 🔒 Segurança

- ✅ Bcrypt (hash de senhas)
- ✅ JWT com expiração
- ✅ Validação de dados
- ✅ Proteção de rotas admin
- ✅ CORS habilitado
- ✅ Variáveis de ambiente

## 📡 API Endpoints

### Produtos
```
GET    /produtos
POST   /produtos (admin)
PUT    /produtos/:id (admin)
DELETE /produtos/:id (admin)
```

### Autenticação
```
POST   /register
POST   /login
```

### Pedidos
```
POST   /pedidos
GET    /pedidos/usuario
GET    /pedidos (admin)
PUT    /pedidos/:id/status (admin)
DELETE /pedidos/bulk (admin)
```

### Admin
```
GET    /usuarios (admin)
GET    /admin-check
POST   /upload (admin)
PUT    /admin/change-password
```

## 🎨 Personalizações

No painel admin:
- Cores primárias e secundárias
- Título do site
- Logo
- Texto de boas-vindas

## 📦 Cupons

- `BEMVINDO10` - 10% desconto
- `VIP20` - 20% desconto

## 🚀 Deploy

Vercel, Heroku ou seu próprio servidor. Veja documentação para mais detalhes.

## 🐛 Troubleshooting

**Erro better-sqlite3:**
```bash
npm install better-sqlite3
```

**Porta em uso:**
```bash
PORT=3001 npm start
```

**Resetar banco:**
```bash
rm backend/data/ihc_store.db
npm start
```

---

**IHC Store** 🖥️💾

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/edclaudia-store.git
   cd edclaudia-store
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration (optional: Cloudinary credentials for image uploads)

4. **Run the server**
   ```bash
   npm start
   ```
   Server will be available at `http://localhost:3000`

## Usage

### Customer
- Visit `http://localhost:3000` to browse products
- Register/login to create an account
- Add products to cart and checkout
- Track order status in account dashboard

### Admin
- Login with admin credentials
- Visit `http://localhost:3000/admin` for admin dashboard
- Manage products: create, edit, delete
- Manage orders: view, update status, remove
- Manage users
- Configure site settings (colors, title, etc.)

### Default Admin Account
```
Email: admin@edclaudia.com
Password: admin123
```
⚠️ **Change this password immediately in production!**

## API Endpoints

### Authentication
- `POST /register` - Register new user
- `POST /login` - Login user

### Products
- `GET /produtos` - List all products
- `POST /produtos` - Create product (admin)
- `PUT /produtos/:id` - Update product (admin)
- `DELETE /produtos/:id` - Delete product (admin)

### Orders
- `POST /pedidos` - Create order
- `GET /pedidos/usuario` - Get user's orders
- `GET /pedidos` - Get all orders (admin)
- `PUT /pedidos/:id/status` - Update order status (admin)
- `DELETE /pedidos/bulk` - Delete multiple orders (admin)

### Admin
- `GET /admin-check` - Check if user is admin
- `PUT /admin/change-password` - Change admin password
- `GET /usuarios` - List users (admin)
- `GET /cep/:cep` - Lookup Brazilian CEP

### Settings
- `GET /settings` - Get site settings
- `POST /settings` - Update settings (admin)

### Uploads
- `POST /upload` - Upload image (admin)

## Data Persistence

All data is stored in JSON files in the `backend/data/` directory:
- `users.json` - User accounts and credentials
- `products.json` - Product catalog
- `orders.json` - Customer orders
- `settings.json` - Site configuration

## Development

### Available Scripts
```bash
npm start              # Start server (backend/server.js)
npm test              # Run tests (if configured)
```

### Adding Dependencies
```bash
npm install <package-name>
cd backend && npm install <package-name>
```

## Configuration

### Cloudinary (Optional - for image uploads)
1. Create account at [cloudinary.com](https://cloudinary.com)
2. Get your API credentials
3. Add to `.env`:
   ```
   CLOUDINARY_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

## Common Issues

### Port already in use
- Change `PORT` in `.env` or `backend/server.js`

### Cloudinary upload fails
- Verify credentials in `.env`
- Ensure upload folder permissions

### JSON data not persisting
- Check `backend/data/` directory exists
- Verify write permissions on `backend/data/` folder

## Contributing

1. Create a feature branch
2. Commit your changes
3. Push to the branch
4. Open a pull request

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.

---

**Made with ❤️ for Ed Claudia Store**
