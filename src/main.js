/* ================================================
   CISA DOCES — main.js
   ================================================ */

import './home.css';
import './cardapio.css';
import './usuario.css';

/* ------------------------------------------------
   ESTADO GLOBAL
------------------------------------------------ */
let usuarioLogado = null;
let carrinho      = [];
let produtoModal  = null;

/* ------------------------------------------------
   ROTEADOR
------------------------------------------------ */
const pages = {
  home:     document.getElementById('page-home'),
  cardapio: document.getElementById('page-cardapio'),
  login:    document.getElementById('page-login'),
  cadastro: document.getElementById('page-cadastro'),
  usuario:  document.getElementById('page-usuario'),
};

function showPage(name) {
  Object.entries(pages).forEach(([key, el]) => {
    el.style.display = key === name ? '' : 'none';
  });
  document.querySelectorAll('[data-page]').forEach((el) => {
    el.classList.toggle('active', el.dataset.page === name);
  });
  window.scrollTo(0, 0);
  if (name === 'home'    && window.__carrosselStart) window.__carrosselStart();
  if (name === 'cardapio') renderCardapioDinamico();
  if (name === 'usuario') renderUsuario();
  atualizarNavLogin();
}

/* roteador integrado na delegação abaixo */

/* ------------------------------------------------
   CARROSSEL
------------------------------------------------ */
(function () {
  'use strict';
  const track    = document.getElementById('carouselTrack');
  const slides   = Array.from(track.querySelectorAll('.slide'));
  const dotsEl   = Array.from(document.querySelectorAll('.dot'));
  const thumbsEl = Array.from(document.querySelectorAll('.thumb'));
  const slideNum = document.getElementById('slideNum');
  const fillEl   = document.getElementById('progressFill');
  const prevBtn  = document.getElementById('prevBtn');
  const nextBtn  = document.getElementById('nextBtn');

  const TOTAL = slides.length;
  const DELAY = 4000;
  let current = 0, autoTimer = null, touchStartX = 0;

  function goTo(index, direction) {
    if (index === current) return;
    const dir  = typeof direction !== 'undefined' ? direction : (index > current ? 1 : -1);
    const prev = current;
    current    = ((index % TOTAL) + TOTAL) % TOTAL;
    slides[prev].classList.remove('active');
    slides[prev].classList.add(dir >= 0 ? 'exit-left' : 'exit-right');
    slides[current].classList.remove('exit-left', 'exit-right');
    slides[current].classList.add('active');
    setTimeout(() => slides[prev].classList.remove('exit-left', 'exit-right'), 520);
    dotsEl.forEach((d, i)   => d.classList.toggle('active', i === current));
    thumbsEl.forEach((t, i) => t.classList.toggle('active', i === current));
    if (thumbsEl[current]) thumbsEl[current].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    slideNum.textContent = current + 1;
    resetProgress();
  }

  function resetProgress() {
    fillEl.style.transition = 'none';
    fillEl.style.width = '0%';
    void fillEl.offsetWidth;
    fillEl.style.transition = `width ${DELAY}ms linear`;
    fillEl.style.width = '100%';
  }

  function startAuto()   { autoTimer = setInterval(() => goTo(current + 1, 1), DELAY); }
  function stopAuto()    { clearInterval(autoTimer); }
  function restartAuto() { stopAuto(); startAuto(); }

  prevBtn.addEventListener('click', () => { goTo(current - 1, -1); restartAuto(); });
  nextBtn.addEventListener('click', () => { goTo(current + 1,  1); restartAuto(); });
  dotsEl.forEach((d, i)  => d.addEventListener('click', () => { goTo(i); restartAuto(); }));
  thumbsEl.forEach((t, i) => t.addEventListener('click', () => { goTo(i); restartAuto(); }));

  track.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchmove',  (e) => {
    if (Math.abs(touchStartX - e.touches[0].clientX) > 10) e.preventDefault();
  }, { passive: false });
  track.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { goTo(diff > 0 ? current + 1 : current - 1, diff > 0 ? 1 : -1); restartAuto(); }
  });

  document.addEventListener('keydown', (e) => {
    if (pages.home.style.display === 'none') return;
    if (e.key === 'ArrowLeft')  { goTo(current - 1, -1); restartAuto(); }
    if (e.key === 'ArrowRight') { goTo(current + 1,  1); restartAuto(); }
  });

  track.addEventListener('mouseenter', stopAuto);
  track.addEventListener('mouseleave', restartAuto);
  window.__carrosselStart = () => { restartAuto(); resetProgress(); };
  resetProgress();
  startAuto();
})();

/* ------------------------------------------------
   CARDÁPIO DINÂMICO — sincroniza com produtos do admin
   Produtos cadastrados no painel aparecem aqui
------------------------------------------------ */
function renderCardapioDinamico() {
  const grid = document.querySelector('#page-cardapio .grid-produtos');
  if (!grid) return;

  const produtosAdmin = JSON.parse(localStorage.getItem('products') || '[]');
  if (produtosAdmin.length === 0) return; /* sem produtos no admin — mantém os fixos do HTML */

  /* Mapeia categoria do admin para data-categoria do HTML */
  const catMap = {
    'bolo': 'bolos', 'bolos': 'bolos',
    'torta': 'tortas', 'tortas': 'tortas',
    'donut': 'donuts', 'donuts': 'donuts',
    'cheesecake': 'cheesecakes', 'cheesecakes': 'cheesecakes',
  };

  /* Remove todos os cards fixos do HTML */
  grid.innerHTML = '';

  produtosAdmin
    .filter(p => p.stock > 0) /* só mostra produtos com estoque */
    .forEach(p => {
      const catKey = Object.keys(catMap).find(k => p.category?.toLowerCase().includes(k)) || 'outros';
      const cat    = catMap[catKey] || 'outros';
      const preco  = `R$${Number(p.price).toFixed(2).replace('.', ',')}`;
      const img    = p.image || '/src/assets/donuts ouro branco.png';

      const div = document.createElement('div');
      div.className = 'produto';
      div.dataset.categoria = cat;
      div.dataset.preco     = preco;
      div.dataset.desc      = p.description || p.name;
      div.dataset.ing       = p.ingredients  || '';
      div.dataset.action = 'abrirModal';

      div.innerHTML = `
        <img class="imagem-produto" src="${img}" alt="${p.name}" loading="lazy"/>
        <h3>${p.name}</h3>
        <div class="preco">
          <a>${preco}</a>
          <div class="botoes">
            <button class="btn-sacola" data-action="adicionarCarrinho">
              <img class="b-sacola" src="/src/assets/sacola.png" alt="sacola" loading="lazy"/>
            </button>
            <button class="btn-carrinho">
              <img class="b-carrinho" src="/src/assets/curtir - coração.png" alt="favoritar" loading="lazy"/>
            </button>
          </div>
        </div>`;

      /* Fallback de imagem sem onerror inline (bloqueado por CSP) */
      const imgEl = div.querySelector('.imagem-produto');
      imgEl.addEventListener('error', () => {
        imgEl.src = '/src/assets/donuts ouro branco.png';
      });

      grid.appendChild(div);
    });

  /* Re-aplica filtro de categoria ativo */
  const catAtiva = document.querySelector('.cat-btn.active-cat');
  if (catAtiva) {
    const cat = catAtiva.dataset.cat;
    document.querySelectorAll('.produto').forEach(p => {
      p.style.display = (cat === 'todos' || p.dataset.categoria === cat) ? '' : 'none';
    });
  }
}

/* Chama ao iniciar e escuta atualizações do admin */
renderCardapioDinamico();

window.addEventListener('storage', (e) => {
  if (e.key === 'products') renderCardapioDinamico();
});

/* Polling a cada 10s para pegar mudanças na mesma aba */
setInterval(() => {
  if (document.getElementById('page-cardapio').style.display !== 'none') {
    renderCardapioDinamico();
  }
}, 10000);

/* ------------------------------------------------
   CARDÁPIO — busca
------------------------------------------------ */
document.getElementById('searchCardapio').addEventListener('input', function () {
  const q = this.value.toLowerCase().trim();
  document.querySelectorAll('.produto').forEach((p) => {
    p.style.display = (!q || p.querySelector('h3').textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
  if (q) document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active-cat'));
});

/* ------------------------------------------------
   CARDÁPIO — filtro categorias
------------------------------------------------ */
document.querySelectorAll('.cat-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active-cat'));
    btn.classList.add('active-cat');
    const cat = btn.dataset.cat;
    document.querySelectorAll('.produto').forEach((p) => {
      p.style.display = (cat === 'todos' || p.dataset.categoria === cat) ? '' : 'none';
    });
    document.getElementById('searchCardapio').value = '';
  });
});

/* ------------------------------------------------
   MODAL
------------------------------------------------ */
window.abrirModal = function (produto) {
  produtoModal = produto;
  document.getElementById('modal-titulo').innerText = produto.querySelector('h3').innerText;
  document.getElementById('modal-preco').innerText  = produto.querySelector('.preco a').innerText;
  document.getElementById('modal-img').src          = produto.querySelector('img').src;
  document.getElementById('modal-desc').innerText   = produto.getAttribute('data-desc');
  document.getElementById('modal-ing').innerText    = produto.getAttribute('data-ing');
  document.getElementById('modal-container').style.display = 'flex';
};

window.fecharModal = function () {
  document.getElementById('modal-container').style.display = 'none';
  produtoModal = null;
};

document.getElementById('modal-container').addEventListener('click', function (e) {
  if (e.target === this) window.fecharModal();
});

document.getElementById('modalBtnCarrinho').addEventListener('click', () => {
  if (produtoModal) { adicionarCarrinho(produtoModal); window.fecharModal(); }
});

/* ------------------------------------------------
   CARRINHO
------------------------------------------------ */
window.adicionarCarrinho = function (produto) {
  const nome  = produto.querySelector('h3').innerText;
  const preco = produto.getAttribute('data-preco') || produto.querySelector('.preco a').innerText;
  const img   = produto.querySelector('img').src;
  const valor = parseFloat(preco.replace('R$', '').replace(',', '.'));
  const existente = carrinho.find((i) => i.nome === nome);
  if (existente) { existente.qty++; } else { carrinho.push({ nome, preco, img, valor, qty: 1 }); }
  renderCarrinho();
  abrirCarrinho();
};

function renderCarrinho() {
  const container = document.getElementById('carrinhoItens');
  const vazio     = document.getElementById('carrinhoVazio');
  const totalEl   = document.getElementById('carrinhoTotal');
  const badges    = document.querySelectorAll('.cart-badge');

  const total    = carrinho.reduce((s, i) => s + i.valor * i.qty, 0);
  const qtdTotal = carrinho.reduce((s, i) => s + i.qty, 0);

  badges.forEach((b) => { b.textContent = qtdTotal; b.classList.toggle('visible', qtdTotal > 0); });
  totalEl.textContent = `R$${total.toFixed(2).replace('.', ',')}`;
  container.querySelectorAll('.carrinho-item').forEach((el) => el.remove());
  vazio.style.display = carrinho.length === 0 ? '' : 'none';

  carrinho.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'carrinho-item';
    div.innerHTML = `
      <img src="${item.img}" alt="${item.nome}"/>
      <div class="carrinho-item-info"><h4>${item.nome}</h4><p>${item.preco}</p></div>
      <div class="carrinho-item-qty">
        <button class="qty-btn" data-idx="${idx}" data-op="minus">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" data-idx="${idx}" data-op="plus">+</button>
      </div>`;
    container.appendChild(div);
  });

  container.querySelectorAll('.qty-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (btn.dataset.op === 'plus') { carrinho[idx].qty++; }
      else { carrinho[idx].qty--; if (carrinho[idx].qty <= 0) carrinho.splice(idx, 1); }
      renderCarrinho();
    });
  });
}

function abrirCarrinho() {
  document.getElementById('carrinhoDrawer').classList.add('open');
  document.getElementById('carrinhoOverlay').classList.add('open');
}

window.fecharCarrinho = function () {
  document.getElementById('carrinhoDrawer').classList.remove('open');
  document.getElementById('carrinhoOverlay').classList.remove('open');
};

document.getElementById('cartBtn').addEventListener('click', abrirCarrinho);
document.getElementById('cartBtnUsuario').addEventListener('click', abrirCarrinho);

/* ------------------------------------------------
   LOGIN
------------------------------------------------ */
document.getElementById('btnLogin').addEventListener('click', () => {
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;
  if (!email || !senha) { alert('Preencha e-mail e senha.'); return; }
  const usuarios = JSON.parse(localStorage.getItem('cisaUsuarios') || '[]');
  const user = usuarios.find((u) => u.email === email && u.senha === senha);
  if (!user) { alert('E-mail ou senha incorretos.'); return; }
  usuarioLogado = user;
  localStorage.setItem('cisaUsuarioAtivo', JSON.stringify(user));
  showPage('usuario');
});

/* ------------------------------------------------
   CADASTRO — campos completos
------------------------------------------------ */
document.getElementById('btnCadastro').addEventListener('click', () => {
  const nome      = document.getElementById('cadNome').value.trim();
  const sobrenome = document.getElementById('cadSobrenome').value.trim();
  const email     = document.getElementById('cadEmail').value.trim();
  const telefone  = document.getElementById('cadTelefone').value.trim();
  const cpf       = document.getElementById('cadCpf').value.trim();
  const nascimento= document.getElementById('cadNascimento').value;
  const rua       = document.getElementById('cadRua').value.trim();
  const bairro    = document.getElementById('cadBairro').value.trim();
  const numero    = document.getElementById('cadNumero').value.trim();
  const cep       = document.getElementById('cadCep').value.trim();
  const cidade    = document.getElementById('cadCidade').value.trim();
  const senha     = document.getElementById('cadSenha').value;
  const confSenha = document.getElementById('cadConfSenha').value;

  if (!nome || !email || !senha) { alert('Nome, e-mail e senha são obrigatórios.'); return; }
  if (senha.length < 6)          { alert('A senha deve ter pelo menos 6 caracteres.'); return; }
  if (senha !== confSenha)       { alert('As senhas não coincidem.'); return; }

  const usuarios = JSON.parse(localStorage.getItem('cisaUsuarios') || '[]');
  if (usuarios.find((u) => u.email === email)) { alert('Este e-mail já está cadastrado.'); return; }

  const novoUser = { nome: `${nome} ${sobrenome}`.trim(), email, telefone, cpf, nascimento, rua, bairro, numero, cep, cidade, senha };
  usuarios.push(novoUser);
  localStorage.setItem('cisaUsuarios', JSON.stringify(usuarios));
  usuarioLogado = novoUser;
  localStorage.setItem('cisaUsuarioAtivo', JSON.stringify(novoUser));
  showPage('usuario');
});

/* ------------------------------------------------
   ÁREA DO USUÁRIO
------------------------------------------------ */
function renderUsuario() {
  if (!usuarioLogado) return;
  const u = usuarioLogado;
  const inicial = u.nome.charAt(0).toUpperCase();

  document.getElementById('userAvatar').textContent          = inicial;
  document.getElementById('usuarioAvatarGrande').textContent = inicial;
  document.getElementById('usuarioNomeHero').textContent     = `Olá, ${u.nome.split(' ')[0]}!`;
  document.getElementById('usuarioEmailHero').textContent    = u.email;
  document.getElementById('usuarioEmail').textContent        = u.email    || '—';
  document.getElementById('usuarioTelefone').textContent     = u.telefone || '—';
  document.getElementById('usuarioCidade').textContent       = u.cidade   || '—';
  document.getElementById('usuarioCpf').textContent          = u.cpf      || '—';

  renderMeusPedidos();
}

/* ------------------------------------------------
   MEUS PEDIDOS — lê do localStorage e sincroniza
   com atualizações feitas pelo admin
------------------------------------------------ */
function renderMeusPedidos() {
  if (!usuarioLogado) return;

  const grid = document.getElementById('pedidosGrid');
  if (!grid) return;

  /* Sincroniza status dos pedidos do usuário com o que o admin atualizou */
  const meusPedidos = JSON.parse(localStorage.getItem(`cisaPedidos_${usuarioLogado.email}`) || '[]').sort((a, b) => new Date(b.date) - new Date(a.date));
  const todosOrders = JSON.parse(localStorage.getItem('orders') || '[]');

  /* Atualiza status de cada pedido do usuário com base no que está em 'orders' */
  let atualizado = false;
  meusPedidos.forEach((p) => {
    const adminOrder = todosOrders.find((o) => o.id === p.id);
    if (adminOrder && adminOrder.status !== p.status) {
      p.status = adminOrder.status;
      atualizado = true;
    }
  });
  if (atualizado) {
    localStorage.setItem(`cisaPedidos_${usuarioLogado.email}`, JSON.stringify(meusPedidos));
  }

  grid.innerHTML = '';

  if (meusPedidos.length === 0) {
    grid.innerHTML = '<p style="color:#aaa;font-size:14px;grid-column:1/-1;">Você ainda não fez nenhum pedido.</p>';
    return;
  }

  meusPedidos.forEach((pedido) => {
    const statusInfo = {
      'Pendente':   { cor: '#f59e0b', icone: '⏳', label: 'Pendente' },
      'Em preparo': { cor: '#3b82f6', icone: '🔥', label: 'Em Preparo' },
      'Entregue':   { cor: '#10b981', icone: '✅', label: 'Entregue' },
      'Cancelado':  { cor: '#ef4444', icone: '✕',  label: 'Cancelado' },
    };
    const s    = statusInfo[pedido.status] || statusInfo['Pendente'];
    const data = new Date(pedido.date).toLocaleDateString('pt-BR');
    const hora = new Date(pedido.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const total = `R$${pedido.total.toFixed(2).replace('.', ',')}`;
    const numPedido = `#${String(pedido.id).slice(-6)}`;

    /* Itens resumidos */
    const itensHtml = pedido.items.slice(0, 2).map(i =>
      `<span style="font-size:11px;color:#777;">${i.quantity}x ${i.name || i.productName || "?"}</span>`
    ).join('<br/>') + (pedido.items.length > 2 ? `<br/><span style="font-size:11px;color:#bbb;">+${pedido.items.length - 2} item(s)</span>` : '');

    const div = document.createElement('div');
    div.className = 'pedido-card';
    div.style.cssText = 'text-align:left;padding:16px;position:relative;';
    div.innerHTML = `
      <div style="position:absolute;top:12px;right:12px;background:${s.cor}18;color:${s.cor};font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;border:1px solid ${s.cor}44;">
        ${s.icone} ${s.label}
      </div>
      <p style="font-size:12px;font-weight:600;color:var(--pink);margin-bottom:6px;">${numPedido}</p>
      <p style="font-size:11px;color:#aaa;margin-bottom:10px;">${data} às ${hora}</p>
      <div style="margin-bottom:10px;">${itensHtml}</div>
      <p style="font-size:15px;font-weight:700;color:#1a1a1a;">${total}</p>
      <div style="margin-top:12px;">
        <div style="height:4px;background:#f0f0f0;border-radius:4px;overflow:hidden;">
          <div style="height:100%;border-radius:4px;background:${s.cor};width:${
            pedido.status === 'Pendente'   ? '25%' :
            pedido.status === 'Em preparo' ? '65%' :
            pedido.status === 'Entregue'   ? '100%' : '0%'
          };transition:width .5s;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#bbb;margin-top:4px;">
          <span>Recebido</span><span>Preparo</span><span>Entregue</span>
        </div>
      </div>`;
    grid.appendChild(div);
  });
}

/* Escuta mudanças no localStorage feitas pelo admin (storage event) */
window.addEventListener('storage', (e) => {
  if (e.key === 'orders' && usuarioLogado) {
    renderMeusPedidos();
  }
});

/* ------------------------------------------------
   LOGOUT
------------------------------------------------ */
/* ------------------------------------------------
   EDITAR PERFIL
------------------------------------------------ */
window.abrirEditarPerfil = function () {
  if (!usuarioLogado) return;
  const u = usuarioLogado;

  /* Preenche campos com dados atuais */
  document.getElementById('editNome').value      = u.nome      || '';
  document.getElementById('editTelefone').value  = u.telefone  || '';
  document.getElementById('editCidade').value    = u.cidade    || '';
  document.getElementById('editRua').value       = u.rua       || '';
  document.getElementById('editNumero').value    = u.numero    || '';
  document.getElementById('editBairro').value    = u.bairro    || '';
  document.getElementById('editCep').value       = u.cep       || '';

  /* Limpa campos de senha e mensagens */
  ['editSenhaAtual','editNovaSenha','editConfSenha'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('editErroMsg').style.display   = 'none';
  document.getElementById('editSucessoMsg').style.display = 'none';

  document.getElementById('editarPerfilOverlay').classList.add('open');
  document.getElementById('editarPerfilModal').classList.add('open');
};

window.fecharEditarPerfil = function () {
  document.getElementById('editarPerfilOverlay').classList.remove('open');
  document.getElementById('editarPerfilModal').classList.remove('open');
};

window.salvarPerfil = function () {
  const erroEl   = document.getElementById('editErroMsg');
  const sucessoEl = document.getElementById('editSucessoMsg');
  erroEl.style.display = 'none';
  sucessoEl.style.display = 'none';

  const nome     = document.getElementById('editNome').value.trim();
  const telefone = document.getElementById('editTelefone').value.trim();
  const cidade   = document.getElementById('editCidade').value.trim();
  const rua      = document.getElementById('editRua').value.trim();
  const numero   = document.getElementById('editNumero').value.trim();
  const bairro   = document.getElementById('editBairro').value.trim();
  const cep      = document.getElementById('editCep').value.trim();

  if (!nome) {
    erroEl.textContent = 'O nome não pode ficar vazio.';
    erroEl.style.display = 'block';
    return;
  }

  /* Validação de senha (só se preenchida) */
  const senhaAtual  = document.getElementById('editSenhaAtual').value;
  const novaSenha   = document.getElementById('editNovaSenha').value;
  const confSenha   = document.getElementById('editConfSenha').value;

  if (senhaAtual || novaSenha || confSenha) {
    if (senhaAtual !== usuarioLogado.senha) {
      erroEl.textContent = 'Senha atual incorreta.';
      erroEl.style.display = 'block';
      return;
    }
    if (novaSenha.length < 6) {
      erroEl.textContent = 'A nova senha deve ter pelo menos 6 caracteres.';
      erroEl.style.display = 'block';
      return;
    }
    if (novaSenha !== confSenha) {
      erroEl.textContent = 'As novas senhas não coincidem.';
      erroEl.style.display = 'block';
      return;
    }
  }

  /* Atualiza dados do usuário */
  const dadosAtualizados = {
    ...usuarioLogado,
    nome, telefone, cidade, rua, numero, bairro, cep,
    ...(novaSenha ? { senha: novaSenha } : {}),
  };

  /* Salva na lista de usuários */
  const usuarios = JSON.parse(localStorage.getItem('cisaUsuarios') || '[]');
  const idx = usuarios.findIndex(u => u.email === usuarioLogado.email);
  if (idx !== -1) {
    usuarios[idx] = dadosAtualizados;
    localStorage.setItem('cisaUsuarios', JSON.stringify(usuarios));
  }

  /* Atualiza sessão ativa */
  usuarioLogado = dadosAtualizados;
  localStorage.setItem('cisaUsuarioAtivo', JSON.stringify(dadosAtualizados));

  /* Atualiza a tela */
  renderUsuario();

  /* Feedback de sucesso */
  sucessoEl.style.display = 'block';
  setTimeout(() => {
    window.fecharEditarPerfil();
  }, 1500);
};

/* ------------------------------------------------
   LOGOUT
  usuarioLogado = null;
  localStorage.removeItem('cisaUsuarioAtivo');
  showPage('home');
});

/* ------------------------------------------------
   NAV — Entrar / Minha Conta
------------------------------------------------ */
function atualizarNavLogin() {
  const logado = !!usuarioLogado;

  /* Cardápio */
  const loginBtn = document.getElementById('navLoginBtn');
  const userBtn  = document.getElementById('navUserBtn');
  if (loginBtn) loginBtn.style.display = logado ? 'none' : '';
  if (userBtn)  userBtn.style.display  = logado ? ''     : 'none';

  /* Home */
  const homeLoginBtn = document.getElementById('homeLoginBtn');
  const homeUserBtn  = document.getElementById('homeUserBtn');
  if (homeLoginBtn) homeLoginBtn.style.display = logado ? 'none' : '';
  if (homeUserBtn)  homeUserBtn.style.display  = logado ? ''     : 'none';
}

/* Polling a cada 5s para atualizar status mesmo na mesma aba */
setInterval(() => {
  if (usuarioLogado && document.getElementById('page-usuario').style.display !== 'none') {
    renderMeusPedidos();
  }
}, 5000);
(function () {
  const salvo = localStorage.getItem('cisaUsuarioAtivo');
  if (salvo) { try { usuarioLogado = JSON.parse(salvo); } catch {} }
  atualizarNavLogin();
  renderCarrinho();
})();

/* ------------------------------------------------
   CHECKOUT
------------------------------------------------ */
let pixTimerInterval = null;
let pagamentoAtivo   = 'cartao';

window.abrirCheckout = function () {
  if (carrinho.length === 0) { alert('Adicione itens ao carrinho antes de finalizar.'); return; }

  /* Preenche resumo */
  const resumo  = document.getElementById('checkoutResumo');
  const totalEl = document.getElementById('checkoutTotalVal');
  resumo.innerHTML = '';

  carrinho.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'checkout-item';
    div.innerHTML = `
      <img src="${item.img}" alt="${item.nome}"/>
      <span class="checkout-item-nome">${item.nome}</span>
      <span class="checkout-item-qty">x${item.qty}</span>
      <span class="checkout-item-preco">R$${(item.valor * item.qty).toFixed(2).replace('.', ',')}</span>`;
    resumo.appendChild(div);
  });

  const total = carrinho.reduce((s, i) => s + i.valor * i.qty, 0);
  totalEl.textContent = `R$${total.toFixed(2).replace('.', ',')}`;

  /* Preenche endereço se usuário logado */
  if (usuarioLogado) {
    const u = usuarioLogado;
    if (u.rua)    document.getElementById('ckRua').value    = u.rua;
    if (u.numero) document.getElementById('ckNumero').value = u.numero;
    if (u.bairro) document.getElementById('ckBairro').value = u.bairro;
    if (u.cidade) document.getElementById('ckCidade').value = u.cidade;
    if (u.cep)    document.getElementById('ckCep').value    = u.cep;
  }

  /* Reseta etapas */
  document.getElementById('checkoutStep1').style.display = '';
  document.getElementById('checkoutStep2').style.display = 'none';
  window.trocarPagamento('cartao');

  /* Abre modal */
  document.getElementById('checkoutOverlay').classList.add('open');
  document.getElementById('checkoutModal').classList.add('open');

  /* Fecha drawer do carrinho */
  window.fecharCarrinho();
};

window.fecharCheckout = function () {
  document.getElementById('checkoutOverlay').classList.remove('open');
  document.getElementById('checkoutModal').classList.remove('open');
  if (pixTimerInterval) { clearInterval(pixTimerInterval); pixTimerInterval = null; }
};

/* Troca aba de pagamento */
window.trocarPagamento = function (tipo) {
  pagamentoAtivo = tipo;
  document.querySelectorAll('.pag-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tipo);
  });
  document.getElementById('painelCartao').style.display = tipo === 'cartao' ? '' : 'none';
  document.getElementById('painelPix').style.display    = tipo === 'pix'    ? '' : 'none';

  if (tipo === 'pix') iniciarTimerPix();
  else if (pixTimerInterval) { clearInterval(pixTimerInterval); pixTimerInterval = null; }
};

/* Timer Pix — 10 minutos */
function iniciarTimerPix() {
  if (pixTimerInterval) clearInterval(pixTimerInterval);
  let segundos = 600;
  const el = document.getElementById('pixTimer');
  function atualizar() {
    const m = String(Math.floor(segundos / 60)).padStart(2, '0');
    const s = String(segundos % 60).padStart(2, '0');
    if (el) el.textContent = `${m}:${s}`;
    if (segundos <= 0) { clearInterval(pixTimerInterval); if (el) el.textContent = 'Expirado'; }
    segundos--;
  }
  atualizar();
  pixTimerInterval = setInterval(atualizar, 1000);
}

/* Copiar chave Pix */
window.copiarPix = function () {
  const chave = document.getElementById('pixChave').textContent;
  navigator.clipboard.writeText(chave).catch(() => {});
  const btn = document.querySelector('.btn-copiar');
  if (btn) {
    btn.textContent = 'Copiado!';
    btn.classList.add('copiado');
    setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('copiado'); }, 2000);
  }
};

/* Confirmar pedido */
window.confirmarPedido = function () {
  const rua    = document.getElementById('ckRua').value.trim();
  const numero = document.getElementById('ckNumero').value.trim();
  const bairro = document.getElementById('ckBairro').value.trim();
  const cidade = document.getElementById('ckCidade').value.trim();
  const cep    = document.getElementById('ckCep').value.trim();

  if (!rua) { alert('Informe o endereço de entrega.'); return; }

  if (pagamentoAtivo === 'cartao') {
    const num  = document.getElementById('ckCartaoNum').value.trim();
    const nome = document.getElementById('ckCartaoNome').value.trim();
    const val  = document.getElementById('ckCartaoVal').value.trim();
    const cvv  = document.getElementById('ckCartaoCvv').value.trim();
    if (!num || !nome || !val || !cvv) { alert('Preencha todos os dados do cartão.'); return; }
  }

  /* Monta pedido no formato compatível com o painel admin */
  const pedidoId  = Date.now();
  const numPedido = `#${String(pedidoId).slice(-6)}`;

  const pedido = {
    id:     pedidoId,
    date:   new Date().toISOString(),
    status: 'Pendente',
    origem: 'site',           /* identifica que veio do site do cliente */
    pagamento: pagamentoAtivo === 'cartao' ? 'Cartão de Crédito' : 'Pix',
    items: carrinho.map((item) => ({
      productId:   item.nome,
      productName: item.nome,
      name:        item.nome,
      price:       item.valor,
      quantity:    item.qty,
      img:         item.img,
    })),
    total: carrinho.reduce((s, i) => s + i.valor * i.qty, 0),
    client: {
      name:    usuarioLogado ? usuarioLogado.nome  : 'Cliente',
      phone:   usuarioLogado ? usuarioLogado.telefone || '—' : '—',
      cep:     cep,
      address: `${rua}, ${numero}`,
      number:  numero,
      city:    cidade,
      bairro:  bairro,
      email:   usuarioLogado ? usuarioLogado.email : '—',
    },
    emailCliente: usuarioLogado ? usuarioLogado.email : null,
  };

  /* Salva em 'orders' (painel admin lê daqui) */
  const pedidos = JSON.parse(localStorage.getItem('orders') || '[]');
  pedidos.unshift(pedido);
  localStorage.setItem('orders', JSON.stringify(pedidos));

  /* Salva também nos pedidos do usuário logado */
  if (usuarioLogado) {
    const meusPedidos = JSON.parse(localStorage.getItem(`cisaPedidos_${usuarioLogado.email}`) || '[]').sort((a,b) => new Date(b.date) - new Date(a.date));
    meusPedidos.unshift({ id: pedidoId, numPedido, status: 'Pendente', date: pedido.date, items: pedido.items, total: pedido.total });
    localStorage.setItem(`cisaPedidos_${usuarioLogado.email}`, JSON.stringify(meusPedidos));
  }

  /* Exibe número do pedido */
  document.getElementById('confirmadoNum').textContent = `Número do pedido: ${numPedido}`;

  /* Mostra tela de confirmação */
  document.getElementById('checkoutStep1').style.display = 'none';
  document.getElementById('checkoutStep2').style.display = '';

  /* Limpa carrinho */
  carrinho = [];
  renderCarrinho();
  if (pixTimerInterval) { clearInterval(pixTimerInterval); pixTimerInterval = null; }
};

/* ------------------------------------------------
   DELEGAÇÃO GLOBAL DE EVENTOS
   Substitui onclicks inline — necessário para
   type="module" reconhecer as funções
------------------------------------------------ */
document.addEventListener('click', (e) => {
  /* Roteador de páginas */
  const link = e.target.closest('[data-page]');
  if (link) { e.preventDefault(); showPage(link.dataset.page); return; }

  /* Botão finalizar pelo ID */
  if (e.target.closest('#btnFinalizarPedido')) { abrirCheckout(); return; }

  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;

  switch (action) {
    case 'abrirModal': {
      const produto = e.target.closest('.produto');
      if (produto) abrirModal(produto);
      break;
    }
    case 'adicionarCarrinho': {
      e.stopPropagation();
      const produto = e.target.closest('.produto');
      if (produto) adicionarCarrinho(produto);
      break;
    }
    case 'fecharCheckout':      fecharCheckout();          break;
    case 'confirmarPedido':     confirmarPedido();         break;
    case 'copiarPix':           copiarPix();               break;
    case 'trocarCartao':        window.trocarPagamento('cartao'); break;
    case 'trocarPix':           window.trocarPagamento('pix');    break;
    case 'fecharCarrinho':      fecharCarrinho();          break;
    case 'fecharModal':         fecharModal();             break;
    case 'abrirEditarPerfil':   abrirEditarPerfil();       break;
    case 'salvarPerfil':        salvarPerfil();            break;
    case 'fecharEditarPerfil':  fecharEditarPerfil();      break;
  }
});