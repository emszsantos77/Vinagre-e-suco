import pandas as pd
import json
from datetime import datetime

# PASSO 1: Ler o arquivo Excel
print("Lendo arquivo Excel...")
df = pd.read_excel('Vinagre e Suco.xlsx')

# PASSO 2: Limpar e preparar os dados
print("Preparando dados...")

# Garantir que as colunas numéricas estão corretas
df['Vlr. Total'] = pd.to_numeric(df['Vlr. Total'], errors='coerce')
df['Quantidade'] = pd.to_numeric(df['Quantidade'], errors='coerce')

# Remover linhas com valores nulos importantes
df = df.dropna(subset=['Vlr. Total', 'Cnpj_CPF'])

# Converter para string e remover espaços
df['Mês'] = df['Mês'].astype(str).str.strip()
df['Fornecedor'] = df['Fornecedor'].astype(str).str.strip()
df['CIDADE'] = df['CIDADE'].astype(str).str.strip()
df['Supervisor'] = df['Supervisor'].astype(str).str.strip()

# PASSO 3: Calcular KPIs Gerais
faturamento_total = float(df['Vlr. Total'].sum())
positivacao_total = int(df['Cnpj_CPF'].nunique())
quantidade_total = float(df['Quantidade'].sum())
ticket_medio_geral = faturamento_total / positivacao_total if positivacao_total > 0 else 0

# PASSO 4: Ranking por Vendedor (ordenado por supervisor e faturamento dentro de cada supervisor)
vendedores = df.groupby(['Nome Vendedor', 'Supervisor']).agg({
    'Vlr. Total': 'sum',
    'Cnpj_CPF': 'nunique',
    'Quantidade': 'sum'
}).reset_index()

vendedores.columns = ['vendedor', 'supervisor', 'faturamento', 'positivacao', 'quantidade']
vendedores['ticket_medio'] = vendedores['faturamento'] / vendedores['positivacao']

# ORDENAR: Primeiro por supervisor (alfabético), depois por faturamento (decrescente dentro de cada supervisor)
vendedores = vendedores.sort_values(['supervisor', 'faturamento'], ascending=[True, False])

ranking_vendedores = vendedores.to_dict('records')

# PASSO 4.1: Ranking por Supervisor
supervisores = df.groupby('Supervisor').agg({
    'Vlr. Total': 'sum',
    'Cnpj_CPF': 'nunique',
    'Quantidade': 'sum'
}).reset_index()

supervisores.columns = ['supervisor', 'faturamento', 'positivacao', 'quantidade']
supervisores['ticket_medio'] = supervisores['faturamento'] / supervisores['positivacao']
supervisores = supervisores.sort_values('faturamento', ascending=False)

ranking_supervisores = supervisores.to_dict('records')

# PASSO 5: Top 5 Produtos
produtos = df.groupby(['PRODUTO', 'Código']).agg({
    'Vlr. Total': 'sum',
    'Cnpj_CPF': 'nunique'
}).reset_index()

produtos.columns = ['produto', 'codigo', 'faturamento', 'positivacao']
produtos = produtos.sort_values('faturamento', ascending=False).head(5)

top_produtos = []
for _, row in produtos.iterrows():
    top_produtos.append({
        'produto': row['produto'],
        'codigo': str(row['codigo']),
        'faturamento': float(row['faturamento']),
        'positivacao': int(row['positivacao']),
        'imagem': f'imagens/{row["codigo"]}.png'
    })

# PASSO 5.1: Top 5 Cidades
cidades = df.groupby('CIDADE').agg({
    'Vlr. Total': 'sum',
    'Cnpj_CPF': 'nunique'
}).reset_index()

cidades.columns = ['cidade', 'faturamento', 'positivacao']
cidades = cidades.sort_values('faturamento', ascending=False).head(5)

top_cidades = []
for _, row in cidades.iterrows():
    top_cidades.append({
        'cidade': str(row['cidade']),
        'faturamento': float(row['faturamento']),
        'positivacao': int(row['positivacao'])
    })

print(f"\n📊 Top 5 Cidades:")
for c in top_cidades:
    print(f"  - {c['cidade']}: R$ {c['faturamento']:,.2f} | Positivação: {c['positivacao']}")

# PASSO 6: Obter listas para filtros
meses = sorted([str(m).strip() for m in df['Mês'].dropna().unique().tolist()])
fornecedores = sorted([str(f).strip() for f in df['Fornecedor'].dropna().unique().tolist()])
cidades_filtro = sorted([str(c).strip() for c in df['CIDADE'].dropna().unique().tolist()])
supervisores_filtro = sorted([str(s).strip() for s in df['Supervisor'].dropna().unique().tolist()])

# PASSO 7: Criar dados completos para filtros
dados_completos = []
for _, row in df.iterrows():
    dados_completos.append({
        'mes': str(row['Mês']).strip(),
        'fornecedor': str(row['Fornecedor']).strip(),
        'cidade': str(row['CIDADE']).strip(),
        'supervisor': str(row['Supervisor']).strip(),
        'vendedor': str(row['Nome Vendedor']).strip(),
        'produto': str(row['PRODUTO']).strip(),
        'codigo': str(row['Código']).strip(),
        'faturamento': float(row['Vlr. Total']),
        'quantidade': float(row['Quantidade']),
        'cpf_cnpj': str(row['Cnpj_CPF']).strip()
    })

# PASSO 8: Montar JSON final
dados_json = {
    'kpis': {
        'faturamento_total': round(faturamento_total, 2),
        'positivacao_total': positivacao_total,
        'quantidade_total': round(quantidade_total, 2),
        'ticket_medio': round(ticket_medio_geral, 2)
    },
    'ranking_vendedores': [
        {
            'vendedor': str(r['vendedor']).strip(),
            'supervisor': str(r['supervisor']).strip(),
            'faturamento': round(r['faturamento'], 2),
            'positivacao': int(r['positivacao']),
            'quantidade': round(r['quantidade'], 2),
            'ticket_medio': round(r['ticket_medio'], 2)
        }
        for r in ranking_vendedores
    ],
    'ranking_supervisores': [
        {
            'supervisor': str(r['supervisor']).strip(),
            'faturamento': round(r['faturamento'], 2),
            'positivacao': int(r['positivacao']),
            'quantidade': round(r['quantidade'], 2),
            'ticket_medio': round(r['ticket_medio'], 2)
        }
        for r in ranking_supervisores
    ],
    'top_produtos': top_produtos,
    'top_cidades': top_cidades,
    'filtros': {
        'meses': meses,
        'fornecedores': fornecedores,
        'cidades': cidades_filtro,
        'supervisores': supervisores_filtro
    },
    'dados_completos': dados_completos
}

# PASSO 9: Salvar JSON
print("\nSalvando arquivo JSON...")
with open('dados.json', 'w', encoding='utf-8') as f:
    json.dump(dados_json, f, ensure_ascii=False, indent=2)

print("\n✅ Arquivo dados.json criado com sucesso!")
print(f"📊 Total de registros: {len(dados_completos)}")
print(f"💰 Faturamento Total: R$ {faturamento_total:,.2f}")
print(f"👥 Positivação Total: {positivacao_total}")
print(f"📦 Quantidade Total: {quantidade_total:,.0f}")
print(f"🎯 Ticket Médio: R$ {ticket_medio_geral:,.2f}")
print(f"🏙️ Total de Cidades no Top 5: {len(top_cidades)}")