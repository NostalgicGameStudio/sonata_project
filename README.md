<div align="center">

# 🎵 Sonata

**Utilitário de desktop e web para download, organização e fatiamento de áudio.**

[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Django Ninja](https://img.shields.io/badge/Django_Ninja-Async-092E20?style=for-the-badge&logo=django&logoColor=white)](https://django-ninja.rest-framework.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<br />

<p align="center">
  O <strong>Sonata</strong> é uma aplicação desenvolvida para simplificar a extração e organização de áudios do <strong>YouTube</strong> e <strong>Spotify</strong>. Com uma interface limpa e intuitiva, você pode baixar faixas avulsas, salvar playlists completas ou fatiar compilados longos em faixas individuais a partir de marcações de tempo (timestamps).
</p>

</div>

---

## 🎯 O que o Sonata faz na prática

O Sonata foi pensado para resolver tarefas comuns do dia a dia de quem consome áudio:

- 🎵 **Música Única**: Baixe uma música individual informando o link do YouTube ou do Spotify, convertida em MP3 (320 kbps), FLAC ou WAV com metadados e capa aplicados.
- 📂 **Playlists Completas**: Cole o link de uma playlist do YouTube ou Spotify; o Sonata analisa cada item, baixa as faixas sequencialmente e salva tudo em uma pasta organizada com os nomes corretos.
- ✂️ **Fatiamento de Álbuns / Compilações por Timestamps**: Tem um vídeo de 1 hora com um álbum completo ou set de DJ no YouTube? O Sonata detecta automaticamente as marcações de tempo na descrição (ou permite que você adicione e edite manualmente) e recorta o áudio em faixas individuais numeradas (`01 - Faixa.mp3`, `02 - Faixa.mp3`).
- 📁 **Seletor de Diretório**: Escolha exatamente em qual pasta do seu computador os arquivos devem ser salvos.

---

## 🔍 Como funciona por baixo dos panos

Sem rodeios ou termos vagos, aqui está o funcionamento real da ferramenta:

1. **Para links do YouTube**:
   - A aplicação utiliza o `yt-dlp` localmente para extrair a melhor stream de áudio disponível e o `FFmpeg` para realizar a conversão de formato e o corte cirúrgico baseado nos tempos de início e fim de cada faixa.
2. **Para links do Spotify**:
   - Como o Spotify utiliza proteção DRM em seus arquivos de áudio originais, o Sonata extrai os **metadados oficiais** (título da música, artista, álbum, duração e capa) através da API/GraphQL do Spotify e, em seguida, localiza e baixa a versão de áudio correspondente via **YouTube** (`ytsearch1`), gravando os metadados ID3 corretos no arquivo final.
3. **Execução Local (Desktop)**:
   - Todo o processo de download, conversão e recorte ocorre **diretamente no computador do usuário** através de binários e scripts locais, sem passar arquivos por servidores intermediários externos.

---

## 🏛️ Estrutura do Monorepo

O projeto é estruturado em um monorepo com separação clara de responsabilidades:

```text
sonata_project/
├── apps/
│   ├── desktop/             # Aplicação Desktop (Electron + electron-vite + Vue 3)
│   ├── web/                 # Interface Web SPA (Vite + Vue 3)
│   └── api/                 # Backend Python (Django Ninja + Serviços de Metadados)
├── packages/
│   ├── ui/                  # Componentes Vue 3, estilos Lo-Fi e composables compartilhados
│   └── shared-types/        # Definições de tipos TypeScript compartilhadas
├── .commitlintrc.cjs        # Validação de mensagens de commit (Conventional Commits em português)
├── .husky/                  # Hooks do Git
└── package.json             # Configurações de workspaces do npm
```

---

## 🚀 Como Executar

### 1. Pré-requisitos
- **Node.js**: Versão 18 ou superior (recomendado v20+)
- **Python**: Versão 3.10 ou superior
- **FFmpeg**: Instalado e acessível no `PATH` do sistema

### 2. Instalação

```powershell
# Clone o repositório
git clone https://github.com/seu-usuario/sonata_project.git
cd sonata_project

# Instale as dependências dos workspaces Node (Desktop, Web, UI, Shared-Types)
npm install

# Instale as dependências da API Python no ambiente virtual
& apps/api/venv/Scripts/pip.exe install -r apps/api/requirements.txt
```

### 3. Execução dos Ambientes

```powershell
# Iniciar o aplicativo Desktop (Electron)
npm run dev:desktop

# Iniciar o backend da API (Django Ninja)
npm run dev:api

# Iniciar a versão Web SPA
npm run dev:web
```

### 4. Testes

```powershell
# Executar a suíte de testes unitários da API Python
npm run test:api
```

---

## ⚖️ Aviso Legal, Direitos Autorais e Termos de Uso

> [!WARNING]
> **Leia com atenção antes de utilizar esta ferramenta.**

1. **Finalidade do Software & Estudo de Engenharia**:
   O **Sonata** é um projeto de código aberto desenvolvido com propósito primário de **estudo, pesquisa e aprendizado técnico** em desenvolvimento de software (arquiteturas de monorepo, integração de processos em Electron, manipulação de streams de áudio com FFmpeg e consumo de APIs assíncronas).

2. **Ausência de Hospedagem e Distribuição de Conteúdo**:
   O Sonata **não é um serviço de streaming e não mantém servidores que hospedam, armazenam, redistribuem ou comercializam quaisquer arquivos de áudio ou vídeo protegidos por direitos autorais**. O software funciona unicamente como uma interface gráfica utilitária (client-side) que automatiza chamadas para ferramentas de código aberto (`yt-dlp`, `FFmpeg`) operando localmente no dispositivo do próprio usuário.

3. **Responsabilidade do Usuário e Direitos Autorais**:
   - O ato de realizar o download de conteúdos protegidos por direitos autorais sem a devida autorização dos titulares pode violar os **Termos de Serviço** das plataformas (YouTube, Spotify) e a legislação de propriedade intelectual vigente no seu país (como a **Lei de Direitos Autorais nº 9.610/1998** no Brasil).
   - O usuário é o **único e exclusivo responsável** pela maneira como utiliza esta ferramenta, pelas fontes de mídia selecionadas e pela destinação dos arquivos gerados.
   - Os desenvolvedores e mantenedores deste projeto **não incentivam a pirataria, não comercializam o aplicativo e não assumem nenhuma responsabilidade legal** pelo uso indevido que terceiros possam fazer do software.

4. **Apoie a Música e os Criadores**:
   Se você aprecia as músicas, podcasts e conteúdos que consome, apoie os artistas e produtores originais: compre suas faixas e álbuns oficiais, vá aos seus shows e utilize seus canais oficiais de distribuição e streaming.

---

## 📝 Padrões de Commit

O repositório adota o padrão **Conventional Commits** com mensagens em português, validadas automaticamente via **Husky** e **Commitlint**:

```text
tipo(modulo): descrição da alteração em português
```

- **Tipos**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`
- **Módulos/Escopos**: `ui`, `desktop`, `web`, `api`, `core`, `config`, `deps`, `repo`

**Exemplos:**
- `feat(core): adiciona suporte rapido ao spotify e corrige codificacao`
- `fix(desktop): ajusta tratamento de erro no spawn de processos`
- `docs(repo): reformula readme com funcionamento real e aviso legal`

---

## 📄 Licença

Este projeto é disponibilizado sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
