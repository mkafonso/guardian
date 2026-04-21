# Architecture

O Guardian segue Hexagonal Architecture (Ports & Adapters) para manter o core independente de infraestrutura.

## Conceitos

- **Core (domínio + aplicação)**: regras de negócio e orquestração.
- **Ports**: interfaces que o core define para depender de capacidades externas (ex.: ler dependências, buscar vulnerabilities, renderizar relatório).
- **Adapters**: implementações concretas desses ports (ex.: ler `package.json`, chamar OSV, renderizar HTML).

## Fluxo

CLI → Usecases → Services → Ports → Adapters

- **CLI**: recebe argumentos/flags, valida entrada e dispara o use case correto.
- **Usecases**: orquestram a execução (pipeline de análise), sem detalhes de I/O.
- **Services**: encapsulam regras específicas (scoring, planejamento de upgrade, narrativa).
- **Ports**: contratos do core para integrações externas.
- **Adapters**: fazem a ponte com o mundo real (filesystem, HTTP, templates, etc.).
