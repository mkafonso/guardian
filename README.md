<h1 align="center">Guardian</h1>

<p align="center">
  Analise dependências Node.js, priorize riscos reais e gere relatórios acionáveis em segundos.
</p>

<p align="center">
  <a href="https://github.com/mkafonso/guardian">GitHub</a> -
  <a href="#-uso">Uso</a> -
  <a href="#-instalação">Instalação</a>
</p>

<span align="center">

![npm](https://img.shields.io/npm/v/guardian)
![license](https://img.shields.io/npm/l/guardian)
![node](https://img.shields.io/node/v/guardian)

</span>

<br />
<br />

## Summary

O **Guardian** é uma CLI para análise de dependências que vai muito além do `npm audit`.

Ele combina:

- Análise de vulnerabilidades
- Radar de incidentes reais da semana
- Priorização inteligente de risco
- Relatório visual em HTML

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

<br />
<br />

## Instalação

```bash
npm install -g @mkafonso/guardian
```

ou

```bash
# Executar na raiz do teu projeto
npx guardian analyze
```

<br />
<br />

## Uso

Dentro do seu projeto:

```bash
guardian analyze
```

Isso irá:

- Ler seu `package.json`
- Analisar dependências
- Buscar incidentes recentes
- Priorizar riscos
- Gerar relatório

<br />
<br />

## Output

Um arquivo será gerado:

```bash
guardian-report.html
```

<p align="center">
  <img width="80%"  alt="image" src="https://github.com/user-attachments/assets/1eb004f8-f021-41fd-9683-7876b64bc437" />
</p>

<br />
<br />

## Radar de Incidentes

O Guardian mostra automaticamente:

- Ataques de supply chain
- Malware recente em npm
- Incidentes em vendors (Next.js, React, etc)
- Vazamentos e compromissos

Sempre focando nos:

> **6 incidentes mais relevantes da semana**

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
