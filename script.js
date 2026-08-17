// Configuração dos nomes das imagens de prêmio na raiz do projeto
// Ajuste aqui se os arquivos na sua pasta tiverem nomes diferentes
const PREMIOS_VENDEDOR = [
    'premio-1-tablet.png',
    'premio-2-sanduicheira.png',
    'premio-3-liquidificador.png'
];
const PREMIO_SUPERVISOR = 'premio-supervisor.png';
const PREMIO_GERENTE = 'premio-gerente.png';

// Variáveis globais
let dadosOriginais = null;
let dadosFiltrados = null;
let visualizacaoAtual = 'vendedores';

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('dados.json');
        dadosOriginais = await response.json();
        dadosFiltrados = JSON.parse(JSON.stringify(dadosOriginais));
        
        console.log('✅ Dados carregados:', dadosOriginais);
        
        inicializarFiltros();
        renderizarDashboard();
        configurarEventos();
        configurarTabs();
        renderizarCampanha();
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        alert('Erro ao carregar os dados. Verifique se o arquivo dados.json existe.');
    }
});

// Inicializar opções dos filtros
function inicializarFiltros() {
    const filtroMes = document.getElementById('filtro-mes');
    const filtroFornecedor = document.getElementById('filtro-fornecedor');
    const filtroCidade = document.getElementById('filtro-cidade');
    const filtroSupervisor = document.getElementById('filtro-supervisor');
    
    dadosOriginais.filtros.meses.forEach(mes => {
        const option = document.createElement('option');
        option.value = mes;
        option.textContent = mes;
        filtroMes.appendChild(option);
    });
    
    dadosOriginais.filtros.fornecedores.forEach(fornecedor => {
        const option = document.createElement('option');
        option.value = fornecedor;
        option.textContent = fornecedor;
        filtroFornecedor.appendChild(option);
    });
    
    dadosOriginais.filtros.cidades.forEach(cidade => {
        const option = document.createElement('option');
        option.value = cidade;
        option.textContent = cidade;
        filtroCidade.appendChild(option);
    });
    
    dadosOriginais.filtros.supervisores.forEach(supervisor => {
        const option = document.createElement('option');
        option.value = supervisor;
        option.textContent = supervisor;
        filtroSupervisor.appendChild(option);
    });
}

// Configurar eventos
function configurarEventos() {
    document.getElementById('filtro-mes').addEventListener('change', aplicarFiltros);
    document.getElementById('filtro-fornecedor').addEventListener('change', aplicarFiltros);
    document.getElementById('filtro-cidade').addEventListener('change', aplicarFiltros);
    document.getElementById('filtro-supervisor').addEventListener('change', aplicarFiltros);
    document.getElementById('btn-limpar').addEventListener('click', limparFiltros);
    document.getElementById('btn-toggle-view').addEventListener('click', toggleVisualizacao);
}

// Alternar visualização do ranking geral
function toggleVisualizacao() {
    visualizacaoAtual = visualizacaoAtual === 'vendedores' ? 'supervisores' : 'vendedores';
    
    const btn = document.getElementById('btn-toggle-view');
    const titulo = document.getElementById('ranking-titulo');
    
    if (visualizacaoAtual === 'supervisores') {
        btn.textContent = 'Ver por Vendedor';
        titulo.textContent = '🏆 Ranking de Supervisores';
    } else {
        btn.textContent = 'Ver por Supervisor';
        titulo.textContent = '🏆 Ranking de Vendedores';
    }
    
    renderizarRanking();
}

// Comparador de texto tolerante (trim, lowercase, sem acentos opcional)
function normalizarTexto(texto) {
    return String(texto).toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function compararTexto(a, b) {
    return normalizarTexto(a) === normalizarTexto(b);
}

// Aplicar filtros
function aplicarFiltros() {
    const mesSelecionado = document.getElementById('filtro-mes').value;
    const fornecedorSelecionado = document.getElementById('filtro-fornecedor').value;
    const cidadeSelecionada = document.getElementById('filtro-cidade').value;
    const supervisorSelecionado = document.getElementById('filtro-supervisor').value;
    
    let dadosFiltradosTemp = dadosOriginais.dados_completos.filter(item => {
        const mesMatch = !mesSelecionado || compararTexto(item.mes, mesSelecionado);
        const fornecedorMatch = !fornecedorSelecionado || compararTexto(item.fornecedor, fornecedorSelecionado);
        const cidadeMatch = !cidadeSelecionada || compararTexto(item.cidade, cidadeSelecionada);
        const supervisorMatch = !supervisorSelecionado || compararTexto(item.supervisor, supervisorSelecionado);
        
        return mesMatch && fornecedorMatch && cidadeMatch && supervisorMatch;
    });
    
    // Recalcular KPIs
    const faturamentoTotal = dadosFiltradosTemp.reduce((sum, item) => sum + item.faturamento, 0);
    const cpfsCnpjsUnicos = new Set(dadosFiltradosTemp.map(item => item.cpf_cnpj));
    const positivacaoTotal = cpfsCnpjsUnicos.size;
    const quantidadeTotal = dadosFiltradosTemp.reduce((sum, item) => sum + item.quantidade, 0);
    const ticketMedio = positivacaoTotal > 0 ? faturamentoTotal / positivacaoTotal : 0;
    
    // Recalcular rankings
    dadosFiltrados = {
        kpis: {
            faturamento_total: faturamentoTotal,
            positivacao_total: positivacaoTotal,
            quantidade_total: quantidadeTotal,
            ticket_medio: ticketMedio
        },
        ranking_vendedores: calcularRankingVendedores(dadosFiltradosTemp),
        ranking_supervisores: calcularRankingSupervisores(dadosFiltradosTemp),
        ranking_gerentes: calcularRankingGerentes(dadosFiltradosTemp),
        top_produtos: calcularTopProdutos(dadosFiltradosTemp),
        top_cidades: calcularTopCidades(dadosFiltradosTemp)
    };
    
    renderizarDashboard();
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('filtro-mes').value = '';
    document.getElementById('filtro-fornecedor').value = '';
    document.getElementById('filtro-cidade').value = '';
    document.getElementById('filtro-supervisor').value = '';
    
    dadosFiltrados = JSON.parse(JSON.stringify(dadosOriginais));
    renderizarDashboard();
}

// Cálculos de ranking e tops
function calcularRankingVendedores(dados) {
    const map = {};
    dados.forEach(item => {
        if (!map[item.vendedor]) {
            map[item.vendedor] = {
                vendedor: item.vendedor,
                supervisor: item.supervisor,
                gerente: item.gerente,
                faturamento: 0,
                cpfs: new Set(),
                quantidade: 0
            };
        }
        map[item.vendedor].faturamento += item.faturamento;
        map[item.vendedor].cpfs.add(item.cpf_cnpj);
        map[item.vendedor].quantidade += item.quantidade;
    });
    
    return Object.values(map).map(v => ({
        vendedor: v.vendedor,
        supervisor: v.supervisor,
        gerente: v.gerente,
        faturamento: v.faturamento,
        positivacao: v.cpfs.size,
        quantidade: v.quantidade,
        ticket_medio: v.cpfs.size > 0 ? v.faturamento / v.cpfs.size : 0
    })).sort((a, b) => {
        if (a.supervisor < b.supervisor) return -1;
        if (a.supervisor > b.supervisor) return 1;
        return b.faturamento - a.faturamento;
    });
}

function calcularRankingSupervisores(dados) {
    const map = {};
    dados.forEach(item => {
        if (!map[item.supervisor]) {
            map[item.supervisor] = {
                supervisor: item.supervisor,
                faturamento: 0,
                cpfs: new Set(),
                quantidade: 0
            };
        }
        map[item.supervisor].faturamento += item.faturamento;
        map[item.supervisor].cpfs.add(item.cpf_cnpj);
        map[item.supervisor].quantidade += item.quantidade;
    });
    
    return Object.values(map).map(s => ({
        supervisor: s.supervisor,
        faturamento: s.faturamento,
        positivacao: s.cpfs.size,
        quantidade: s.quantidade,
        ticket_medio: s.cpfs.size > 0 ? s.faturamento / s.cpfs.size : 0
    })).sort((a, b) => b.faturamento - a.faturamento);
}

function calcularRankingGerentes(dados) {
    const map = {};
    dados.forEach(item => {
        if (!map[item.gerente]) {
            map[item.gerente] = {
                gerente: item.gerente,
                faturamento: 0,
                cpfs: new Set(),
                quantidade: 0
            };
        }
        map[item.gerente].faturamento += item.faturamento;
        map[item.gerente].cpfs.add(item.cpf_cnpj);
        map[item.gerente].quantidade += item.quantidade;
    });
    
    return Object.values(map).map(g => ({
        gerente: g.gerente,
        faturamento: g.faturamento,
        positivacao: g.cpfs.size,
        quantidade: g.quantidade,
        ticket_medio: g.cpfs.size > 0 ? g.faturamento / g.cpfs.size : 0
    })).sort((a, b) => b.faturamento - a.faturamento);
}

function calcularTopProdutos(dados) {
    const map = {};
    dados.forEach(item => {
        if (!map[item.produto]) {
            map[item.produto] = {
                produto: item.produto,
                codigo: item.codigo,
                faturamento: 0,
                cpfs: new Set()
            };
        }
        map[item.produto].faturamento += item.faturamento;
        map[item.produto].cpfs.add(item.cpf_cnpj);
    });
    
    return Object.values(map)
        .map(p => ({
            produto: p.produto,
            codigo: p.codigo,
            faturamento: p.faturamento,
            positivacao: p.cpfs.size,
            imagem: `imagens/${p.codigo}.png`
        }))
        .sort((a, b) => b.faturamento - a.faturamento)
        .slice(0, 5);
}

function calcularTopCidades(dados) {
    const map = {};
    dados.forEach(item => {
        if (!map[item.cidade]) {
            map[item.cidade] = {
                cidade: item.cidade,
                faturamento: 0,
                cpfs: new Set()
            };
        }
        map[item.cidade].faturamento += item.faturamento;
        map[item.cidade].cpfs.add(item.cpf_cnpj);
    });
    
    return Object.values(map)
        .map(c => ({
            cidade: c.cidade,
            faturamento: c.faturamento,
            positivacao: c.cpfs.size
        }))
        .sort((a, b) => b.faturamento - a.faturamento)
        .slice(0, 5);
}

// Renderizar dashboard
function renderizarDashboard() {
    renderizarKPIs();
    renderizarRanking();
    renderizarTopProdutos();
    renderizarTopCidades();
}

// Renderizar KPIs
function renderizarKPIs() {
    document.getElementById('kpi-faturamento').textContent = 
        formatarMoeda(dadosFiltrados.kpis.faturamento_total);
    document.getElementById('kpi-positivacao').textContent = 
        dadosFiltrados.kpis.positivacao_total.toLocaleString('pt-BR');
    document.getElementById('kpi-quantidade').textContent = 
        Math.round(dadosFiltrados.kpis.quantidade_total).toLocaleString('pt-BR');
    document.getElementById('kpi-ticket').textContent = 
        formatarMoeda(dadosFiltrados.kpis.ticket_medio);
}

// Renderizar ranking geral
function renderizarRanking() {
    const thead = document.getElementById('thead-ranking');
    const tbody = document.getElementById('tbody-ranking');
    
    if (visualizacaoAtual === 'vendedores') {
        thead.innerHTML = `
            <tr>
                <th>Posição</th>
                <th>Vendedor</th>
                <th>Supervisor</th>
                <th>Gerente</th>
                <th>Faturamento</th>
                <th>Positivação</th>
                <th>Quantidade</th>
                <th>Ticket Médio</th>
            </tr>
        `;
        
        tbody.innerHTML = '';
        dadosFiltrados.ranking_vendedores.forEach((vendedor, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}º</td>
                <td>${vendedor.vendedor}</td>
                <td>${vendedor.supervisor}</td>
                <td>${vendedor.gerente}</td>
                <td>${formatarMoeda(vendedor.faturamento)}</td>
                <td>${vendedor.positivacao.toLocaleString('pt-BR')}</td>
                <td>${Math.round(vendedor.quantidade).toLocaleString('pt-BR')}</td>
                <td>${formatarMoeda(vendedor.ticket_medio)}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        thead.innerHTML = `
            <tr>
                <th>Posição</th>
                <th>Supervisor</th>
                <th>Faturamento</th>
                <th>Positivação</th>
                <th>Quantidade</th>
                <th>Ticket Médio</th>
            </tr>
        `;
        
        tbody.innerHTML = '';
        dadosFiltrados.ranking_supervisores.forEach((supervisor, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}º</td>
                <td>${supervisor.supervisor}</td>
                <td>${formatarMoeda(supervisor.faturamento)}</td>
                <td>${supervisor.positivacao.toLocaleString('pt-BR')}</td>
                <td>${Math.round(supervisor.quantidade).toLocaleString('pt-BR')}</td>
                <td>${formatarMoeda(supervisor.ticket_medio)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// Renderizar top produtos
function renderizarTopProdutos() {
    const grid = document.getElementById('produtos-grid');
    grid.innerHTML = '';
    
    dadosFiltrados.top_produtos.forEach((produto, index) => {
        const card = document.createElement('div');
        card.className = 'produto-card';
        card.innerHTML = `
            <img src="${produto.imagem}" alt="${produto.produto}" onerror="this.src='https://via.placeholder.com/50?text=${index+1}'">
            <div class="produto-info">
                <h4>${produto.produto}</h4>
                <p class="produto-codigo">Código: ${produto.codigo}</p>
                <div class="produto-stats">
                    <p class="valor-destaque">${formatarMoeda(produto.faturamento)}</p>
                    <p>Positivação: ${produto.positivacao.toLocaleString('pt-BR')}</p>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Renderizar top cidades
function renderizarTopCidades() {
    const grid = document.getElementById('cidades-grid');
    grid.innerHTML = '';
    
    const icones = ['🥇', '🥈', '🥉', '🏅', '🏅'];
    
    if (!dadosFiltrados.top_cidades || dadosFiltrados.top_cidades.length === 0) {
        grid.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Nenhuma cidade encontrada</p>';
        return;
    }
    
    dadosFiltrados.top_cidades.forEach((cidade, index) => {
        const card = document.createElement('div');
        card.className = 'cidade-card';
        card.innerHTML = `
            <div class="cidade-info">
                <h4>${cidade.cidade}</h4>
                <div class="cidade-stats">
                    <p class="valor-destaque">${formatarMoeda(cidade.faturamento)}</p>
                    <p>Positivação: ${cidade.positivacao.toLocaleString('pt-BR')}</p>
                </div>
            </div>
            <div class="cidade-icon">${icones[index]}</div>
        `;
        grid.appendChild(card);
    });
}

// Alternar entre abas
function configurarTabs() {
    document.getElementById('tab-geral').addEventListener('click', () => {
        document.getElementById('view-geral').style.display = 'flex';
        document.getElementById('view-campanha').style.display = 'none';
        document.getElementById('tab-geral').classList.add('active');
        document.getElementById('tab-campanha').classList.remove('active');
    });

    document.getElementById('tab-campanha').addEventListener('click', () => {
        document.getElementById('view-geral').style.display = 'none';
        document.getElementById('view-campanha').style.display = 'flex';
        document.getElementById('tab-campanha').classList.add('active');
        document.getElementById('tab-geral').classList.remove('active');
    });
}

// Renderizar campanha
function renderizarCampanha() {
    const camp = dadosOriginais.campanha;
    if (!camp) {
        console.warn('Nenhum dado de campanha encontrado no dados.json');
        return;
    }

    // KPIs
    document.getElementById('camp-kpi-faturamento').textContent = formatarMoeda(camp.kpis.faturamento_total);
    document.getElementById('camp-kpi-positivacao').textContent = camp.kpis.positivacao_total.toLocaleString('pt-BR');
    document.getElementById('camp-kpi-quantidade').textContent = Math.round(camp.kpis.quantidade_total).toLocaleString('pt-BR');
    document.getElementById('camp-kpi-ticket').textContent = formatarMoeda(camp.kpis.ticket_medio);

    // Ranking Vendedores
    const tbodyVend = document.getElementById('tbody-campanha-vendedores');
    tbodyVend.innerHTML = '';
    camp.ranking_vendedores.forEach((v, index) => {
        const tr = document.createElement('tr');
        if (index < 3) tr.classList.add('linha-vencedora');
        const imgHtml = index < 3
            ? `<div class="premio-wrapper"><img src="${PREMIOS_VENDEDOR[index]}" class="premio-img" alt="Prêmio ${index + 1}º" onerror="this.parentElement.innerHTML='🏆'"></div>`
            : '-';
        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td>${index + 1}º</td>
            <td>${v.vendedor}</td>
            <td>${v.supervisor}</td>
            <td>${v.gerente}</td>
            <td>${formatarMoeda(v.faturamento)}</td>
            <td>${v.positivacao.toLocaleString('pt-BR')}</td>
            <td>${Math.round(v.quantidade).toLocaleString('pt-BR')}</td>
            <td>${formatarMoeda(v.ticket_medio)}</td>
        `;
        tbodyVend.appendChild(tr);
    });

    // Ranking Supervisores
    const tbodySup = document.getElementById('tbody-campanha-supervisores');
    tbodySup.innerHTML = '';
    camp.ranking_supervisores.forEach((s, index) => {
        const tr = document.createElement('tr');
        if (index === 0) tr.classList.add('linha-vencedora');
        const imgHtml = index === 0
            ? `<div class="premio-wrapper"><img src="${PREMIO_SUPERVISOR}" class="premio-img" alt="Prêmio Supervisor" onerror="this.parentElement.innerHTML='🏆'"></div>`
            : '-';
        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td>${index + 1}º</td>
            <td>${s.supervisor}</td>
            <td>${formatarMoeda(s.faturamento)}</td>
            <td>${s.positivacao.toLocaleString('pt-BR')}</td>
        `;
        tbodySup.appendChild(tr);
    });

    // Ranking Gerentes
    const tbodyGer = document.getElementById('tbody-campanha-gerentes');
    tbodyGer.innerHTML = '';
    camp.ranking_gerentes.forEach((g, index) => {
        const tr = document.createElement('tr');
        if (index === 0) tr.classList.add('linha-vencedora');
        const imgHtml = index === 0
            ? `<div class="premio-wrapper"><img src="${PREMIO_GERENTE}" class="premio-img" alt="Prêmio Gerente" onerror="this.parentElement.innerHTML='🏆'"></div>`
            : '-';
        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td>${index + 1}º</td>
            <td>${g.gerente}</td>
            <td>${formatarMoeda(g.faturamento)}</td>
            <td>${g.positivacao.toLocaleString('pt-BR')}</td>
        `;
        tbodyGer.appendChild(tr);
    });
}

// Formatar moeda
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}