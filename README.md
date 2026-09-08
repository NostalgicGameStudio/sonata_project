# 🎵 Sonata

> Utilitário multiplataforma moderno, minimalista e relaxante para baixar áudios do YouTube, converter para alta fidelidade e fatiar em faixas individuais baseadas em timestamps.

---

## 🏛️ Arquitetura e Engenharia Full-Cycle

O Sonata foi concebido sob princípios rigorosos de **Clean Architecture, SOLID, Design Patterns e Clean Code**, operando como um **Monorepo**:

- **Presentation Layer Compartilhada (`packages/ui`)**: Interface construída em **Vue.js 3** (Composition API, `<script setup>`) com um design system relaxante (paleta Lo-Fi suave, tipografia limpa, cantos arredondados, sem cores neon agressivas).
- **Engine Adapter (Pattern Strategy / Adapter)**: A interface é 100% agnóstica de onde o processamento ocorre:
  - **Desktop (`apps/desktop`)**: Electron via `electron-vite`. O processamento é **100% local e offline**, acionando os binários `yt-dlp` e `ffmpeg` via Node.js IPC em background sem requisições HTTP externas para conversão. Conta ainda com serviço de auto-update silencioso do `yt-dlp` consultando a API do GitHub ao iniciar.
  - **Web (`apps/web`)**: SPA Vite consumindo a API assíncrona.
- **Backend Assíncrono (`apps/api`)**: Desenvolvido em **Python** com **Django Ninja** (ASGI assíncrono), com testes unitários abrangentes e documentação Swagger interativa automática.
- **Regras de Negócio Core**: Regex inteligente para parsing e sanitização de marcações de tempo em qualquer formato (`00:00 - Faixa`, `[04:02] Faixa`, `(1:15:30) Faixa`, `Faixa - 03:20`, etc.).

---

## 📁 Estrutura do Repositório

```text
sonata/
├── apps/
│   ├── desktop/             # Electron App (electron-vite + Vue 3)
│   ├── web/                 # Web SPA (Vite + Vue 3)
│   └── api/                 # API Python Assíncrona (Django Ninja + venv)
├── packages/
│   ├── ui/                  # UI Compartilhada Vue 3 (Components, Styles, Composables)
│   └── shared-types/        # Tipagens TypeScript compartilhadas
├── .commitlintrc.cjs        # Validação estrita de commits em português
├── .husky/                  # Git Hooks (commit-msg e pre-commit)
└── package.json             # Root Monorepo com npm workspaces
```

---

## 🚀 Como Executar

### 1. Pré-requisitos
- **Node.js**: v18+ (Recomendado v20+)
- **Python**: v3.10+ (Recomendado v3.12+)
- **FFmpeg**: Instalado no PATH do sistema operacional (para processamento de áudio)

### 2. Instalação das Dependências

Na raiz do repositório:
```powershell
# Instalar dependências de todos os workspaces Node (Desktop, Web, UI, Shared-Types)
npm install

# Instalar dependências da API Python no ambiente virtual isolado
& apps/api/venv/Scripts/pip.exe install -r apps/api/requirements.txt
```

### 3. Rodando os Ambientes de Desenvolvimento

- **Desktop (Electron + Vue 3)**:
  ```powershell
  npm run dev:desktop
  ```

- **Backend (API Django Ninja)**:
  ```powershell
  npm run dev:api
  # Documentação Swagger disponível em: http://127.0.0.1:8000/api/v1/docs
  ```

- **Web (Vite + Vue 3 com proxy para a API)**:
  ```powershell
  npm run dev:web
  ```

### 4. Executando os Testes

```powershell
# Executar a suíte de testes de unidade da API (Regex, Parsers, Serviços)
npm run test:api
```

---

## 📝 Convenção de Commits (Husky + Commitlint)

Todos os commits são validados automaticamente e devem seguir estritamente o padrão em português:

```text
tipo(modulo): descrição resumida em português
```

- **Tipos permitidos**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`
- **Módulos/Escopos permitidos**: `api`, `desktop`, `web`, `ui`, `core`, `config`, `deps`, `repo`

**Exemplos Válidos:**
- `feat(api): integra conversao via ffmpeg`
- `fix(desktop): ajusta checagem de update do yt-dlp`
- `style(ui): refina paleta relaxante de cores lofi`
- `test(core): adiciona testes para regex de timestamps`
