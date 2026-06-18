const API_URL = window.location.origin;

let adminToken = null;
let currentPage = 'dashboard';
let productsCache = [];
let ordersCache = [];
let customersCache = [];
let salesChart = null;

function playTerminalBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(850, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } catch(e) {}
}

async function simulateBoot() {
    const loader = document.getElementById("terminal-loader");
    const content = document.getElementById("terminal-content");
    if (!loader) return;
    const lines = [
        { text: "> ACCESSING ADMIN_RESTRICTED_AREA...", type: "normal" },
        { text: "> AUTHENTICATING ROOT_USER...", type: "normal" },
        { text: "[OK] SESSION ENCRYPTED", type: "success" },
        { text: "> LOADING DASHBOARD_CORE...", type: "normal" }
    ];
    for (let i = 0; i < lines.length; i++) {
        const line = document.createElement("div");
        line.className = `terminal-line ${lines[i].type}`;
        line.innerText = lines[i].text;
        content.appendChild(line);
        playTerminalBeep();
        await new Promise(r => setTimeout(r, 150));
    }
    setTimeout(() => { loader.style.opacity = "0"; setTimeout(() => loader.remove(), 500); }, 500);
}

document.addEventListener("DOMContentLoaded", () => {
    simulateBoot();
    const savedToken = localStorage.getItem("adminToken");
    if (savedToken) {
        adminToken = savedToken;
        verifyTokenAndShow();
    }

    document.getElementById("adminLoginBtn").onclick = doAdminLogin;
    document.getElementById("adminLogoutBtn").onclick = doAdminLogout;

    document.querySelectorAll(".nav-item").forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            switchPage(item.dataset.page);
        };
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && document.getElementById("adminLoginScreen").style.display !== "none") {
            doAdminLogin();
        }
    });
});

async function verifyTokenAndShow() {
    try {
        const res = await fetch(`${API_URL}/admin-check`, {
            headers: { "Authorization": `Bearer ${adminToken}` }
        });
        if (!res.ok) throw new Error("Token inválido");
        showAdminApp();
    } catch (err) {
        localStorage.removeItem("adminToken");
        adminToken = null;
    }
}

async function doAdminLogin() {
    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (!res.ok) throw new Error("Credenciais inválidas");

        const data = await res.json();
        if (data.user.role !== "admin") {
            Swal.fire("Acesso Negado", "Esta conta não possui privilégios de administrador.", "error");
            return;
        }

        adminToken = data.token;
        localStorage.setItem("adminToken", adminToken);
        showAdminApp();
        Swal.fire({ title: "Bem-vindo!", text: `Painel Admin - ${data.user.name}`, icon: "success", confirmButtonColor: "#00d4ff" });
    } catch (err) {
        Swal.fire({ title: "Erro", text: err.message, icon: "error", confirmButtonColor: "#00d4ff" });
    }
}

function doAdminLogout() {
    localStorage.removeItem("adminToken");
    adminToken = null;
    location.reload();
}

function showAdminApp() {
    document.getElementById("adminLoginScreen").style.display = "none";
    document.getElementById("adminApp").style.display = "flex";
    loadDashboard();
}

function switchPage(page) {
    currentPage = page;
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    document.querySelector(`[data-page="${page}"]`).classList.add("active");

    const titles = {
        dashboard: '<i class="fas fa-chart-line"></i> Dashboard',
        products: '<i class="fas fa-box-open"></i> Produtos',
        orders: '<i class="fas fa-shopping-bag"></i> Pedidos',
        customers: '<i class="fas fa-users"></i> Clientes',
        layout: '<i class="fas fa-paint-brush"></i> Layout',
        settings: '<i class="fas fa-cog"></i> Configurações'
    };
    document.getElementById("pageTitle").innerHTML = titles[page];

    const content = document.getElementById("adminContent");
    content.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

    switch (page) {
        case 'dashboard': loadDashboard(); break;
        case 'products': loadProductsPage(); break;
        case 'orders': loadOrdersPage(); break;
        case 'customers': loadCustomersPage(); break;
        case 'layout': loadLayoutPage(); break;
        case 'settings': loadSettingsPage(); break;
    }
}

async function fetchWithAuth(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            "Authorization": `Bearer ${adminToken}`
        }
    });
    if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("adminToken");
        adminToken = null;
        Swal.fire("Sessão expirada", "Faça login novamente.", "warning").then(() => location.reload());
        throw new Error("Não autorizado");
    }
    return res;
}

async function loadDashboard() {
    try {
        const [productsRes, ordersRes, usersRes] = await Promise.all([
            fetch(`${API_URL}/produtos?all=true`),
            fetchWithAuth(`${API_URL}/pedidos`),
            fetchWithAuth(`${API_URL}/usuarios`)
        ]);

        if (!productsRes.ok || !ordersRes.ok || !usersRes.ok) {
            throw new Error("Uma ou mais requisições falharam (Verifique autenticação ou Banco de Dados)");
        }

        [productsCache, ordersCache, customersCache] = await Promise.all([
            productsRes.json(),
            ordersRes.json(),
            usersRes.json()
        ]);



        const totalSales = ordersCache.reduce((s, o) => s + o.total, 0);
        const totalOrders = ordersCache.length;
        const totalProducts = productsCache.length;
        const totalCustomers = customersCache.filter(u => u.role === "customer").length;
        const lowStock = productsCache.filter(p => p.stock < 5).length;

        const content = document.getElementById("adminContent");
        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card pink"><i class="fas fa-dollar-sign" style="font-size:2rem"></i><h3>R$ ${totalSales.toFixed(2)}</h3><p>Total em Vendas</p></div>
                <div class="stat-card purple"><i class="fas fa-shopping-bag" style="font-size:2rem"></i><h3>${totalOrders}</h3><p>Pedidos Realizados</p></div>
                <div class="stat-card gold"><i class="fas fa-box-open" style="font-size:2rem"></i><h3>${totalProducts}</h3><p>Produtos Cadastrados</p></div>
                <div class="stat-card cyan"><i class="fas fa-users" style="font-size:2rem"></i><h3>${totalCustomers}</h3><p>Clientes</p></div>
            </div>
            <div class="chart-container">
                <h3><i class="fas fa-chart-bar"></i> Vendas por Produto</h3>
                <canvas id="salesChart"></canvas>
            </div>
            <div class="section-card">
                <h3><i class="fas fa-exclamation-triangle" style="color:var(--gold)"></i> Estoque Baixo (${lowStock})</h3>
                ${lowStock > 0 ? `
                    <table class="data-table">
                        <thead><tr><th>Produto</th><th>Estoque</th><th>Ação</th></tr></thead>
                        <tbody>
                            ${productsCache.filter(p => p.stock < 5).map(p => `
                                <tr>
                                    <td><img src="${p.image}" alt="${p.name}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;margin-right:0.5rem;vertical-align:middle;">${p.name}</td>
                                    <td style="color:${p.stock === 0 ? '#ff4d4d' : 'var(--gold)'};font-weight:700;">${p.stock}</td>
                                    <td><button class="btn btn-edit btn-sm" onclick="editProduct('${p._id || p.id}')"><i class="fas fa-edit"></i> Editar</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p style="color:var(--text-dim)">Nenhum produto com estoque baixo!</p>'}
            </div>
        `;

        renderSalesChart();
    } catch (err) {

        document.getElementById("adminContent").innerHTML = `<div class="section-card"><h3 style="color:#ff4d4d">Erro ao carregar Dashboard</h3><p>Causa: ${err.message}</p></div>`;
    }
}

function renderSalesChart() {
    const ctx = document.getElementById("salesChart");
    if (!ctx) return;

    const sorted = [...productsCache].sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 8);

    if (salesChart) salesChart.destroy();

    salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(p => p.name.substring(0, 15)),
            datasets: [{
                label: 'Vendas',
                data: sorted.map(p => p.sales || 0),
                backgroundColor: 'rgba(0, 212, 255, 0.5)',
                borderColor: '#00d4ff',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8a8aa0' } },
                x: { grid: { display: false }, ticks: { color: '#8a8aa0' } }
            }
        }
    });
}

async function loadProductsPage() {
    try {
        const res = await fetch(`${API_URL}/produtos?all=true`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        productsCache = await res.json();

        const content = document.getElementById("adminContent");
        content.innerHTML = `
            <div class="section-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                    <h3><i class="fas fa-box-open"></i> Lista de Produtos</h3>
                    <button class="btn btn-add" onclick="openProductModal()"><i class="fas fa-plus"></i> Novo Produto</button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr><th>Status</th><th>Foto</th><th>Nome</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Vendas</th><th>Ações</th></tr>
                    </thead>
                    <tbody>
                        ${productsCache.map(p => `
                            <tr>
                                <td style="text-align:center">
                                    <button class="btn btn-sm" onclick="toggleProductActive('${p._id || p.id}', ${p.active !== false})" title="${p.active !== false ? 'Ocultar da Loja' : 'Mostrar na Loja'}">
                                        <i class="fas ${p.active !== false ? 'fa-eye' : 'fa-eye-slash'}" style="color: ${p.active !== false ? 'var(--primary)' : '#666'}"></i>
                                    </button>
                                </td>
                                <td><img src="${p.image}" alt="${p.name}"></td>
                                <td><strong>${p.name}</strong></td>
                                <td>${p.category}</td>
                                <td style="color:var(--gold);font-weight:700;">R$ ${p.price.toFixed(2)}</td>
                                <td style="color:${p.stock < 5 ? '#ff4d4d' : 'var(--text)'};font-weight:700;">${p.stock}</td>
                                <td>${p.sales || 0}</td>
                                <td>
                                    <button class="btn btn-edit btn-sm" onclick="editProduct('${p._id || p.id}')"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-delete btn-sm" onclick="deleteProduct('${p._id || p.id}')"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {

        document.getElementById("adminContent").innerHTML = `<div class="section-card"><h3 style="color:#ff4d4d">Erro ao carregar produtos</h3><p>${err.message}</p></div>`;
    }
}

async function toggleProductActive(id, currentStatus) {
    try {
        const res = await fetchWithAuth(`${API_URL}/produtos/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: !currentStatus })
        });

        if (!res.ok) throw new Error("Erro ao atualizar status");
        
        // Atualiza cache local para refletir a mudança imediatamente
        const prod = productsCache.find(p => (p._id || p.id) == id);
        if (prod) prod.active = !currentStatus;

        playTerminalBeep();
        loadProductsPage();
        
    } catch (err) {
        Swal.fire("Erro", err.message, "error");
    }
}

function openProductModal(product = null) {
    const isEdit = !!product;
    const modal = document.createElement("div");
    modal.className = "admin-modal show";
    modal.id = "productModal";
    modal.innerHTML = `
        <div class="admin-modal-content">
            <h2><i class="fas fa-${isEdit ? 'edit' : 'plus'}"></i> ${isEdit ? 'Editar' : 'Novo'} Produto</h2>
            <div class="admin-form">
                <div class="form-row">
                    <div><label>Nome</label><input type="text" id="prodName" value="${product?.name || ''}" placeholder="Nome do produto"></div>
                    <div><label>Categoria</label>
                        <select id="prodCategory">
                            <option value="Placas de Vídeo" ${product?.category === 'Placas de Vídeo' ? 'selected' : ''}>Placas de Vídeo</option>
                            <option value="Processadores" ${product?.category === 'Processadores' ? 'selected' : ''}>Processadores</option>
                            <option value="Placas-Mãe" ${product?.category === 'Placas-Mãe' ? 'selected' : ''}>Placas-Mãe</option>
                            <option value="Memória" ${product?.category === 'Memória' ? 'selected' : ''}>Memória</option>
                            <option value="Armazenamento" ${product?.category === 'Armazenamento' ? 'selected' : ''}>Armazenamento</option>
                            <option value="Energia" ${product?.category === 'Energia' ? 'selected' : ''}>Energia</option>
                            <option value="Gabinetes" ${product?.category === 'Gabinetes' ? 'selected' : ''}>Gabinetes</option>
                            <option value="Acessórios" ${product?.category === 'Acessórios' ? 'selected' : ''}>Acessórios</option>
                            <option value="Outros" ${product?.category === 'Outros' ? 'selected' : ''}>Outros</option>
                        </select>
                    </div>
                    </div>
                <div class="form-row">
                    <div><label>Preço (R$)</label><input type="number" id="prodPrice" value="${product?.price || ''}" step="0.01" placeholder="0.00"></div>
                    <div><label>Estoque</label><input type="number" id="prodStock" value="${product?.stock || ''}" placeholder="0"></div>
                    <div><label>Selo (Badge)</label>
                        <select id="prodBadge">
                            <option value="" ${!product?.badge ? 'selected' : ''}>Nenhum</option>
                            <option value="new" ${product?.badge === 'new' ? 'selected' : ''}>Lançamento (New)</option>
                            <option value="bestseller" ${product?.badge === 'bestseller' ? 'selected' : ''}>Mais Vendido</option>
                            <option value="sale" ${product?.badge === 'sale' ? 'selected' : ''}>Promoção</option>
                        </select>
                    </div>
                </div>

                <label>Descrição</label>
                <textarea id="prodDesc" rows="3" placeholder="Descrição do produto">${product?.description || ''}</textarea>
                ${product?.image ? `<img src="${product.image}" id="imgPreview" class="image-preview">` : '<img id="imgPreview" class="image-preview" style="display:none;">'}
                <div class="file-input-wrapper">
                    <label style="display:flex;align-items:center;gap:0.5rem;color:var(--text);font-weight:500">
                        <i class="fas fa-image"></i>
                        Link Direto da Imagem (Use o link que termina em .jpg)
                    </label>
                    <input type="url" id="imagemURL" value="${product?.image || ''}" placeholder="Ex: https://i.ibb.co/.../imagem.jpg" style="width:100%;padding:0.75rem;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--light-bg);margin-top:0.25rem" oninput="previewImage()">
                </div>

                <div style="display:flex;gap:1rem;margin-top:1rem;">
                    <button class="btn btn-save" onclick="saveProduct('${product?._id || product?.id || 'null'}')"><i class="fas fa-save"></i> Salvar</button>
                    <button class="btn btn-cancel" onclick="closeModal()"><i class="fas fa-times"></i> Cancelar</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
}

function previewImage() {
    let url = document.getElementById("imagemURL").value;
    
    // Auto-fix para links do ImgBB que não são diretos
    if (url.includes('ibb.co') && !url.includes('i.ibb.co')) {
        console.warn("Link do ImgBB detectado. Certifique-se de usar o 'Link Direto'.");
    }

    const preview = document.getElementById("imgPreview");
    if (url) {
        preview.src = url;
        preview.style.display = "block";
    } else {
        preview.style.display = "none";
    }
}

async function saveProduct(id) {
    const name = document.getElementById("prodName").value;
    const price = parseFloat(document.getElementById("prodPrice").value) || 0;
    const category = document.getElementById("prodCategory").value;
    const stock = parseInt(document.getElementById("prodStock").value, 10) || 0;
    const description = document.getElementById("prodDesc").value;
    const image = document.getElementById("imagemURL").value;
    const badge = document.getElementById("prodBadge").value;

    if (!name || !price) {
        Swal.fire("Erro", "Nome e preço são obrigatórios", "error");
        return;
    }

    const body = { name, price, category, stock, description, image, badge };

    try {
        const url = id && id !== 'null' ? `${API_URL}/produtos/${id}` : `${API_URL}/produtos`;
        const method = id && id !== 'null' ? "PUT" : "POST";
        const res = await fetchWithAuth(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Erro ao salvar produto");
        }

        productsCache = [];
        ordersCache = [];
        closeModal();
        Swal.fire("Sucesso!", `Produto ${id && id !== 'null' ? 'atualizado' : 'criado'} com sucesso.`, "success");
        loadProductsPage();
    } catch (err) {
        Swal.fire("Erro", err.message, "error");
    }
}

function editProduct(id) {
    const product = productsCache.find(p => (p._id || p.id) == id);
    if (product) openProductModal(product);
}

async function deleteProduct(id) {
    const result = await Swal.fire({
        title: "Confirmar exclusão?",
        text: "Esta ação não pode ser desfeita!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#00d4ff",
        cancelButtonColor: "#6B7280",
        confirmButtonText: "Sim, excluir!",
        cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetchWithAuth(`${API_URL}/produtos/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Erro ao excluir");
        productsCache = productsCache.filter(p => (p._id || p.id) != id);
        Swal.fire("Excluído!", "Produto removido.", "success");
        loadProductsPage();
    } catch (err) {
        Swal.fire("Erro", err.message, "error");
    }
}

function closeModal() {
    const modal = document.getElementById("productModal");
    if (modal) modal.remove();
}

async function loadOrdersPage() {
    try {
        if (ordersCache.length === 0) {
            const res = await fetchWithAuth(`${API_URL}/pedidos`);
            ordersCache = await res.json();
        }

        const content = document.getElementById("adminContent");
        content.innerHTML = `
            <div class="section-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.75rem;">
                    <h3><i class="fas fa-shopping-bag"></i> Pedidos (${ordersCache.length})</h3>
                    <button id="bulkDeleteBtn" class="btn btn-delete" disabled onclick="confirmBulkDeleteOrders()" style="opacity:0.5;transition:opacity 0.3s;">
                        <i class="fas fa-trash"></i> Remover Selecionados (<span id="selectedCount">0</span>)
                    </button>
                </div>
                <table class="data-table" id="ordersTable">
                    <thead>
                        <tr>
                            <th style="width:40px;text-align:center"><input type="checkbox" id="selectAllOrders" onclick="toggleSelectAllOrders()" style="cursor:pointer;width:18px;height:18px;accent-color:var(--gold)"></th>
                            <th>ID</th>
                            <th>Cliente</th>
                            <th>Itens</th>
                            <th>Total</th>
                            <th>Pagamento</th>
                            <th>Status</th>
                            <th>Data</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ordersCache.map(o => `
                            <tr data-order-id="${o._id || o.id}" style="transition:all 0.3s ease">
                                <td style="text-align:center"><input type="checkbox" class="order-checkbox" value="${o._id || o.id}" onchange="updateBulkDeleteState()" style="cursor:pointer;width:16px;height:16px;accent-color:var(--gold)"></td>
                                <td><strong onclick="showOrderDetails('${o._id || o.id}')" style="cursor:pointer;color:var(--primary);text-decoration:underline;">#${o._id || o.id}</strong></td>
                                <td>${o.customerEmail}</td>
                                <td>${o.items.length} item(s)</td>
                                <td style="color:var(--gold);font-weight:700;">R$ ${o.total.toFixed(2)}</td>
                                <td>${o.paymentMethod === 'card' ? 'Cartão' : o.paymentMethod === 'pix' ? 'PIX' : 'Boleto'}</td>
                                <td><span class="badge status-badge status-${o.status.toLowerCase()}">${o.status}</span></td>
                                <td>${new Date(o.date).toLocaleString('pt-BR')}</td>
                                <td>
                                    <button class="btn btn-edit btn-sm btn-status" onclick="openStatusModal('${o._id || o.id}', '${o.status}')">
                                        <i class="fas fa-edit"></i> Editar Status
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${ordersCache.length === 0 ? '<p style="color:var(--text-dim);text-align:center;padding:2rem;">Nenhum pedido encontrado.</p>' : ''}
            </div>
        `;
    } catch (err) {
        document.getElementById("adminContent").innerHTML = `<p style="color:#ff4d4d">Erro: ${err.message}</p>`;
    }
}

function toggleSelectAllOrders() {
    const master = document.getElementById('selectAllOrders');
    const boxes = document.querySelectorAll('.order-checkbox');
    boxes.forEach(b => b.checked = master.checked);
    updateBulkDeleteState();
}

function updateBulkDeleteState() {
    const checked = document.querySelectorAll('.order-checkbox:checked');
    const btn = document.getElementById('bulkDeleteBtn');
    const count = document.getElementById('selectedCount');
    if (btn) {
        btn.disabled = checked.length === 0;
        btn.style.opacity = checked.length === 0 ? '0.5' : '1';
    }
    if (count) count.innerText = checked.length;
}

async function confirmBulkDeleteOrders() {
    const checked = document.querySelectorAll('.order-checkbox:checked');
    const ids = Array.from(checked).map(c => c.value);
    if (ids.length === 0) return;

    const result = await Swal.fire({
        title: `Remover ${ids.length} pedido(s)?`,
        text: "Esta ação não pode ser desfeita!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ff4d4d",
        cancelButtonColor: "#6B7280",
        confirmButtonText: "Sim, remover!",
        cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetchWithAuth(`${API_URL}/pedidos/bulk`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids })
        });
        if (!res.ok) throw new Error("Erro ao remover pedidos");
        
        ordersCache = ordersCache.filter(o => !ids.includes(String(o._id || o.id)));
        
        ids.forEach((id, idx) => {
            const row = document.querySelector(`tr[data-order-id="${id}"]`);
            if (row) {
                row.style.transition = 'all 0.4s cubic-bezier(0.4,0,0.2,1)';
                row.style.opacity = '0';
                row.style.transform = 'translateX(30px)';
                setTimeout(() => row.remove(), 400);
            }
        });
        
        setTimeout(() => {
            updateBulkDeleteState();
            const table = document.getElementById('ordersTable');
            const tbody = table?.querySelector('tbody');
            if (tbody && tbody.children.length === 0) {
                document.getElementById("adminContent").innerHTML += '<p style="color:var(--text-dim);text-align:center;padding:2rem;">Nenhum pedido encontrado.</p>';
            }
        }, 450);
        
        Swal.fire("Removido!", `${ids.length} pedido(s) excluído(s).`, "success");
    } catch (err) {
        Swal.fire("Erro", err.message, "error");
    }
}

function showOrderDetails(orderId) {
    const order = ordersCache.find(o => (o._id || o.id) == orderId);
    if (!order) return;

    const modal = document.createElement("div");
    modal.className = "admin-modal show";
    modal.id = "orderDetailsModal";
    modal.innerHTML = `
        <div class="admin-modal-content" style="max-width:600px">
            <h2><i class="fas fa-file-invoice"></i> Detalhes do Pedido #${orderId.slice(-6)}</h2>
            <div style="margin:1.5rem 0; text-align:left; color:var(--text)">
                <p><strong>Cliente:</strong> ${order.customerEmail}</p>
                <p><strong>Data:</strong> ${new Date(order.date).toLocaleString('pt-BR')}</p>
                <p><strong>Status:</strong> ${order.status}</p>
                <p><strong>Método:</strong> ${order.paymentMethod}</p>
                <hr style="margin:1rem 0; border:0; border-top:1px solid var(--border)">
                <h4>Itens do Pedido:</h4>
                <div style="margin-top:0.5rem">
                    ${order.items.map(item => `
                        <div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid var(--border-light)">
                            <span>${item.name} x${item.qty}</span>
                            <span>R$ ${(item.price * item.qty).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="text-align:right; margin-top:1rem; font-size:1.2rem;">
                    <strong>Total: R$ ${order.total.toFixed(2)}</strong>
                </div>
            </div>
            <button class="btn btn-save" onclick="this.closest('.admin-modal').remove()">Fechar</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function openStatusModal(orderId, currentStatus) {
    const modal = document.createElement("div");
    modal.className = "admin-modal show";
    modal.id = "statusModal";
    modal.innerHTML = `
        <div class="admin-modal-content" style="animation:modalSlideIn 0.3s ease">
            <h2><i class="fas fa-edit"></i> Alterar Status do Pedido</h2>
            <div class="admin-form" style="margin-top:1.5rem">
                <label>Status Atual: <strong>${currentStatus}</strong></label>
                <select id="newStatus" style="margin-top:1rem;margin-bottom:1.5rem">
                    <option value="Pendente" ${currentStatus === 'Pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="Processando" ${currentStatus === 'Processando' ? 'selected' : ''}>Processando</option>
                    <option value="Enviado" ${currentStatus === 'Enviado' ? 'selected' : ''}>Enviado</option>
                    <option value="Entregue" ${currentStatus === 'Entregue' ? 'selected' : ''}>Entregue</option>
                    <option value="Cancelado" ${currentStatus === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
                <div style="display:flex;gap:1rem;">
                    <button class="btn btn-save" onclick="updateOrderStatus('${orderId}')"><i class="fas fa-save"></i> Salvar</button>
                    <button class="btn btn-cancel" onclick="closeStatusModal()"><i class="fas fa-times"></i> Cancelar</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) closeStatusModal(); };
}

async function updateOrderStatus(orderId) {
    const newStatus = document.getElementById("newStatus").value;
    try {
        const res = await fetchWithAuth(`${API_URL}/pedidos/${orderId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) throw new Error("Erro ao atualizar status");
        
        const order = ordersCache.find(o => (o._id || o.id) == orderId);
        if (order) order.status = newStatus;
        
        const row = document.querySelector(`tr[data-order-id="${orderId}"]`);
        if (row) {
            const badge = row.querySelector('.status-badge');
            if (badge) badge.textContent = newStatus;
        }
        
        closeStatusModal();
        Swal.fire("Sucesso!", `Status atualizado para "${newStatus}"`, "success");
    } catch (err) {
        Swal.fire("Erro", err.message, "error");
    }
}

function closeStatusModal() {
    const modal = document.getElementById("statusModal");
    if (modal) modal.remove();
}

async function loadCustomersPage() {
    try {
        if (customersCache.length === 0) {
            const res = await fetchWithAuth(`${API_URL}/usuarios`);
            customersCache = await res.json();
        }

        const content = document.getElementById("adminContent");
        content.innerHTML = `
            <div class="section-card">
                <h3><i class="fas fa-users"></i> Clientes (${customersCache.length})</h3>
                <table class="data-table">
                    <thead><tr><th>ID</th><th>Nome</th><th>E-mail</th><th>Tipo</th></tr></thead>
                    <tbody>
                        ${customersCache.map(u => `
                            <tr>
                                <td>${u._id || u.id}</td>
                                <td><strong>${u.name}</strong></td>
                                <td>${u.email}</td>
                                <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-customer'}">${u.role === 'admin' ? 'Admin' : 'Cliente'}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        document.getElementById("adminContent").innerHTML = `<p style="color:#ff4d4d">Erro: ${err.message}</p>`;
    }
}

async function loadLayoutPage() {
    try {
        const res = await fetch(`${API_URL}/settings`);
        const settings = res.ok ? await res.json() : {};
        
        const content = document.getElementById("adminContent");
        content.innerHTML = `
            <div class="section-card">
                <h3><i class="fas fa-paint-brush"></i> Editor de Layout</h3>
                <p style="color:var(--text-dim); margin-bottom:1.5rem;">Personalize a aparência da sua loja.</p>
                
                <div class="layout-section">
                    <h4><i class="fas fa-palette"></i> Cores Principais</h4>
                    <div class="color-presets">
                        <div class="color-preset" onclick="applyTheme('gold')" style="background: linear-gradient(135deg, #c9a96e, #b8945f);"><span>Dourado</span></div>
                        <div class="color-preset" onclick="applyTheme('blue')" style="background: linear-gradient(135deg, #60a5fa, #3b82f6);"><span>Azul</span></div>
                        <div class="color-preset" onclick="applyTheme('rose')" style="background: linear-gradient(135deg, #fb7185, #e11d48);"><span>Rosa</span></div>
                        <div class="color-preset" onclick="applyTheme('emerald')" style="background: linear-gradient(135deg, #34d399, #059669);"><span>Esmeralda</span></div>
                </div>

                <div class="layout-section">
                    <h4><i class="fas fa-sliders-h"></i> Customização</h4>
                    <div class="admin-form" style="max-width:500px;">
                        <label>Nível de Performance (Glow)</label>
                        <select id="performanceLevel" onchange="updatePreview()" style="margin-bottom:1.5rem">
                            <option value="low" ${settings.performanceLevel === 'low' ? 'selected' : ''}>Baixo (Eco)</option>
                            <option value="medium" ${!settings.performanceLevel || settings.performanceLevel === 'medium' ? 'selected' : ''}>Padrão (Balanced)</option>
                            <option value="overclock" ${settings.performanceLevel === 'overclock' ? 'selected' : ''}>Overclock (Ultra)</option>
                        </select>

                        <label>Cor Primária</label>
                        <div class="color-input-wrapper">
                            <input type="color" id="primaryColor" value="${settings.primaryColor || '#00d4ff'}" onchange="updatePreview()">
                            <span id="primaryColorHex">${settings.primaryColor || '#00d4ff'}</span>
                        </div>
                        
                        <label>Cor de Destaque</label>
                        <div class="color-input-wrapper">
                            <input type="color" id="accentColor" value="${settings.accentColor || '#bc13fe'}" onchange="updatePreview()">
                            <span id="accentColorHex">${settings.accentColor || '#bc13fe'}</span>
                        </div>

                        <label>Título do Site</label>
                        <input type="text" id="siteTitle" value="${settings.siteTitle || 'IHC Store'}" placeholder="Nome da loja">

                        <label>Frase de Boas-vindas</label>
                        <input type="text" id="welcomeText" value="${settings.welcomeText || 'Sua melhor experiência em hardware'}" placeholder="Slogan">

                        <label>Logo (URL)</label>
                        <input type="text" id="logoUrl" value="${settings.logoUrl || ''}" placeholder="https://...">
                    </div>

                <div class="layout-section">
                    <h4><i class="fas fa-eye"></i> Pré-visualização</h4>
                    <div id="layoutPreview" style="background: var(--dark-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem;">
                        <div style="display:flex; gap: 1rem; margin-bottom: 1rem;">
                            <div style="width: 80px; height: 80px; background: var(--primary); border-radius: var(--radius-sm);"></div>
                            <div style="flex: 1;">
                                <div style="height: 16px; background: var(--text); border-radius: 4px; margin-bottom: 8px; width: 60%;"></div>
                                <div style="height: 12px; background: var(--text-dim); border-radius: 4px; margin-bottom: 8px; width: 80%;"></div>
                                <div style="height: 12px; background: var(--text-dim); border-radius: 4px; width: 40%;"></div>
                        </div>
                        <button style="background: var(--primary); color: var(--bg); border: none; padding: 0.6rem 1.5rem; border-radius: var(--radius-sm); font-weight: 600;">Botão de Exemplo</button>
                    </div>

                <div style="display:flex; gap: 1rem; margin-top: 1.5rem;">
                    <button class="btn btn-save" onclick="saveLayoutSettings()"><i class="fas fa-save"></i> Salvar Alterações</button>
                    <button class="btn btn-cancel" onclick="resetLayoutSettings()"><i class="fas fa-undo"></i> Restaurar Padrão</button>
                </div>
        `;
    } catch (err) {
        document.getElementById("adminContent").innerHTML = `<p style="color:#ff4d4d">Erro: ${err.message}</p>`;
    }
}

function applyTheme(theme) {
    const themes = {
        gold: { primary: '#c9a96e', accent: '#7c6fae' },
        blue: { primary: '#60a5fa', accent: '#818cf8' },
        rose: { primary: '#fb7185', accent: '#c084fc' },
        emerald: { primary: '#34d399', accent: '#2dd4bf' }
    };
    const t = themes[theme];
    document.getElementById('primaryColor').value = t.primary;
    document.getElementById('accentColor').value = t.accent;
    updatePreview();
}

function updatePreview() {
    const primary = document.getElementById('primaryColor').value;
    const accent = document.getElementById('accentColor').value;
    document.getElementById('primaryColorHex').innerText = primary;
    document.getElementById('accentColorHex').innerText = accent;
    
    const perf = document.getElementById('performanceLevel').value;
    document.body.classList.remove('perf-low', 'perf-medium', 'perf-overclock');
    document.body.classList.add(`perf-${perf}`);

    const preview = document.getElementById('layoutPreview');
    preview.style.setProperty('--primary', primary);
    preview.style.setProperty('--accent', accent);
}

async function saveLayoutSettings() {
    const settings = {
        primaryColor: document.getElementById('primaryColor').value,
        accentColor: document.getElementById('accentColor').value,
        performanceLevel: document.getElementById('performanceLevel').value,
        siteTitle: document.getElementById('siteTitle').value || 'IHC Store',
        welcomeText: document.getElementById('welcomeText').value || 'Sua melhor experiência em hardware',
        logoUrl: document.getElementById('logoUrl').value
    };
    
    try {
        const res = await fetchWithAuth(`${API_URL}/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings)
        });
        if (!res.ok) throw new Error("Erro ao salvar");
        
        localStorage.setItem('ihc_layout', JSON.stringify(settings));
        applySettingsToFrontend(settings);
        Swal.fire("Sucesso!", "Layout salvo e aplicado!", "success");
    } catch (err) {
        Swal.fire("Erro", err.message, "error");
    }
}

function applySettingsToFrontend(settings) {
    const root = document.documentElement;
    if (settings.primaryColor) root.style.setProperty('--primary', settings.primaryColor);
    if (settings.accentColor) root.style.setProperty('--accent', settings.accentColor);
    if (settings.performanceLevel) {
        document.body.classList.remove('perf-low', 'perf-medium', 'perf-overclock');
        document.body.classList.add(`perf-${settings.performanceLevel}`);
    }
}

function resetLayoutSettings() {
    localStorage.removeItem('ihc_layout');
    Swal.fire("Restaurado!", "Layout padrão restaurado. Recarregue a página.", "success");
}

function loadSettingsPage() {
    const content = document.getElementById("adminContent");
    content.innerHTML = `
        <div class="section-card">
            <h3><i class="fas fa-cog"></i> Configurações da Loja</h3>
            <div class="admin-form" style="max-width:500px;">
                <label>Nome da Loja</label>
                <input type="text" value="IHC Store" id="storeName">
                <label>E-mail de Contato</label>
                <input type="email" value="admin@ihcstore.com" id="storeEmail">
                <label>Telefone</label>
                <input type="text" value="(85) 99742-9155" id="storePhone">
                <label>Frete Padrão (R$)</label>
                <input type="number" value="20.00" step="0.01" id="defaultShipping">
                <button class="btn btn-save" onclick="saveSettings()" style="margin-top:1rem;">
                    <i class="fas fa-save"></i> Salvar Configurações
                </button>
            </div>
        </div>
        <div class="section-card">
            <h3><i class="fas fa-shield-alt"></i> Segurança</h3>
            <p style="color:var(--text-dim);margin-bottom:1rem;">Altere a senha de administrador.</p>
            <div class="admin-form" style="max-width:500px;">
                <label>Senha Atual</label>
                <input type="password" id="currentPass" placeholder="••••••••">
                <label>Nova Senha</label>
                <input type="password" id="newPass" placeholder="Nova senha">
                <label>Confirmar Nova Senha</label>
                <input type="password" id="confirmPass" placeholder="Confirmar senha">
                <button class="btn btn-save" onclick="changeAdminPassword()" style="margin-top:1rem;">
                    <i class="fas fa-key"></i> Alterar Senha
                </button>
            </div>
        </div>
    `;
}

async function changeAdminPassword() {
    const currentPassword = document.getElementById("currentPass").value;
    const newPassword = document.getElementById("newPass").value;
    const confirmPassword = document.getElementById("confirmPass").value;

    if (!currentPassword || !newPassword) return Swal.fire("Erro", "Preencha os campos de senha", "error");
    if (newPassword !== confirmPassword) return Swal.fire("Erro", "A nova senha e a confirmação não coincidem", "error");

    try {
        const res = await fetchWithAuth(`${API_URL}/admin/change-password`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao alterar senha");

        Swal.fire("Sucesso!", "Senha alterada com sucesso!", "success");
        document.getElementById("currentPass").value = "";
        document.getElementById("newPass").value = "";
        document.getElementById("confirmPass").value = "";
    } catch (err) {
        Swal.fire("Erro", err.message, "error");
    }
}

function saveSettings() {
    Swal.fire("Sucesso!", "Configurações salvas (simulação).", "success");
}
