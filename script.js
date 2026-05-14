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
        console.log('📊 Top Cidades:', dadosOriginais.top_cidades);
        
        inicializarFiltros();
        renderizarDashboard();
        configurarEventos();
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

// Alternar visualização
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

// Aplicar filtros
function aplicarFiltros() {
    const mesSelecionado = document.getElementById('filtro-mes').value.trim();
    const fornecedorSelecionado = document.getElementById('filtro-fornecedor').value.trim();
    const cidadeSelecionada = document.getElementById('filtro-cidade').value.trim();
    const supervisorSelecionado = document.getElementById('filtro-supervisor').value.trim();
    
    console.log('🔍 Filtros aplicados:', { mesSelecionado, fornecedorSelecionado, cidadeSelecionada, supervisorSelecionado });
    
    let dadosFiltradosTemp = dadosOriginais.dados_completos.filter(item => {
        const mesMatch = !mesSelecionado || item.mes.trim() === mesSelecionado;
        const fornecedorMatch = !fornecedorSelecionado || item.fornecedor.trim() === fornecedorSelecionado;
        const cidadeMatch = !cidadeSelecionada || item.cidade.trim() === cidadeSelecionada;
        const supervisorMatch = !supervisorSelecionado || item.supervisor.trim() === supervisorSelecionado;
        
        return mesMatch && fornecedorMatch && cidadeMatch && supervisorMatch;
    });
    
    console.log(`📊 Registros filtrados: ${dadosFiltradosTemp.length}`);
    
    // Recalcular KPIs
    const faturamentoTotal = dadosFiltradosTemp.reduce((sum, item) => sum + item.faturamento, 0);
    const cpfsCnpjsUnicos = new Set(dadosFiltradosTemp.map(item => item.cpf_cnpj));
    const positivacaoTotal = cpfsCnpjsUnicos.size;
    const quantidadeTotal = dadosFiltradosTemp.reduce((sum, item) => sum + item.quantidade, 0);
    const ticketMedio = positivacaoTotal > 0 ? faturamentoTotal / positivacaoTotal : 0;
    
    // Recalcular ranking vendedores
    const vendedoresMap = {};
    dadosFiltradosTemp.forEach(item => {
        if (!vendedoresMap[item.vendedor]) {
            vendedoresMap[item.vendedor] = {
                vendedor: item.vendedor,
                supervisor: item.supervisor,
                faturamento: 0,
                cpfs: new Set(),
                quantidade: 0
            };
        }
        vendedoresMap[item.vendedor].faturamento += item.faturamento;
        vendedoresMap[item.vendedor].cpfs.add(item.cpf_cnpj);
        vendedoresMap[item.vendedor].quantidade += item.quantidade;
    });
    
    const rankingVendedores = Object.values(vendedoresMap).map(v => ({
        vendedor: v.vendedor,
        supervisor: v.supervisor,
        faturamento: v.faturamento,
        positivacao: v.cpfs.size,
        quantidade: v.quantidade,
        ticket_medio: v.cpfs.size > 0 ? v.faturamento / v.cpfs.size : 0
    })).sort((a, b) => {
        // ORDENAR: Primeiro por supervisor (alfabético), depois por faturamento (decrescente)
        if (a.supervisor < b.supervisor) return -1;
        if (a.supervisor > b.supervisor) return 1;
        return b.faturamento - a.faturamento;
    });
    
    // Recalcular ranking supervisores
    const supervisoresMap = {};
    dadosFiltradosTemp.forEach(item => {
        if (!supervisoresMap[item.supervisor]) {
            supervisoresMap[item.supervisor] = {
                supervisor: item.supervisor,
                faturamento: 0,
                cpfs: new Set(),
                quantidade: 0
            };
        }
        supervisoresMap[item.supervisor].faturamento += item.faturamento;
        supervisoresMap[item.supervisor].cpfs.add(item.cpf_cnpj);
        supervisoresMap[item.supervisor].quantidade += item.quantidade;
    });
    
    const rankingSupervisores = Object.values(supervisoresMap).map(s => ({
        supervisor: s.supervisor,
        faturamento: s.faturamento,
        positivacao: s.cpfs.size,
        quantidade: s.quantidade,
        ticket_medio: s.cpfs.size > 0 ? s.faturamento / s.cpfs.size : 0
    })).sort((a, b) => b.faturamento - a.faturamento);
    
    // Recalcular top produtos
    const produtosMap = {};
    dadosFiltradosTemp.forEach(item => {
        if (!produtosMap[item.produto]) {
            produtosMap[item.produto] = {
                produto: item.produto,
                codigo: item.codigo,
                faturamento: 0,
                cpfs: new Set()
            };
        }
        produtosMap[item.produto].faturamento += item.faturamento;
        produtosMap[item.produto].cpfs.add(item.cpf_cnpj);
    });
    
    const topProdutos = Object.values(produtosMap)
        .map(p => ({
            produto: p.produto,
            codigo: p.codigo,
            faturamento: p.faturamento,
            positivacao: p.cpfs.size,
            imagem: `imagens/${p.codigo}.png`
        }))
        .sort((a, b) => b.faturamento - a.faturamento)
        .slice(0, 5);
    
    // Recalcular top cidades
    const cidadesMap = {};
    dadosFiltradosTemp.forEach(item => {
        if (!cidadesMap[item.cidade]) {
            cidadesMap[item.cidade] = {
                cidade: item.cidade,
                faturamento: 0,
                cpfs: new Set()
            };
        }
        cidadesMap[item.cidade].faturamento += item.faturamento;
        cidadesMap[item.cidade].cpfs.add(item.cpf_cnpj);
    });
    
    const topCidades = Object.values(cidadesMap)
        .map(c => ({
            cidade: c.cidade,
            faturamento: c.faturamento,
            positivacao: c.cpfs.size
        }))
        .sort((a, b) => b.faturamento - a.faturamento)
        .slice(0, 5);
    
    console.log('🏙️ Top Cidades recalculado:', topCidades);
    
    // Atualizar dados filtrados
    dadosFiltrados = {
        kpis: {
            faturamento_total: faturamentoTotal,
            positivacao_total: positivacaoTotal,
            quantidade_total: quantidadeTotal,
            ticket_medio: ticketMedio
        },
        ranking_vendedores: rankingVendedores,
        ranking_supervisores: rankingSupervisores,
        top_produtos: topProdutos,
        top_cidades: topCidades
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

// Renderizar dashboard
function renderizarDashboard() {
    renderizarKPIs();
    renderizarRanking();
    renderizarTopProdutos();
    renderizarTopCidades();
}

// Renderizar KPIs (SEM DECIMAIS NA QUANTIDADE)
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

// Renderizar ranking (SEM DECIMAIS NA QUANTIDADE)
function renderizarRanking() {
    const thead = document.getElementById('thead-ranking');
    const tbody = document.getElementById('tbody-ranking');
    
    if (visualizacaoAtual === 'vendedores') {
        thead.innerHTML = `
            <tr>
                <th>Posição</th>
                <th>Vendedor</th>
                <th>Supervisor</th>
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
    
    console.log('🎨 Renderizando cidades:', dadosFiltrados.top_cidades);
    
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

// Formatar moeda
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}