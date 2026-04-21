<h1 align="center">Guardian</h1>

<p align="center">
  Analise dependências Node.js, priorize riscos reais e gere relatórios acionáveis em segundos.
</p>

<p align="center">
  <a href="https://github.com/mkafonso/guardian">GitHub</a> -
  <a href="#instalacao">Instalação</a> -
  <a href="#uso-rapido">Uso rápido</a> -
  <a href="#opcoes">Opções</a> -
  <a href="#ia">IA</a>
</p>

<span align="center">

![npm](https://img.shields.io/npm/v/@mkafonso/guardian)
![license](https://img.shields.io/npm/l/@mkafonso/guardian)
![node](https://img.shields.io/node/v/@mkafonso/guardian)

</span>

<br />
<br />

## Resumo

O **Guardian** é uma CLI para análise de dependências que vai muito além do `npm audit`.

Ele combina análise técnica (vulnerabilidades + reachability) com contexto do mundo real (incidentes recentes), e entrega um relatório HTML pronto para compartilhar.

Tudo focado em responder:

> **o que realmente importa agora no seu projeto**

<br />
<br />

## Features

- Análise rápida de dependências Node.js
- Radar com os **incidentes mais quentes da semana**
- Priorização real de risco (não só CVE)
- Sugestões de atualização seguras
- Detecção de risco de manutenção
- Relatório HTML bonito e pronto para compartilhar
- Integração opcional com IA (OpenAI)

<a id="instalacao"></a>

<br />
<br />

## Instalação

```bash
npm install -g @mkafonso/guardian
```

ou

```bash
npx @mkafonso/guardian analyze .
```

<a id="uso-rapido"></a>

<br />
<br />

## Uso rápido

Dentro do seu projeto (na raiz, ou passando o path):

```bash
guardian analyze .
```

Isso irá:

- Ler seu `package.json`
- Detectar lockfiles (npm/yarn/pnpm)
- Avaliar vulnerabilidades + reachability (quando possível)
- Priorizar riscos e sugerir ações
- Gerar o relatório HTML

<br />
<br />
## Output

Por padrão, um arquivo será gerado no diretório atual:

```bash
guardian-report.html
```

Abra no navegador e compartilhe com o time.

<p align="center">
  <img width="80%"  alt="image" src="https://github.com/user-attachments/assets/1eb004f8-f021-41fd-9683-7876b64bc437" />
</p>

<a id="opcoes"></a>

<br />
<br />

## Opções

```bash
guardian analyze [projectPath] [options]
```

- `--output, -o <file>`: caminho do HTML de saída
- `--no-incidents`: desabilita o radar de incidentes
- `--no-reachability`: desabilita a análise de reachability

Exemplos:

```bash
guardian analyze
guardian analyze .
guardian analyze ./my-app --output guardian-report.html
```

## Radar de Incidentes

O Guardian mostra automaticamente:

- Ataques de supply chain
- Malware recente em npm
- Incidentes em vendors (Next.js, React, etc)
- Vazamentos e compromissos

Sempre focando nos:

> **6 incidentes mais relevantes da semana**

<a id="ia"></a>

<br />
<br />

## IA (Opcional)

Para enriquecer os dados:

```bash
export OPENAI_API_KEY=your_key_here
export GITHUB_TOKEN=your_key_here
```

Isso adiciona:

- Explicação dos incidentes
- Vetor técnico
- Ações recomendadas
- Padrões emergentes

<br />
<br />

## Comparação

| Feature                     | npm audit | Guardian |
| --------------------------- | --------- | -------- |
| Vulnerabilidades conhecidas | ✅        | ✅       |
| Priorização real            | ❌        | ✅       |
| Incidentes atuais           | ❌        | ✅       |
| Insights acionáveis         | ❌        | ✅       |
| Relatório visual            | ❌        | ✅       |

<br />
<br />

## Exemplo

```bash
git clone https://github.com/mkafonso/guardian
cd guardian
npm install
npm run dev
```

<br />
<br />

## Filosofia

O Guardian não tenta mostrar tudo.

Ele foca em:

> 🔥 **o que é crítico agora**

> 🧠 **o que você deve fazer primeiro**

<br />
<br />

## Contribuição

Contribuições são bem-vindas!

- Issues
- PRs
- Ideias
