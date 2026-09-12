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

<p align="center">
  <a href="#download"><strong>📥 Baixar Executável (.exe)</strong></a> •
  <a href="#como-executar"><strong>🚀 Guia de Instalação</strong></a> •
  <a href="#funcionalidades"><strong>✨ Funcionalidades</strong></a> •
  <a href="#aviso-legal"><strong>⚖️ Aviso Legal</strong></a>
</p>

</div>

---

<a id="funcionalidades"></a>
## 🎯 O que o Sonata faz na prática

O Sonata foi pensado para resolver tarefas comuns do dia a dia de quem consome áudio:

- 🎵 **Música Única**: Baixe uma música individual informando o link do YouTube ou do Spotify, convertida em MP3 (320 kbps), FLAC ou WAV com metadados e capa aplicados.
- 📂 **Playlists Completas**: Cole o link de uma playlist do YouTube ou Spotify; o Sonata analisa cada item, baixa as faixas sequencialmente e salva tudo em uma pasta organizada com os nomes corretos.
- ✂️ **Fatiamento de Álbuns / Compilações por Timestamps**: Tem um vídeo de 1 hora com um álbum completo ou set de DJ no YouTube? O Sonata detecta automaticamente as marcações de tempo na descrição (ou permite que você adicione e edite manualmente) e recorta o áudio em faixas individuais numeradas (`01 - Faixa.mp3`, `02 - Faixa.mp3`).
- 📁 **Seletor de Diretório**: Escolha exatamente em qual pasta do seu computador os arquivos devem ser salvos.

---

<a id="download"></a>
## 💾 Download do Executável (Windows)

Se você deseja apenas utilizar o **Sonata** no seu dia a dia sem precisar instalar Node.js, Python ou compilar código-fonte:

> 🚀 **[Baixar Sonata para Windows (.exe)](https://github.com/seu-usuario/sonata_project/releases)**  
> *(Executável portátil para Windows 64-bit — basta fazer o download e abrir direto no seu computador, sem necessidade de instalação)*.

---

### 📌 Informações importantes ao utilizar o executável:

1. **Aviso do Windows Defender (SmartScreen)**:
   - Como o executável é gerado de forma independente e não possui uma assinatura digital comercial paga (padrão em projetos de código aberto gratuitos), o Windows pode exibir o alerta azul: *"O Windows protegeu o seu computador"*.
   - **Como abrir:** Basta clicar em **"Mais informações"** e, em seguida, em **"Executar assim mesmo"**. O aplicativo é seguro e opera 100% de forma local.

2. **Links do YouTube vs Spotify no aplicativo portátil**:
   - **YouTube (Autônomo e Direto)**: O motor de busca, download e fatiamento de músicas, álbuns e playlists do YouTube é **100% integrado e autônomo** no `.exe`. Na primeira inicialização, o aplicativo configura automaticamente os recursos necessários em segundo plano.
   - **Spotify**: A extração de metadados a partir de links do Spotify utiliza um script complementar em Python presente no backend (`apps/api`). Para quem estiver utilizando apenas o executável sem configurar o ambiente de desenvolvimento, o uso com links do **YouTube** é a forma nativa e garantida para baixar qualquer faixa, álbum completo ou compilação.

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

<a id="como-executar"></a>
## 🚀 Como Executar (Ambiente de Desenvolvimento)

### 1. Pré-requisitos
- **Node.js**: Versão 18 ou superior (recomendado v20+)
- **Python**: Versão 3.10 ou superior *(necessário apenas se for rodar o backend da versão Web ou executar os testes da API)*
- **FFmpeg**: Opcional *(o aplicativo Desktop já inclui o binário via `ffmpeg-static` automaticamente)*

### 2. Instalação do Projeto

```powershell
# 1. Clone o repositório
git clone https://github.com/seu-usuario/sonata_project.git
cd sonata_project

# 2. Instale as dependências dos workspaces Node (Desktop, Web, UI, Shared-Types)
npm install
```

#### Configuração do Backend Python *(Apenas se for rodar a versão Web ou testar a API)*:
O Django Ninja necessita de um ambiente virtual (`venv`):

**No Windows (PowerShell):**
```powershell
# Criar o ambiente virtual
py -m venv apps/api/venv

# Instalar as dependências do Python
.\apps\api\venv\Scripts\pip install -r apps/api/requirements.txt
```

**No Linux / macOS (Bash):**
```bash
python3 -m venv apps/api/venv
./apps/api/venv/bin/pip install -r apps/api/requirements.txt
```

### 3. Execução dos Ambientes

Você pode rodar o Sonata em dois modos:

#### 🖥️ Modo 1: Aplicativo Desktop (Recomendado)
O aplicativo Desktop opera de forma autônoma e 100% local (gerencia o `yt-dlp` e os recortes sem depender de servidores):
```powershell
npm run dev:desktop
```

#### 🌐 Modo 2: Versão Web (SPA + API Django Ninja)
Caso queira rodar ou desenvolver a versão Web no navegador:
```powershell
# Terminal 1: Iniciar o backend da API (Django Ninja)
npm run dev:api

# Terminal 2: Iniciar o frontend Web (Vite + Vue 3)
npm run dev:web
```
Acesse no seu navegador: `http://localhost:5173`

### 4. 📦 Como Gerar o Executável (.exe) para Windows

Para compilar o aplicativo Desktop e gerar o executável portátil final para distribuição:

```powershell
npm run build:desktop
```

> [!TIP]
> **Dica de Permissão no Windows**: Na primeira vez que for compilar, abra o terminal como **Administrador** (ou ative o *Modo Desenvolvedor* nas configurações do Windows). Isso evita erros ao descompactar os links simbólicos das ferramentas de empacotamento do `electron-builder`.
>
> O executável será gerado em:  
> `apps/desktop/dist/Sonata 0.1.0.exe`

### 5. 🧪 Testes

```powershell
# Executar a suíte de testes unitários da API Python
npm run test:api
```

---

### 💡 Dicas e Solução de Problemas (Windows)

- **Erro de Política de Execução (`npm.ps1 / activate.ps1 não pode ser carregado`)**:  
  Se o PowerShell acusar que a execução de scripts foi desabilitada no sistema, você pode liberar a sessão atual rodando:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```
  *(Ou utilizar `npm.cmd` em vez de apenas `npm`)*.
- **FFmpeg**: O aplicativo Desktop já provê e consome os binários necessários nativamente. Caso deseje executar a versão Web/API de forma avançada sem o node_modules, recomenda-se instalar o FFmpeg via Chocolatey (`choco install ffmpeg`), Winget (`winget install Gyan.FFmpeg`) ou baixá-lo no site oficial e colocá-lo no `PATH`.

---

<a id="aviso-legal"></a>
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
