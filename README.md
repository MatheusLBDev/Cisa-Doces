# 🍰 Cisa Doces — Página de Vendas Online

## 📌 Visão Geral

Este projeto desenvolve um **sistema web completo para a Cisa Doces**, composto por um site de vendas para o cliente e um painel administrativo integrado. A solução melhora a experiência de compra, automatiza o gerenciamento de pedidos e oferece análise de vendas em tempo real.

🔗 **Repositório:** [github.com/MatheusLBDev/Cisa-Doces](https://github.com/MatheusLBDev/Cisa-Doces)

---

## 📊 Resumo do Sistema

| Telas documentadas | Módulos | Produtos no catálogo |
|--------------------|---------|----------------------|
| 15 | 2 | 16 |

---

## 🎯 Objetivos

- Exibir catálogo de doces com fotos, descrições e filtros por categoria
- Informar preços de forma clara e permitir pedidos rápidos
- Oferecer checkout com Cartão de Crédito e Pix (com QR Code)
- Automatizar o atendimento e sincronização entre site e painel admin
- Implementar cálculo automático de totais e carrinho em tempo real
- Possibilitar análise e previsão de vendas com relatórios exportáveis

---

## 👥 Público-Alvo

- Clientes locais que desejam comprar doces com praticidade
- Consumidores que encomendam doces para festas e eventos
- Administradores e gerentes que gerenciam o negócio pelo painel

---

## 🛍️ Módulo 1 — Site do Cliente (Telas 01 a 08)

### Tela 01 — Home (Página Inicial)

Página inicial com slogan *"Doces que Derretem Corações"*, carrossel de produtos em destaque e botões de ação *"Peça Já"* e *"Ver Cardápio"*. O header inclui logo, navegação, campo de busca e acesso à conta.

**Funcionalidades:**
- Carrossel automático com transição a cada 4 segundos
- Navegação manual por setas, miniaturas e teclado
- Barra de progresso animada e indicadores de slide (ex: 2/6)
- Responsivo para toque em dispositivos móveis

---

### Tela 02 — Cardápio

Exibe todos os produtos em grid de 4 colunas com filtros por categoria (Todos, Bolos, Tortas, Cheesecakes, Donuts). Cada card mostra foto, nome, preço e botões para adicionar ao carrinho ou favoritar.

**Funcionalidades:**
- Filtros por categoria com destaque visual no botão ativo
- Busca em tempo real pelo nome do produto
- Sincronização automática com produtos cadastrados no admin
- Exibe apenas produtos com estoque disponível (stock > 0)
- Modal de detalhes ao clicar no card

---

### Tela 03 — Login do Cliente

Layout dividido: ilustração temática à esquerda e formulário de login à direita. Acesso via e-mail e senha cadastrados.

**Funcionalidades:**
- Autenticação por e-mail e senha com validação de campos
- Sessão armazenada via `localStorage` (`cisaUsuarioAtivo`)
- Redirecionamento automático se já estiver logado
- Link para alternância entre login e cadastro

---

### Tela 04 — Cadastro do Cliente

Formulário completo dividido em três seções: Dados Pessoais (nome, CPF, nascimento, e-mail, telefone), Endereço (rua, bairro, número, CEP, cidade) e Confirmação de senha.

**Funcionalidades:**
- Validação de e-mail único e senha mínima de 6 caracteres
- Verificação de confirmação de senha
- Endereço salvo para pré-preenchimento automático no checkout
- Redirecionamento automático para a área do usuário após cadastro

---

### Tela 05 — Carrinho de Compras

Drawer (painel lateral) que desliza da direita ao adicionar um produto. Exibe itens com foto, nome, preço e controles de quantidade, além do total acumulado.

**Funcionalidades:**
- Controles de quantidade por item (+/−) com remoção automática ao zerar
- Cálculo em tempo real do total do carrinho
- Badge com contador de itens no ícone do header
- Fecha ao clicar fora do painel ou no botão X

---

### Tela 06 — Checkout (Finalizar Pedido)

Modal de finalização em duas etapas: resumo dos itens, endereço de entrega e forma de pagamento (Cartão de Crédito ou Pix).

**Funcionalidades:**
- Pré-preenchimento automático com dados do usuário logado
- Painel Pix com QR Code, chave copiável e timer de 10 minutos
- Validação de campos do cartão (número, nome, validade, CVV)
- Pedido salvo em `orders` no localStorage para o admin receber

---

### Tela 07 — Confirmação de Pedido

Tela de sucesso com ícone animado, número do pedido e previsão de entrega de 40 a 60 minutos.

**Funcionalidades:**
- Número único do pedido gerado automaticamente
- Pedido salvo no admin (`orders`) e na conta do cliente (`cisaPedidos_{email}`)
- Carrinho esvaziado automaticamente após confirmação
- Botão "Voltar ao Cardápio" retorna à listagem

---

### Tela 08 — Área do Usuário (Minha Conta)

Painel do cliente com avatar, dados cadastrais e histórico de pedidos com status em tempo real.

**Funcionalidades:**
- Avatar gerado com a inicial do nome do usuário
- Cards de pedidos com número, data, itens, valor e status
- Barra de progresso visual: Recebido → Preparo → Entregue
- Sincronização automática de status com o painel admin (polling a cada 5s)
- Modal de edição de perfil e senha; botão "Sair" encerra a sessão

---

## ⚙️ Módulo 2 — Painel Administrativo (Telas 09 a 15)

### Tela 09 — Login Admin

Acesso restrito com layout em gradiente carmesim exibindo a logo e atalhos das principais funções, e formulário de credenciais à direita.

**Funcionalidades:**
- Suporte a múltiplos perfis configuráveis (admin, gerente)
- Toggle de visibilidade da senha e login via tecla Enter
- Redirecionamento automático se sessão ativa (`sessionStorage`)
- Link "Voltar ao site" retorna à página principal

---

### Tela 10 — Dashboard

Painel principal com KPIs do negócio, gráfico de linha das vendas dos últimos 7 dias e gráfico de barras dos 5 produtos mais vendidos.

**Funcionalidades:**
- Cards de KPIs: Vendas do Dia, Vendas do Mês, Ticket Médio, Pedidos Pendentes
- Gráficos interativos com Chart.js
- Atualização em tempo real a cada novo pedido recebido
- Alternância entre tema claro e escuro (toggle no header)

---

### Tela 11 — Pedidos (com modal de detalhes)

Gestão de pedidos em três colunas por status: Pendente (amarelo), Em Preparo (azul) e Entregue (verde).

**Funcionalidades:**
- Seletor de status inline para atualização rápida
- Modal de detalhes com dados completos do cliente e tabela de itens
- Botão de cancelamento move pedido para o histórico
- Atualização via `storage event` e polling a cada 5s
- Arquivamento automático à meia-noite

---

### Tela 12 — Produtos (com modal de cadastro)

Gerenciamento do catálogo em grid de 4 colunas com indicadores de estoque coloridos (verde/amarelo/vermelho).

**Funcionalidades:**
- Paginação de 8 produtos por página e busca por nome ou categoria
- Modal de cadastro/edição com imagem por URL ou upload (base64) e preview em tempo real
- Botão excluir com confirmação; produto removido do cardápio imediatamente

---

### Tela 13 — Relatórios (com filtro aplicado)

Relatórios por período com métricas de faturamento, número de pedidos e ticket médio. Ranking completo de produtos e tabela detalhada de pedidos.

**Funcionalidades:**
- Filtro por período (data início e fim)
- Métricas: Faturamento Total, Número de Pedidos, Ticket Médio, contagem por status
- Ranking de produtos com barra de progresso proporcional
- Exportação para Excel com 3 abas: Resumo, Pedidos, Itens
- Exportação do histórico completo

---

### Tela 14 — Relatórios (sem filtro)

Estado inicial da tela de Relatórios. O ranking de produtos já é exibido ao carregar (dados históricos completos); as métricas aguardam seleção de período.

**Funcionalidades:**
- Ranking carregado automaticamente ao entrar na tela
- Consulta no histórico arquivado mesmo sem filtro de data
- Botões de exportação disponíveis independentemente do filtro

---

### Tela 15 — Histórico

Arquivo de pedidos finalizados e cancelados, com cards de resumo e tabelas paginadas independentes.

**Funcionalidades:**
- Card verde: Total em Vendas (pedidos entregues arquivados)
- Card vermelho: Contagem de pedidos cancelados
- Tabelas separadas com paginação de 10 itens por página
- Filtro por período com botão "Limpar" para redefinir
- Arquivamento automático à meia-noite de todos os pedidos do dia

---

## 🚀 Funcionalidades Futuras (Possíveis)

- Integração com meios de pagamento externos (gateway)
- Notificações por push ou WhatsApp
- App mobile nativo
- Inteligência artificial para previsão de demanda

