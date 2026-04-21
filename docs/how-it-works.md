# How it works

O Guardian analisa o projeto, avalia riscos de dependências e gera um relatório em HTML com recomendações.

## Pipeline

1. Lê o `package.json`
2. Coleta as dependências (diretas e transitivas, quando aplicável)
3. Busca vulnerabilidades no OSV (por dependência e por ID para detalhes completos)
4. Calcula um score de risco
5. Planeja upgrades seguros (com foco em mitigação e compatibilidade)
6. Gera uma narrativa curta para explicar os riscos e as ações sugeridas
7. Renderiza o relatório em HTML
