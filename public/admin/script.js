/* ================================================
   PROTEÇÃO DE ROTA
   ================================================ */
(function () {
    if (!sessionStorage.getItem('cisaAdminLogado')) {
        window.location.href = 'login.html';
    }
})();

/* ================================================
   PAINEL ADMIN — CISA DOCES
   ================================================ */
(function () {
    'use strict';

    const PRODUCTS_PER_PAGE = 8;

    /* =============================
       STATE
    ============================= */
    const state = {
        products: JSON.parse(localStorage.getItem('products') || '[]'),
        orders:   (JSON.parse(localStorage.getItem('orders')  || '[]')).sort((a, b) => new Date(b.date) - new Date(a.date)),
        history:  (JSON.parse(localStorage.getItem('history') || '[]')).sort((a, b) => new Date(b.date) - new Date(a.date)),
        ui: {
            currentPage: 'dashboard',
            salesChart: null,
            productsChart: null,
            newOrder: [],
            productPage: 1,
            productSearch: '',
            historicoPageVendas: 1,
            historicoPageCancel: 1,
            historicoFilter: { start: null, end: null },
        }
    };

    /* =============================
       DOM (montado após DOMContentLoaded)
    ============================= */
    let dom = {};

    function buildDom() {
        dom = {
            navLinks:       document.querySelectorAll('.nav-item'),
            pages:          document.querySelectorAll('.page'),
            darkModeToggle: document.getElementById('dark-mode-toggle'),
            quickSearchInput: document.getElementById('quick-search'),

            dailySales:          document.getElementById('vendas-dia'),
            monthlySales:        document.getElementById('vendas-mes'),
            avgTicket:           document.getElementById('ticket-medio'),
            newOrders:           document.getElementById('novos-pedidos'),
            salesChartCanvas:    document.getElementById('vendas-chart'),
            productsChartCanvas: document.getElementById('produtos-chart'),

            productListContainer: document.getElementById('product-list-container'),
            paginationContainer:  document.getElementById('pagination-container'),
            addProductBtn:        document.getElementById('add-product-btn'),
            productModal:         document.getElementById('product-modal'),
            productForm:          document.getElementById('product-form'),
            modalTitle:           document.getElementById('modal-title'),
            productIdInput:       document.getElementById('product-id'),
            productNameInput:     document.getElementById('product-name'),
            productCategoryInput: document.getElementById('product-category'),
            productDescriptionInput: document.getElementById('product-description'),
            productPriceInput:    document.getElementById('product-price'),
            productStockInput:    document.getElementById('product-stock'),
            productImageInput:    document.getElementById('product-image'),
            imagePreview:         document.getElementById('image-preview'),

            orderModal:          document.getElementById('order-modal'),
            orderProductSearch:  document.getElementById('order-product-search'),
            orderProductResults: document.getElementById('order-product-results'),
            orderItemsList:      document.getElementById('order-items-list'),
            orderTotalAmount:    document.getElementById('order-total-amount'),
            saveOrderBtn:        document.getElementById('save-order-btn'),
            newOrderBtn:         document.getElementById('new-order-btn'),

            orderDetailModal:    document.getElementById('order-detail-modal'),
            closeDetailModal:    document.getElementById('close-detail-modal'),

            startDateInput:          document.getElementById('start-date'),
            endDateInput:            document.getElementById('end-date'),
            generateReportBtn:       document.getElementById('generate-report-btn'),
            exportExcelBtn:          document.getElementById('export-excel-btn'),
            exportHistoryBtn:        document.getElementById('export-history-btn'),
            reportResultsContainer:  document.getElementById('report-results'),
            productRankingContainer: document.getElementById('product-ranking-container'),
            reportOrdersCard:        document.getElementById('report-orders-card'),
            reportOrdersTable:       document.getElementById('report-orders-table'),

            historicoStart:           document.getElementById('historico-start'),
            historicoEnd:             document.getElementById('historico-end'),
            historicoFilterBtn:       document.getElementById('historico-filter-btn'),
            historicoClearBtn:        document.getElementById('historico-clear-btn'),
            historicoLastUpdate:      document.getElementById('historico-last-update'),
            historicoTotalVendas:     document.getElementById('historico-total-vendas'),
            historicoTotalCancelados: document.getElementById('historico-total-cancelados'),
        };
    }

    /* =============================
       HELPERS
    ============================= */
    const fmt  = v  => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
    const fmtD = iso => new Date(iso).toLocaleDateString('pt-BR');
    const fmtDT= iso => new Date(iso).toLocaleString('pt-BR');

    /* =============================
       ACTIONS
    ============================= */
    const actions = {
        save() {
            const ordersNoStorage  = JSON.parse(localStorage.getItem('orders')  || '[]');
            const historyNoStorage = JSON.parse(localStorage.getItem('history') || '[]');

            const idsMemoria  = new Set(state.orders.map(o => o.id));
            const pedidosNovos = ordersNoStorage.filter(o => !idsMemoria.has(o.id));
            const ordersFinais = [...state.orders, ...pedidosNovos]
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            const idsHistMemoria = new Set(state.history.map(o => o.id));
            const histNovos  = historyNoStorage.filter(o => !idsHistMemoria.has(o.id));
            const histFinais = [...state.history, ...histNovos]
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            localStorage.setItem('products', JSON.stringify(state.products));
            localStorage.setItem('orders',   JSON.stringify(ordersFinais));
            localStorage.setItem('history',  JSON.stringify(histFinais));

            state.orders  = ordersFinais;
            state.history = histFinais;
        },

        getSalesMetrics() {
            const today = new Date().toLocaleDateString('pt-BR');
            const m = new Date().getMonth();
            const y = new Date().getFullYear();
            const salesToday = state.orders.filter(o => new Date(o.date).toLocaleDateString('pt-BR') === today).reduce((s, o) => s + o.total, 0);
            const salesMonth = state.orders.filter(o => { const d = new Date(o.date); return d.getMonth() === m && d.getFullYear() === y; }).reduce((s, o) => s + o.total, 0);
            const total      = state.orders.reduce((s, o) => s + o.total, 0);
            const avgTicket  = state.orders.length ? total / state.orders.length : 0;
            const newOrders  = state.orders.filter(o => o.status === 'Pendente').length;
            return { salesToday, salesMonth, avgTicket, newOrders };
        },

        addProduct(p) {
            state.products.push({ id: Date.now(), ...p });
            this.save();
            ui.renderProducts();
        },

        updateProduct(p) {
            const i = state.products.findIndex(x => x.id == p.id);
            if (i !== -1) { state.products[i] = { ...state.products[i], ...p }; this.save(); ui.renderProducts(); }
        },

        deleteProduct(id) {
            if (confirm('Excluir produto?')) {
                state.products = state.products.filter(p => p.id != id);
                this.save();
                ui.renderProducts();
                ui.renderDashboard();
            }
        },

        addOrder() {
            if (state.ui.newOrder.length === 0) { alert('Carrinho vazio.'); return; }
            const statusEl = document.getElementById('order-status');
            const order = {
                id:     Date.now(),
                date:   new Date().toISOString(),
                status: statusEl ? statusEl.value : 'Pendente',
                items:  state.ui.newOrder.map(i => ({ ...i })),
                total:  state.ui.newOrder.reduce((s, i) => s + i.price * i.quantity, 0),
                client: {
                    name:    document.getElementById('client-name').value.trim()    || '—',
                    phone:   document.getElementById('client-phone').value.trim()   || '—',
                    cep:     document.getElementById('client-cep').value.trim()     || '—',
                    address: document.getElementById('client-address').value.trim() || '—',
                    number:  document.getElementById('client-number').value.trim()  || '—',
                    city:    document.getElementById('client-city').value.trim()    || '—',
                }
            };

            // Desconta estoque
            order.items.forEach(item => {
                const p = state.products.find(p => p.id === item.productId);
                if (p) p.stock = Math.max(0, p.stock - item.quantity);
            });

            state.orders.unshift(order);
            state.ui.newOrder = [];
            this.save();
            ui.renderOrders();
            ui.renderProducts();
            ui.toggleOrderModal();
            ui.renderDashboard();
            alert('Pedido salvo com sucesso!');
        },

        updateOrderStatus(orderId, newStatus) {
            const o = state.orders.find(o => o.id == orderId);
            if (o) { o.status = newStatus; this.save(); ui.renderOrders(); ui.renderDashboard(); }
        },

        cancelOrder(orderId) {
            if (!confirm('Cancelar este pedido? Ele será movido para o histórico.')) return;
            const idx = state.orders.findIndex(o => o.id == orderId);
            if (idx === -1) return;
            const o = state.orders[idx];
            o.items.forEach(item => {
                const p = state.products.find(p => p.id === item.productId);
                if (p) p.stock += item.quantity;
            });
            state.history.unshift({ ...o, archivedAt: new Date().toISOString(), archivedStatus: 'cancelado' });
            state.orders.splice(idx, 1);
            this.save();
            ui.renderOrders();
            ui.renderProducts();
            ui.renderDashboard();
        },

        archiveOrders() {
            const now = new Date().toISOString();
            const toArchive = state.orders.filter(o => o.status === 'Pendente' || o.status === 'Entregue');
            if (!toArchive.length) return;
            toArchive.forEach(o => state.history.unshift({ ...o, archivedAt: now, archivedStatus: o.status === 'Entregue' ? 'venda' : 'cancelado' }));
            const ids = new Set(toArchive.map(o => o.id));
            state.orders = state.orders.filter(o => !ids.has(o.id));
            this.save();
            ui.renderOrders();
            ui.renderDashboard();
            if (state.ui.currentPage === 'historico') ui.renderHistorico();
        },

        scheduleMidnightArchive() {
            const now  = new Date();
            const next = new Date(now);
            next.setHours(24, 0, 0, 0);
            const delay = next - now;
            setTimeout(() => {
                this.archiveOrders();
                setInterval(() => this.archiveOrders(), 24 * 60 * 60 * 1000);
            }, delay);
            if (dom.historicoLastUpdate) {
                dom.historicoLastUpdate.innerHTML = `<i class="fas fa-clock"></i> Próximo arquivamento: ${next.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
            }
        },

        checkMissedArchive() {
            const last  = localStorage.getItem('lastArchiveDate');
            const today = new Date().toDateString();
            if (last && last !== today) this.archiveOrders();
            localStorage.setItem('lastArchiveDate', today);
        },

        generateRevenueReport(startDate, endDate) {
            if (!startDate || !endDate) return { orders: [], totalRevenue: 0, orderCount: 0, avgTicket: 0, byStatus: {} };
            const history = JSON.parse(localStorage.getItem('history') || '[]');
            const allOrders = [
                ...state.orders,
                ...history.map(h => ({ ...h, status: h.archivedStatus === 'venda' ? 'Entregue' : 'Cancelado' }))
            ];
            const filtered = allOrders.filter(o => {
                const d = (o.date || '').slice(0, 10);
                return d >= startDate && d <= endDate;
            });
            const totalRevenue = filtered.reduce((s, o) => s + o.total, 0);
            const byStatus = {};
            filtered.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
            return { orders: filtered, totalRevenue, orderCount: filtered.length, avgTicket: filtered.length ? totalRevenue / filtered.length : 0, byStatus };
        },

        getProductRanking() {
            const s = {};
            const history = JSON.parse(localStorage.getItem('history') || '[]');
            const allOrders = [...state.orders, ...history];
            allOrders.forEach(o => o.items.forEach(i => { const n = i.name || i.productName || "?"; s[n] = (s[n] || 0) + i.quantity; }));
            return Object.entries(s).sort((a, b) => b[1] - a[1]);
        },

        exportToExcel(startDate, endDate) {
            if (typeof XLSX === 'undefined') { alert('Biblioteca XLSX não carregada. Aguarde e tente novamente.'); return; }
            const { orders, totalRevenue, orderCount, avgTicket, byStatus } = this.generateRevenueReport(startDate, endDate);
            const wb = XLSX.utils.book_new();

            const resumoData = [
                ['RELATÓRIO DE VENDAS – CISA DOCES'],
                ['Período:', startDate ? `${startDate} a ${endDate}` : 'Todos'],
                ['Gerado em:', new Date().toLocaleString('pt-BR')],
                [],
                ['RESUMO'],
                ['Faturamento Total', totalRevenue],
                ['Total de Pedidos', orderCount],
                ['Ticket Médio', avgTicket],
                [],
                ['STATUS DOS PEDIDOS'],
                ...Object.entries(byStatus).map(([s, n]) => [s, n]),
                [],
                ['RANKING DE PRODUTOS (TOP 10)'],
                ['Produto', 'Qtd Vendida'],
                ...this.getProductRanking().slice(0, 10),
            ];
            const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
            wsResumo['!cols'] = [{ wch: 28 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

            const pedidosRows = [['#Pedido', 'Data', 'Status', 'Cliente', 'Telefone', 'CEP', 'Cidade', 'Endereço', 'Itens', 'Total (R$)']];
            orders.forEach(o => {
                const c = o.client || {};
                pedidosRows.push([
                    String(o.id).slice(-4), fmtD(o.date), o.status,
                    c.name || '—', c.phone || '—', c.cep || '—', c.city || '—',
                    `${c.address || '—'}, ${c.number || '—'}`,
                    o.items.map(i => `${i.quantity}x ${i.name || i.productName || "?"}`).join(' | '), o.total,
                ]);
            });
            const wsPedidos = XLSX.utils.aoa_to_sheet(pedidosRows);
            wsPedidos['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 28 }, { wch: 40 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(wb, wsPedidos, 'Pedidos');

            const itensRows = [['#Pedido', 'Data', 'Produto', 'Quantidade', 'Preço Unit.', 'Subtotal']];
            orders.forEach(o => {
                o.items.forEach(i => {
                    itensRows.push([String(o.id).slice(-4), fmtD(o.date), i.name || i.productName || "?", i.quantity, i.price, i.price * i.quantity]);
                });
            });
            const wsItens = XLSX.utils.aoa_to_sheet(itensRows);
            wsItens['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(wb, wsItens, 'Itens Vendidos');

            const label = startDate ? `${startDate}_${endDate}` : 'completo';
            XLSX.writeFile(wb, `relatorio_cisa_doces_${label}.xlsx`);
        },

        exportHistoryToExcel() {
            if (typeof XLSX === 'undefined') { alert('Biblioteca XLSX não carregada. Aguarde e tente novamente.'); return; }
            if (!state.history.length) { alert('Nenhum pedido no histórico para exportar.'); return; }
            const wb = XLSX.utils.book_new();

            const itensRows = [['#Pedido', 'Nome do Produto', 'Valor Unit. (R$)', 'Quantidade', 'Subtotal (R$)', 'Data do Pedido', 'Tipo']];
            state.history.forEach(entry => {
                entry.items.forEach(item => {
                    itensRows.push([
                        String(entry.id).slice(-4), item.name || item.productName || "?", item.price, item.quantity,
                        item.price * item.quantity, fmtD(entry.date),
                        entry.archivedStatus === 'venda' ? 'Venda' : 'Cancelado',
                    ]);
                });
            });
            const wsItens = XLSX.utils.aoa_to_sheet(itensRows);
            wsItens['!cols'] = [{ wch: 10 }, { wch: 26 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, wsItens, 'Itens do Histórico');

            const pedidosRows = [['#Pedido', 'Cliente', 'Data do Pedido', 'Arquivado em', 'Tipo', 'Total (R$)']];
            state.history.forEach(entry => {
                const c = entry.client || {};
                pedidosRows.push([
                    String(entry.id).slice(-4), c.name || '—',
                    fmtD(entry.date), fmtDT(entry.archivedAt),
                    entry.archivedStatus === 'venda' ? 'Venda' : 'Cancelado', entry.total,
                ]);
            });
            const wsPedidos = XLSX.utils.aoa_to_sheet(pedidosRows);
            wsPedidos['!cols'] = [{ wch: 10 }, { wch: 24 }, { wch: 16 }, { wch: 22 }, { wch: 12 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(wb, wsPedidos, 'Pedidos Arquivados');

            const vendas     = state.history.filter(e => e.archivedStatus === 'venda');
            const cancelados = state.history.filter(e => e.archivedStatus === 'cancelado');
            const totalVendas = vendas.reduce((s, e) => s + e.total, 0);
            const resumoRows = [
                ['HISTÓRICO DE PEDIDOS – CISA DOCES'],
                ['Gerado em:', new Date().toLocaleString('pt-BR')],
                [],
                ['RESUMO GERAL'],
                ['Total em Vendas (R$)', totalVendas],
                ['Pedidos Concluídos', vendas.length],
                ['Pedidos Cancelados', cancelados.length],
                ['Total Arquivado', state.history.length],
            ];
            const wsResumo = XLSX.utils.aoa_to_sheet(resumoRows);
            wsResumo['!cols'] = [{ wch: 26 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

            XLSX.writeFile(wb, `historico_cisa_doces_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
        },
    };

    /* =============================
       UI
    ============================= */
    const ui = {
        showPage(pageId) {
            dom.pages.forEach(p => p.classList.remove('active'));
            document.getElementById(pageId)?.classList.add('active');
            dom.navLinks.forEach(l => l.classList.toggle('active', l.dataset.page === pageId));
            state.ui.currentPage = pageId;
            if (pageId === 'relatorios') this.renderReportsPage();
            if (pageId === 'dashboard')  this.renderDashboard();
            if (pageId === 'produtos')   this.renderProducts();
            if (pageId === 'historico')  this.renderHistorico();
            if (pageId === 'pedidos')    this.renderOrders();
        },

        toggleTheme() {
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('darkMode', document.body.classList.contains('dark-theme'));
            if (state.ui.currentPage === 'dashboard') this.renderDashboard();
        },

        /* ── DASHBOARD ── */
        renderDashboard() {
            const { salesToday, salesMonth, avgTicket, newOrders } = actions.getSalesMetrics();
            dom.dailySales.textContent   = fmt(salesToday);
            dom.monthlySales.textContent = fmt(salesMonth);
            dom.avgTicket.textContent    = fmt(avgTicket);
            dom.newOrders.textContent    = newOrders;
            this.renderSalesChart();
            this.renderProductsChart();
        },

        renderSalesChart() {
            if (typeof Chart === 'undefined') return;
            const salesByDay = {};
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                salesByDay[d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })] = 0;
            }
            state.orders.forEach(o => {
                const k = new Date(o.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                if (k in salesByDay) salesByDay[k] += o.total;
            });
            if (state.ui.salesChart) state.ui.salesChart.destroy();
            state.ui.salesChart = new Chart(dom.salesChartCanvas, {
                type: 'line',
                data: {
                    labels: Object.keys(salesByDay),
                    datasets: [{
                        label: 'Vendas R$',
                        data: Object.values(salesByDay),
                        tension: 0.4, fill: true,
                        backgroundColor: 'rgba(217,170,183,0.15)',
                        borderColor: '#D9AAB7',
                        pointBackgroundColor: '#D9AAB7'
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
            });
        },

        renderProductsChart() {
            if (typeof Chart === 'undefined') return;
            const ranking = actions.getProductRanking().slice(0, 5);
            if (state.ui.productsChart) state.ui.productsChart.destroy();
            state.ui.productsChart = new Chart(dom.productsChartCanvas, {
                type: 'bar',
                data: {
                    labels: ranking.map(p => p[0]),
                    datasets: [{
                        label: 'Qtd vendida',
                        data: ranking.map(p => p[1]),
                        backgroundColor: ['#D9AAB7', '#A67B5B', '#10b981', '#f59e0b', '#3b82f6'],
                        borderRadius: 6
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
            });
        },

        /* ── PRODUTOS ── */
        renderProducts(searchTerm) {
            if (searchTerm !== undefined) { state.ui.productSearch = searchTerm; state.ui.productPage = 1; }
            const term     = state.ui.productSearch.toLowerCase();
            const filtered = state.products.filter(p => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
            const total    = filtered.length;
            const pages    = Math.ceil(total / PRODUCTS_PER_PAGE) || 1;
            const page     = Math.min(state.ui.productPage, pages);
            state.ui.productPage = page;
            const slice    = filtered.slice((page - 1) * PRODUCTS_PER_PAGE, page * PRODUCTS_PER_PAGE);

            dom.productListContainer.innerHTML = '';
            if (total === 0) {
                dom.productListContainer.innerHTML = '<p class="empty-msg">Nenhum produto encontrado.</p>';
                dom.paginationContainer.innerHTML = '';
                return;
            }

            slice.forEach(product => {
                const card = document.createElement('div');
                card.className = 'product-card';
                const stockClass = product.stock < 10 ? 'stock-low' : product.stock < 30 ? 'stock-mid' : 'stock-ok';
                card.innerHTML = `
                    <div class="product-card-img-wrap">
                        <img src="${product.image || 'https://i.imgur.com/QdG4x0a.png'}" alt="${product.name}" class="product-card-img">
                        <span class="product-card-category-tag">${product.category}</span>
                    </div>
                    <div class="product-card-body">
                        <h3 class="product-card-title">${product.name}</h3>
                        <div class="product-card-footer">
                            <span class="product-card-price">${fmt(product.price)}</span>
                            <span class="product-card-stock ${stockClass}">
                                <i class="fas fa-boxes"></i> ${product.stock}
                            </span>
                        </div>
                    </div>
                    <div class="product-card-actions">
                        <button class="action-btn edit-product" data-id="${product.id}" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-product" data-id="${product.id}" title="Excluir"><i class="fas fa-trash"></i></button>
                    </div>`;
                dom.productListContainer.appendChild(card);
            });

            // Paginação
            dom.paginationContainer.innerHTML = '';
            if (pages <= 1) return;
            const nav = document.createElement('div');
            nav.className = 'pagination';
            const mkBtn = (label, targetPage, disabled = false, active = false) => {
                const b = document.createElement('button');
                b.className = `page-btn${active ? ' active' : ''}`;
                b.innerHTML = label;
                b.disabled  = disabled;
                b.addEventListener('click', () => { state.ui.productPage = targetPage; ui.renderProducts(); });
                return b;
            };
            nav.appendChild(mkBtn('<i class="fas fa-chevron-left"></i>', page - 1, page === 1));
            for (let i = 1; i <= pages; i++) {
                if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - page) > 1) {
                    if (i === 3 || i === pages - 2) { const s = document.createElement('span'); s.className = 'page-dots'; s.textContent = '…'; nav.appendChild(s); }
                    continue;
                }
                nav.appendChild(mkBtn(i, i, false, i === page));
            }
            nav.appendChild(mkBtn('<i class="fas fa-chevron-right"></i>', page + 1, page === pages));
            const info = document.createElement('span');
            info.className = 'page-info';
            info.textContent = `${(page - 1) * PRODUCTS_PER_PAGE + 1}–${Math.min(page * PRODUCTS_PER_PAGE, total)} de ${total}`;
            nav.appendChild(info);
            dom.paginationContainer.appendChild(nav);
        },

        toggleProductModal(product = null) {
            dom.productForm.reset();
            dom.productIdInput.value = '';
            dom.imagePreview.style.display = 'none';
            dom.imagePreview.src = '';

            const tabUrl    = document.getElementById('img-tab-url');
            const tabFile   = document.getElementById('img-tab-file');
            const urlPanel  = document.getElementById('img-url-panel');
            const filePanel = document.getElementById('img-file-panel');
            if (tabUrl)   tabUrl.className  = 'img-tab-btn img-tab-active';
            if (tabFile)  tabFile.className = 'img-tab-btn';
            if (urlPanel)  urlPanel.style.display  = '';
            if (filePanel) filePanel.style.display = 'none';
            if (dom.productDescriptionInput) dom.productDescriptionInput.value = '';

            if (product) {
                dom.modalTitle.textContent          = 'Editar Produto';
                dom.productIdInput.value            = product.id;
                dom.productNameInput.value          = product.name;
                dom.productCategoryInput.value      = product.category;
                if (dom.productDescriptionInput) dom.productDescriptionInput.value = product.description || '';
                dom.productPriceInput.value         = product.price;
                dom.productStockInput.value         = product.stock;
                dom.productImageInput.value         = product.image || '';
                if (product.image) { dom.imagePreview.src = product.image; dom.imagePreview.style.display = 'block'; }
            } else {
                dom.modalTitle.textContent = 'Adicionar Produto';
            }
            dom.productModal.classList.toggle('active');
        },

        /* ── PEDIDOS ── */
        toggleOrderModal() {
            state.ui.newOrder = [];
            this.renderNewOrderCart();
            dom.orderProductSearch.value = '';
            dom.orderProductResults.innerHTML = '';
            ['client-name', 'client-phone', 'client-cep', 'client-address', 'client-number', 'client-city']
                .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            const statusEl = document.getElementById('order-status');
            if (statusEl) statusEl.value = 'Pendente';
            dom.orderModal.classList.toggle('active');
        },

        renderNewOrderCart() {
            if (state.ui.newOrder.length === 0) {
                dom.orderItemsList.innerHTML = `<p class="empty-cart-message">O carrinho está vazio</p>`;
                dom.orderTotalAmount.textContent = fmt(0);
                return;
            }
            dom.orderItemsList.innerHTML = '';
            const total = state.ui.newOrder.reduce((s, i) => s + i.price * i.quantity, 0);
            state.ui.newOrder.forEach(item => {
                const div = document.createElement('div');
                div.className = 'order-item';
                div.innerHTML = `
                    <div class="order-item-info">
                        <span class="order-item-name">${item.name || item.productName || "?"}</span>
                        <span class="order-item-price">${fmt(item.price * item.quantity)}</span>
                    </div>
                    <div class="order-item-controls">
                        <button data-id="${item.productId}" class="remove-from-cart">−</button>
                        <span class="order-item-qty">${item.quantity}</span>
                        <button data-id="${item.productId}" class="add-to-cart">+</button>
                    </div>`;
                dom.orderItemsList.appendChild(div);
            });
            dom.orderTotalAmount.textContent = fmt(total);
        },

        renderOrders() {
            const grupos = {
                'Pendente':   { container: document.getElementById('order-list-pendente'), count: document.getElementById('count-pendente') },
                'Em preparo': { container: document.getElementById('order-list-preparo'),  count: document.getElementById('count-preparo')  },
                'Entregue':   { container: document.getElementById('order-list-entregue'), count: document.getElementById('count-entregue') },
            };
            Object.values(grupos).forEach(({ container, count }) => { container.innerHTML = ''; count.textContent = '0'; });
            const por = { 'Pendente': [], 'Em preparo': [], 'Entregue': [] };
            state.orders.forEach(o => { if (o.status in por) por[o.status].push(o); });
            Object.values(por).forEach(arr => arr.sort((a, b) => new Date(b.date) - new Date(a.date)));

            Object.entries(por).forEach(([status, orders]) => {
                const { container, count } = grupos[status];
                count.textContent = orders.length;
                if (!orders.length) { container.innerHTML = `<p class="empty-orders">Nenhum pedido aqui.</p>`; return; }

                const table = document.createElement('table');
                table.className = 'order-table';
                table.innerHTML = `<thead><tr><th>#</th><th>Cliente</th><th>Itens</th><th>Data</th><th>Status</th><th>Total</th><th></th></tr></thead><tbody></tbody>`;
                orders.forEach(order => {
                    const c = order.client || {};
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>#${String(order.id).slice(-4)}</strong></td>
                        <td>${c.name || '—'}</td>
                        <td class="items-cell">${order.items.map(i => `${i.quantity}x ${i.name || i.productName || "?"}`).join(', ')}</td>
                        <td>${fmtD(order.date)}</td>
                        <td>
                            <select class="order-status-select" data-id="${order.id}">
                                <option ${order.status === 'Pendente'   ? 'selected' : ''}>Pendente</option>
                                <option ${order.status === 'Em preparo' ? 'selected' : ''}>Em preparo</option>
                                <option ${order.status === 'Entregue'   ? 'selected' : ''}>Entregue</option>
                            </select>
                        </td>
                        <td><strong>${fmt(order.total)}</strong></td>
                        <td style="display:flex;gap:6px;align-items:center;">
                            <button class="action-btn view-order-btn" data-id="${order.id}" title="Ver detalhes">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn cancel-order-btn" data-id="${order.id}" title="Cancelar pedido" style="color:#ef4444;">
                                <i class="fas fa-times"></i>
                            </button>
                        </td>`;
                    table.querySelector('tbody').appendChild(tr);
                });
                container.appendChild(table);
            });
        },

        openOrderDetail(orderId) {
            const order = state.orders.find(o => o.id == orderId);
            if (!order) return;
            const c = order.client || {};

            document.getElementById('detail-order-id').textContent    = `Pedido #${String(order.id).slice(-4)}`;
            document.getElementById('detail-order-date').textContent  = fmtDT(order.date);
            document.getElementById('detail-client-name').textContent    = c.name    || '—';
            document.getElementById('detail-client-phone').textContent   = c.phone   || '—';
            document.getElementById('detail-client-cep').textContent     = c.cep     || '—';
            document.getElementById('detail-client-city').textContent    = c.city    || '—';
            document.getElementById('detail-client-address').textContent = c.address ? `${c.address}, ${c.number || 's/n'}` : '—';

            const badge = document.getElementById('detail-order-status-badge');
            const badgeMap = { 'Pendente': 'badge-pendente', 'Em preparo': 'badge-preparo', 'Entregue': 'badge-entregue' };
            badge.textContent = order.status;
            badge.className   = `detail-status-badge ${badgeMap[order.status] || ''}`;

            const tbody = document.getElementById('detail-items-body');
            tbody.innerHTML = '';
            order.items.forEach(i => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${i.name || i.productName || "?"}</td><td>${i.quantity}</td><td>${fmt(i.price)}</td><td>${fmt(i.price * i.quantity)}</td>`;
                tbody.appendChild(tr);
            });
            document.getElementById('detail-total').textContent = fmt(order.total);
            dom.orderDetailModal.classList.add('active');
        },

        /* ── RELATÓRIOS ── */
        renderReportsPage() {
            this.renderProductRanking();
            dom.reportResultsContainer.innerHTML = '';
            dom.reportOrdersCard.style.display = 'none';
        },

        renderReportResults({ orders, totalRevenue, orderCount, avgTicket, byStatus }) {
            const statusHtml = Object.entries(byStatus).map(([s, n]) => `<span class="report-tag">${s}: <strong>${n}</strong></span>`).join('');
            dom.reportResultsContainer.innerHTML = `
                <div class="report-metrics">
                    <div class="report-metric"><span>Faturamento</span><strong>${fmt(totalRevenue)}</strong></div>
                    <div class="report-metric"><span>Pedidos</span><strong>${orderCount}</strong></div>
                    <div class="report-metric"><span>Ticket Médio</span><strong>${fmt(avgTicket)}</strong></div>
                </div>
                <div class="report-tags">${statusHtml}</div>`;

            if (orders.length > 0) {
                dom.reportOrdersCard.style.display = 'block';
                const rows = orders.map(o => {
                    const c = o.client || {};
                    return `<tr>
                        <td>#${String(o.id).slice(-4)}</td>
                        <td>${c.name || '—'}</td>
                        <td>${c.city || '—'}</td>
                        <td>${fmtD(o.date)}</td>
                        <td><span class="status-pill status-pill-${o.status.toLowerCase().replace(' ', '-')}">${o.status}</span></td>
                        <td>${o.items.map(i => `${i.quantity}x ${i.name || i.productName || "?"}`).join(', ')}</td>
                        <td><strong>${fmt(o.total)}</strong></td>
                    </tr>`;
                }).join('');
                dom.reportOrdersTable.innerHTML = `
                    <table class="order-table report-table">
                        <thead><tr><th>#</th><th>Cliente</th><th>Cidade</th><th>Data</th><th>Status</th><th>Itens</th><th>Total</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>`;
            } else {
                dom.reportOrdersCard.style.display = 'none';
            }
        },

        renderProductRanking() {
            const ranking = actions.getProductRanking();
            dom.productRankingContainer.innerHTML = '';
            if (!ranking.length) { dom.productRankingContainer.innerHTML = '<p>Nenhum produto vendido.</p>'; return; }
            const max = ranking[0][1];
            ranking.forEach(([name, qty], idx) => {
                const pct = Math.round(qty / max * 100);
                const el = document.createElement('div');
                el.className = 'ranking-item';
                el.innerHTML = `
                    <div class="ranking-row">
                        <span class="ranking-pos">${idx + 1}</span>
                        <span class="ranking-name">${name}</span>
                        <strong class="ranking-qty">${qty}</strong>
                    </div>
                    <div class="ranking-bar-bg"><div class="ranking-bar" style="width:${pct}%"></div></div>`;
                dom.productRankingContainer.appendChild(el);
            });
        },

        /* ── HISTÓRICO ── */
        renderHistorico(startDate, endDate, resetPage = true) {
            state.history = JSON.parse(localStorage.getItem('history') || '[]');

            if (startDate !== undefined) {
                state.ui.historicoFilter = { start: startDate || null, end: endDate || null };
            }
            const { start, end } = state.ui.historicoFilter;

            if (resetPage) {
                state.ui.historicoPageVendas = 1;
                state.ui.historicoPageCancel = 1;
            }

            let entries = [...state.history];
            if (start && end) {
                entries = entries.filter(e => {
                    const d = (e.archivedAt || e.date || '').slice(0, 10);
                    return d >= start && d <= end;
                });
            }

            const vendas     = entries.filter(e => e.archivedStatus === 'venda');
            const cancelados = entries.filter(e => e.archivedStatus === 'cancelado');

            dom.historicoTotalVendas.textContent     = fmt(vendas.reduce((s, e) => s + e.total, 0));
            dom.historicoTotalCancelados.textContent = `${cancelados.length} pedido${cancelados.length !== 1 ? 's' : ''}`;
            document.getElementById('count-historico-vendas').textContent     = vendas.length;
            document.getElementById('count-historico-cancelados').textContent = cancelados.length;

            this._renderHistoricoTable('historico-list-vendas',    'historicoPageVendas', vendas,     'Nenhuma venda no histórico.');
            this._renderHistoricoTable('historico-list-cancelados','historicoPageCancel', cancelados, 'Nenhum pedido cancelado no histórico.');
        },

        _renderHistoricoTable(containerId, pageKey, entries, empty) {
            const PER_PAGE = 10;
            const c = document.getElementById(containerId);
            c.innerHTML = '';

            if (!entries.length) { c.innerHTML = `<p class="empty-orders">${empty}</p>`; return; }

            const totalPages = Math.ceil(entries.length / PER_PAGE);
            let page = Math.min(state.ui[pageKey] || 1, totalPages);
            state.ui[pageKey] = page;
            const slice = entries.slice((page - 1) * PER_PAGE, page * PER_PAGE);

            const table = document.createElement('table');
            table.className = 'order-table';
            table.innerHTML = `<thead><tr><th>#</th><th>Cliente</th><th>Itens</th><th>Data Pedido</th><th>Arquivado em</th><th>Total</th></tr></thead><tbody></tbody>`;
            slice.forEach(e => {
                const cl = e.client || {};
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>#${String(e.id).slice(-4)}</strong></td>
                    <td>${cl.name || '—'}</td>
                    <td class="items-cell">${e.items.map(i => `${i.quantity}x ${i.name || i.productName || "?"}`).join(', ')}</td>
                    <td>${fmtD(e.date)}</td>
                    <td>${fmtDT(e.archivedAt)}</td>
                    <td><strong>${fmt(e.total)}</strong></td>`;
                table.querySelector('tbody').appendChild(tr);
            });
            c.appendChild(table);

            if (totalPages <= 1) return;
            const nav = document.createElement('div');
            nav.className = 'pagination';
            const mkBtn = (label, targetPage, disabled = false, active = false) => {
                const b = document.createElement('button');
                b.className = `page-btn${active ? ' active' : ''}`;
                b.innerHTML = label;
                b.disabled  = disabled;
                b.addEventListener('click', () => { state.ui[pageKey] = targetPage; ui.renderHistorico(undefined, undefined, false); });
                return b;
            };
            nav.appendChild(mkBtn('<i class="fas fa-chevron-left"></i>', page - 1, page === 1));
            for (let i = 1; i <= totalPages; i++) {
                if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - page) > 1) {
                    if (i === 3 || i === totalPages - 2) { const s = document.createElement('span'); s.className = 'page-dots'; s.textContent = '…'; nav.appendChild(s); }
                    continue;
                }
                nav.appendChild(mkBtn(i, i, false, i === page));
            }
            nav.appendChild(mkBtn('<i class="fas fa-chevron-right"></i>', page + 1, page === totalPages));
            const info = document.createElement('span');
            info.className = 'page-info';
            info.textContent = `${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, entries.length)} de ${entries.length}`;
            nav.appendChild(info);
            c.appendChild(nav);
        },
    };

    /* =============================
       LISTENERS
    ============================= */
    function setupListeners() {
        dom.navLinks.forEach(l => l.addEventListener('click', e => { e.preventDefault(); ui.showPage(l.dataset.page); }));
        dom.darkModeToggle.addEventListener('change', () => ui.toggleTheme());
        dom.quickSearchInput.addEventListener('keyup', e => {
            if (state.ui.currentPage !== 'produtos') ui.showPage('produtos');
            ui.renderProducts(e.target.value);
        });

        // Product modal
        dom.addProductBtn.addEventListener('click', () => ui.toggleProductModal());
        dom.productModal.querySelector('.close-modal').addEventListener('click', () => ui.toggleProductModal());
        dom.productModal.addEventListener('click', e => { if (e.target === dom.productModal) ui.toggleProductModal(); });
        dom.productForm.addEventListener('submit', e => {
            e.preventDefault();
            const data = {
                id:          dom.productIdInput.value,
                name:        dom.productNameInput.value.trim(),
                category:    dom.productCategoryInput.value.trim(),
                description: dom.productDescriptionInput ? dom.productDescriptionInput.value.trim() : '',
                price:       parseFloat(dom.productPriceInput.value),
                stock:       parseInt(dom.productStockInput.value),
                image:       dom.productImageInput.value.trim()
            };
            if (data.id) actions.updateProduct(data); else actions.addProduct(data);
            ui.toggleProductModal();
        });
        dom.productListContainer.addEventListener('click', e => {
            if (e.target.closest('.edit-product'))   ui.toggleProductModal(state.products.find(p => p.id == e.target.closest('.edit-product').dataset.id));
            if (e.target.closest('.delete-product')) actions.deleteProduct(e.target.closest('.delete-product').dataset.id);
        });

        // Order modal
        dom.newOrderBtn.addEventListener('click', () => ui.toggleOrderModal());
        dom.orderModal.addEventListener('click', e => { if (e.target === dom.orderModal) ui.toggleOrderModal(); });
        dom.orderModal.querySelector('.close-modal').addEventListener('click', () => ui.toggleOrderModal());
        dom.saveOrderBtn.addEventListener('click', () => actions.addOrder());

        dom.orderProductSearch.addEventListener('keyup', e => {
            const term = e.target.value.toLowerCase();
            dom.orderProductResults.innerHTML = '';
            if (!term) return;
            state.products.filter(p => p.name.toLowerCase().includes(term)).forEach(product => {
                const div = document.createElement('div');
                div.className = 'order-product-result';
                div.dataset.id = product.id;
                div.innerHTML = `<span>${product.name}</span><strong>${fmt(product.price)}</strong>`;
                dom.orderProductResults.appendChild(div);
            });
        });

        dom.orderProductResults.addEventListener('click', e => {
            const item = e.target.closest('.order-product-result');
            if (!item) return;
            const product = state.products.find(p => p.id === Number(item.dataset.id));
            if (!product) return;
            const ex = state.ui.newOrder.find(i => i.productId === product.id);
            if (ex) ex.quantity++;
            else state.ui.newOrder.push({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
            ui.renderNewOrderCart();
        });

        dom.orderItemsList.addEventListener('click', e => {
            const id = Number(e.target.dataset.id);
            const item = state.ui.newOrder.find(i => i.productId === id);
            if (!item) return;
            if (e.target.classList.contains('add-to-cart')) item.quantity++;
            if (e.target.classList.contains('remove-from-cart')) {
                item.quantity--;
                if (item.quantity <= 0) state.ui.newOrder = state.ui.newOrder.filter(i => i.productId !== id);
            }
            ui.renderNewOrderCart();
        });

        // CEP mask
        const cepInput = document.getElementById('client-cep');
        if (cepInput) cepInput.addEventListener('input', e => {
            let v = e.target.value.replace(/\D/g, '').slice(0, 8);
            if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
            e.target.value = v;
        });

        // Order tables - status selects + view btn
        ['order-list-pendente', 'order-list-preparo', 'order-list-entregue'].forEach(id => {
            const el = document.getElementById(id);
            el.addEventListener('change', e => { if (e.target.classList.contains('order-status-select')) actions.updateOrderStatus(e.target.dataset.id, e.target.value); });
            el.addEventListener('click', e => {
                const viewBtn   = e.target.closest('.view-order-btn');
                const cancelBtn = e.target.closest('.cancel-order-btn');
                if (viewBtn)   ui.openOrderDetail(viewBtn.dataset.id);
                if (cancelBtn) actions.cancelOrder(cancelBtn.dataset.id);
            });
        });

        // Order detail modal
        dom.closeDetailModal.addEventListener('click', () => dom.orderDetailModal.classList.remove('active'));
        dom.orderDetailModal.addEventListener('click', e => { if (e.target === dom.orderDetailModal) dom.orderDetailModal.classList.remove('active'); });

        // Reports
        dom.generateReportBtn.addEventListener('click', () => {
            const res = actions.generateRevenueReport(dom.startDateInput.value, dom.endDateInput.value);
            ui.renderReportResults(res);
        });
        dom.exportExcelBtn.addEventListener('click', () => {
            actions.exportToExcel(dom.startDateInput.value, dom.endDateInput.value);
        });
        if (dom.exportHistoryBtn) dom.exportHistoryBtn.addEventListener('click', () => {
            state.history = JSON.parse(localStorage.getItem('history') || '[]');
            actions.exportHistoryToExcel();
        });

        // Histórico
        dom.historicoFilterBtn.addEventListener('click', () => {
            state.ui.historicoPageVendas = 1;
            state.ui.historicoPageCancel = 1;
            ui.renderHistorico(dom.historicoStart.value, dom.historicoEnd.value);
        });
        dom.historicoClearBtn.addEventListener('click', () => {
            dom.historicoStart.value = '';
            dom.historicoEnd.value   = '';
            state.ui.historicoPageVendas = 1;
            state.ui.historicoPageCancel = 1;
            state.ui.historicoFilter = { start: null, end: null };
            ui.renderHistorico(null, null);
        });

        // ── Sincronização em tempo real ──────────────────────────────
        // Detecta pedidos feitos pelo cliente em OUTRA aba
        window.addEventListener('storage', (e) => {
            if (e.key === 'orders' || e.key === 'products') {
                const novosOrders = JSON.parse(localStorage.getItem('orders') || '[]');
                const idsAtuais   = new Set(state.orders.map(o => o.id));
                const novos       = novosOrders.filter(o => !idsAtuais.has(o.id));
                if (novos.length > 0 || e.key === 'products') {
                    state.orders   = novosOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
                    state.products = JSON.parse(localStorage.getItem('products') || '[]');
                    ui.renderOrders();
                    ui.renderDashboard();
                    ui.renderProducts();
                }
            }
        });

        // Polling a cada 5s para detectar mudanças na MESMA aba (ex: pedido feito pelo cliente na mesma janela)
        setInterval(() => {
            const ordersStorage = JSON.parse(localStorage.getItem('orders') || '[]');
            const idsAtuais     = new Set(state.orders.map(o => o.id));
            const novos         = ordersStorage.filter(o => !idsAtuais.has(o.id));
            if (novos.length > 0) {
                state.orders = ordersStorage.sort((a, b) => new Date(b.date) - new Date(a.date));
                ui.renderOrders();
                ui.renderDashboard();
            }
        }, 5000);
    }

    /* =============================
       SEED DE DADOS
    ============================= */
    function seedData() {
        // ── Produtos — cardápio real da Cisa Doces ───────────────────
        const produtosSeed = [
            { name: 'Bolo de Red Velvet',               category: 'Bolos',       price: 110.00, stock: 10, image: '/src/assets/bolo red velvet.png',              description: 'Bolo red velvet macio com leve sabor de cacau, recheado e coberto com creme suave de cream cheese.' },
            { name: 'Bolo Trufado',                     category: 'Bolos',       price: 90.00,  stock: 10, image: '/src/assets/bolo trufado.png',                 description: 'Massa de chocolate macia com recheio trufado cremoso e cobertura rica em chocolate.' },
            { name: 'Bolo de Prestígio',                category: 'Bolos',       price: 85.00,  stock: 10, image: '/src/assets/bolo prestigio.png',               description: 'Delicioso bolo de chocolate com recheio cremoso de coco, inspirado no clássico prestígio.' },
            { name: 'Bolo de Paçoca',                   category: 'Bolos',       price: 90.00,  stock: 10, image: '/src/assets/bolo de paçoca.png',               description: 'Massa fofinha com sabor marcante de amendoim, recheada com creme de paçoca cremoso.' },
            { name: 'Bolo de Chocolate',                category: 'Bolos',       price: 110.00, stock: 10, image: '/src/assets/bolo de chocolate.png',            description: 'Bolo de chocolate intenso, macio e úmido, com recheio e ganache como cobertura.' },
            { name: 'Bolo de Pistache',                 category: 'Bolos',       price: 250.00, stock: 5,  image: '/src/assets/bolo de pistache.png',             description: 'Massa delicada com sabor de pistache e recheio cremoso.' },
            { name: 'Bolo de Ninho com Morango',        category: 'Bolos',       price: 110.00, stock: 10, image: '/src/assets/bolo de ninho com morango.png',    description: 'Massa leve recheada com creme de leite ninho e pedaços de morango fresco.' },
            { name: 'Bolo de Churros',                  category: 'Bolos',       price: 100.00, stock: 10, image: '/src/assets/bolo de churros.png',              description: 'Bolo com sabor de canela e doce de leite, inspirado no clássico churros.' },
            { name: 'Torta de Limão',                   category: 'Tortas',      price: 65.00,  stock: 8,  image: '/src/assets/torta de limão.png',               description: 'Massa crocante com creme de limão suave e cobertura leve e delicada.' },
            { name: 'Torta de Mirtilo',                 category: 'Tortas',      price: 110.00, stock: 8,  image: '/src/assets/torta de mirtilo.png',             description: 'Massa amanteigada recheada com creme suave e cobertura de mirtilos.' },
            { name: 'Torta de Maracujá',                category: 'Tortas',      price: 75.00,  stock: 8,  image: '/src/assets/torta de maracuja.png',            description: 'Base crocante com recheio cremoso de maracujá, equilibrando doce e azedinho.' },
            { name: 'Cheesecake de Morango',            category: 'Cheesecakes', price: 85.00,  stock: 8,  image: '/src/assets/cheesecake de morango.png',        description: 'Cheesecake cremoso sobre base crocante, coberto com calda doce de morangos.' },
            { name: 'Cheesecake de Caramelo Salgado',   category: 'Cheesecakes', price: 70.00,  stock: 8,  image: '/src/assets/cheesecake de caramelo salgado.png', description: 'Cheesecake suave com cobertura de caramelo salgado.' },
            { name: 'Donuts de Doce de Leite (cx c/ 6un)', category: 'Donuts',   price: 48.00,  stock: 20, image: '/src/assets/donuts doce de leite.png',         description: 'Donuts macios recheados com doce de leite cremoso.' },
            { name: 'Donuts de Nutella (cx c/ 6un)',    category: 'Donuts',      price: 86.00,  stock: 20, image: '/src/assets/donuts nutella.png',               description: 'Donuts fofinhos recheados com Nutella cremosa.' },
            { name: 'Donuts de Ouro Branco (cx c/ 6un)',category: 'Donuts',      price: 72.00,  stock: 20, image: '/src/assets/donuts ouro branco.png',           description: 'Donuts macios recheados e finalizados com creme de chocolate Ouro Branco.' },
        ];
        produtosSeed.forEach((p, i) => {
            state.products.push({ id: 1000 + i, ...p });
        });

        // ── Clientes fictícios ────────────────────────────────────────
        const clients = [
            { name: 'Ana Lima',        phone: '(11) 91111-1111', cep: '01310-100', address: 'Av. Paulista',             number: '1000', city: 'São Paulo'  },
            { name: 'Carlos Souza',    phone: '(11) 92222-2222', cep: '04038-001', address: 'Rua Vergueiro',             number: '42',   city: 'São Paulo'  },
            { name: 'Mariana Costa',   phone: '(15) 93333-3333', cep: '18035-300', address: 'Rua Brigadeiro',            number: '200',  city: 'Sorocaba'   },
            { name: 'Pedro Alves',     phone: '(15) 94444-4444', cep: '18047-500', address: 'Av. Dom Aguirre',           number: '500',  city: 'Sorocaba'   },
            { name: 'Juliana Neves',   phone: '(11) 95555-5555', cep: '05508-010', address: 'Rua Butantã',               number: '80',   city: 'São Paulo'  },
            { name: 'Rafael Mendes',   phone: '(15) 96666-6666', cep: '18013-000', address: 'Rua Quinze de Novembro',    number: '320',  city: 'Sorocaba'   },
            { name: 'Fernanda Rocha',  phone: '(11) 97777-7777', cep: '04547-003', address: 'Av. Brigadeiro Faria Lima', number: '55',   city: 'São Paulo'  },
            { name: 'Lucas Carvalho',  phone: '(15) 98888-8888', cep: '18085-430', address: 'Rua dos Ipês',              number: '77',   city: 'Sorocaba'   },
            { name: 'Beatriz Santos',  phone: '(11) 99999-9999', cep: '01415-001', address: 'Rua Augusta',               number: '910',  city: 'São Paulo'  },
            { name: 'Thiago Oliveira', phone: '(15) 90000-0000', cep: '18046-430', address: 'Av. Pereira Lima',          number: '150',  city: 'Sorocaba'   },
        ];

        const rand    = arr => arr[Math.floor(Math.random() * arr.length)];
        const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        const daysAgo = (n, extraMs = 0) => new Date(Date.now() - n * 86400000 + extraMs).toISOString();

        // ── Pedidos de hoje — todos Pendente ─────────────────────────
        const pedidosHoje = [
            { client: clients[0], items: [{ p: 0, qty: 1 }, { p: 13, qty: 2 }] },  // Ana: Red Velvet + Donuts Doce de Leite
            { client: clients[2], items: [{ p: 11, qty: 1 }] },                     // Mariana: Cheesecake Morango
            { client: clients[4], items: [{ p: 8,  qty: 1 }, { p: 14, qty: 1 }] }, // Juliana: Torta Limão + Donuts Nutella
            { client: clients[7], items: [{ p: 4,  qty: 1 }] },                     // Lucas: Bolo Chocolate
            { client: clients[9], items: [{ p: 15, qty: 2 }, { p: 12, qty: 1 }] }, // Thiago: Donuts Ouro Branco + Cheesecake Caramelo
            { client: clients[1], items: [{ p: 6,  qty: 1 }] },                     // Carlos: Bolo Ninho com Morango
        ];
        pedidosHoje.forEach((pedido, i) => {
            const items = pedido.items.map(({ p, qty }) => ({
                productId: state.products[p].id,
                name:      state.products[p].name,
                price:     state.products[p].price,
                quantity:  qty,
            }));
            state.orders.push({
                id:     Date.now() + i,
                date:   new Date().toISOString(),
                status: 'Pendente',
                items,
                total:  items.reduce((s, it) => s + it.price * it.quantity, 0),
                client: pedido.client,
            });
        });

        // ── Histórico — vendas dos últimos 30 dias ───────────────────
        const vendasSeed = [
            // Semana 1 (1-7 dias atrás)
            { daysBack: 1, client: clients[3], items: [{ p: 5, qty: 1 }],                      status: 'venda' },  // Bolo Pistache
            { daysBack: 1, client: clients[6], items: [{ p: 13, qty: 3 }],                     status: 'venda' },  // Donuts Doce de Leite x3
            { daysBack: 2, client: clients[8], items: [{ p: 1, qty: 1 }, { p: 14, qty: 2 }],  status: 'venda' },  // Bolo Trufado + Donuts Nutella
            { daysBack: 2, client: clients[0], items: [{ p: 11, qty: 1 }],                     status: 'venda' },  // Cheesecake Morango
            { daysBack: 3, client: clients[5], items: [{ p: 7, qty: 1 }],                      status: 'venda' },  // Bolo Churros
            { daysBack: 3, client: clients[2], items: [{ p: 8, qty: 1 }, { p: 9, qty: 1 }],   status: 'venda' },  // Torta Limão + Mirtilo
            { daysBack: 4, client: clients[9], items: [{ p: 4, qty: 1 }],                      status: 'venda' },  // Bolo Chocolate
            { daysBack: 4, client: clients[1], items: [{ p: 15, qty: 2 }],                     status: 'venda' },  // Donuts Ouro Branco x2
            { daysBack: 5, client: clients[7], items: [{ p: 0, qty: 1 }],                      status: 'venda' },  // Red Velvet
            { daysBack: 5, client: clients[4], items: [{ p: 12, qty: 1 }, { p: 13, qty: 1 }], status: 'venda' },  // Cheesecake Caramelo + Donuts
            { daysBack: 6, client: clients[3], items: [{ p: 2, qty: 1 }],                      status: 'venda' },  // Bolo Prestígio
            { daysBack: 6, client: clients[6], items: [{ p: 10, qty: 1 }],                     status: 'venda' },  // Torta Maracujá
            { daysBack: 7, client: clients[8], items: [{ p: 6, qty: 1 }, { p: 14, qty: 1 }],  status: 'venda' },  // Ninho Morango + Donuts Nutella
            { daysBack: 7, client: clients[0], items: [{ p: 3, qty: 1 }],                      status: 'cancelado' }, // Bolo Paçoca — cancelado

            // Semana 2 (8-14 dias atrás)
            { daysBack: 8,  client: clients[1], items: [{ p: 5, qty: 1 }],                     status: 'venda' },
            { daysBack: 9,  client: clients[2], items: [{ p: 1, qty: 1 }, { p: 13, qty: 2 }], status: 'venda' },
            { daysBack: 9,  client: clients[5], items: [{ p: 11, qty: 1 }],                    status: 'cancelado' },
            { daysBack: 10, client: clients[7], items: [{ p: 0, qty: 1 }],                     status: 'venda' },
            { daysBack: 10, client: clients[9], items: [{ p: 8, qty: 1 }, { p: 15, qty: 1 }], status: 'venda' },
            { daysBack: 11, client: clients[3], items: [{ p: 4, qty: 1 }],                     status: 'venda' },
            { daysBack: 12, client: clients[6], items: [{ p: 7, qty: 1 }, { p: 14, qty: 2 }], status: 'venda' },
            { daysBack: 13, client: clients[4], items: [{ p: 12, qty: 1 }],                    status: 'venda' },
            { daysBack: 14, client: clients[8], items: [{ p: 9, qty: 1 }],                     status: 'cancelado' },

            // Semana 3 (15-21 dias atrás)
            { daysBack: 15, client: clients[0], items: [{ p: 2, qty: 1 }, { p: 13, qty: 3 }], status: 'venda' },
            { daysBack: 16, client: clients[1], items: [{ p: 6, qty: 1 }],                     status: 'venda' },
            { daysBack: 17, client: clients[5], items: [{ p: 5, qty: 1 }],                     status: 'venda' },
            { daysBack: 18, client: clients[2], items: [{ p: 10, qty: 1 }, { p: 15, qty: 2 }],status: 'venda' },
            { daysBack: 19, client: clients[7], items: [{ p: 3, qty: 1 }],                     status: 'cancelado' },
            { daysBack: 20, client: clients[9], items: [{ p: 11, qty: 1 }, { p: 14, qty: 1 }],status: 'venda' },
            { daysBack: 21, client: clients[3], items: [{ p: 1, qty: 1 }],                     status: 'venda' },

            // Semana 4 (22-30 dias atrás)
            { daysBack: 22, client: clients[4], items: [{ p: 0, qty: 1 }, { p: 13, qty: 2 }], status: 'venda' },
            { daysBack: 23, client: clients[6], items: [{ p: 8, qty: 1 }],                     status: 'venda' },
            { daysBack: 24, client: clients[8], items: [{ p: 4, qty: 1 }, { p: 15, qty: 1 }], status: 'venda' },
            { daysBack: 25, client: clients[0], items: [{ p: 7, qty: 1 }],                     status: 'cancelado' },
            { daysBack: 26, client: clients[1], items: [{ p: 12, qty: 1 }, { p: 14, qty: 2 }],status: 'venda' },
            { daysBack: 27, client: clients[5], items: [{ p: 9, qty: 1 }],                     status: 'venda' },
            { daysBack: 28, client: clients[2], items: [{ p: 5, qty: 1 }],                     status: 'venda' },
            { daysBack: 29, client: clients[7], items: [{ p: 2, qty: 1 }, { p: 13, qty: 1 }], status: 'venda' },
            { daysBack: 30, client: clients[9], items: [{ p: 6, qty: 1 }],                     status: 'cancelado' },
        ];

        vendasSeed.forEach((entrada, i) => {
            const orderDate = daysAgo(entrada.daysBack);
            const archivedAt = daysAgo(entrada.daysBack, -randInt(3, 8) * 3600000); // arquivado algumas horas depois
            const items = entrada.items.map(({ p, qty }) => ({
                productId: state.products[p].id,
                name:      state.products[p].name,
                price:     state.products[p].price,
                quantity:  qty,
            }));
            state.history.push({
                id:             5000 + i,
                date:           orderDate,
                status:         entrada.status === 'venda' ? 'Entregue' : 'Pendente',
                items,
                total:          items.reduce((s, it) => s + it.price * it.quantity, 0),
                client:         entrada.client,
                archivedAt,
                archivedStatus: entrada.status,
            });
        });

        state.history.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
        actions.save();
    }


    /* =============================
       INIT
    ============================= */
    function init() {
        buildDom();

        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-theme');
            dom.darkModeToggle.checked = true;
        }

        const alreadySeeded = localStorage.getItem('seeded_v7');
        if (!alreadySeeded) {
            localStorage.removeItem('products');
            localStorage.removeItem('orders');
            localStorage.removeItem('history');
            localStorage.removeItem('seeded_v2');
            localStorage.removeItem('seeded_v3');
            localStorage.removeItem('seeded_v4');
            localStorage.removeItem('seeded_v5');
            localStorage.removeItem('seeded_v6');
            state.products = [];
            state.orders   = [];
            state.history  = [];
            seedData();
            localStorage.setItem('seeded_v7', '1');
        }

        actions.checkMissedArchive();
        actions.scheduleMidnightArchive();
        setupListeners();
        ui.showPage('dashboard');
        ui.renderProducts();
        ui.renderOrders();
    }

    document.addEventListener('DOMContentLoaded', init);
})();