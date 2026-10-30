<div align="center">
  <img src="public/logo.png" alt="Synapps Logo" width="96" height="96" />
  <h1>Synapps Launcher</h1>
  <p><strong>Central open-source para instalar, atualizar e iniciar ferramentas criativas de Design, Mídia, Escritório, 3D e Desenvolvimento.</strong></p>
  <p><em>✨ Projeto <strong>100% Vibe Coded</strong> com IA ✨</em></p>

  <p>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/Licen%C3%A7a-GPLv3-blue.svg" alt="License: GPL v3" /></a>
    <img src="https://img.shields.io/badge/100%25-Vibe_Coded-8b5cf6?style=flat&logo=sparkles&logoColor=white" alt="100% Vibe Coded" />
    <img src="https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white" alt="Tauri 2.x" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/Rust-Edition_2021-orange?logo=rust" alt="Rust" />
  </p>
</div>

---

## 🤖 Sobre o Projeto (100% Vibe Coded)

O **Synapps Launcher** foi construído de ponta a ponta como um projeto **100% Vibe Coded** — toda a arquitetura em Rust (Tauri 2.x), interface gráfica em React 19 + Tailwind CSS v4, motor de temas modulares, integração com repositórios/mirrors e empacotamento Windows NSIS foram desenvolvidos iterativamente através de programação guiada por IA.

---

## ✨ Recursos Principais

- **Catálogo Curado (39 Aplicativos Criativos)**:
  - **Design**: PhotoCraft, VectorCraft, DesignCraft, FigCraft, GIMP, Krita, Graphite, Pixelorama, Pencil2D, Upscayl, FontForge, ImageGlass, LibreCAD.
  - **Mídia**: LightCraft, FilmCraft, EffectCraft, SoundCraft, OBS Studio, Shotcut, LosslessCut, Audacity, LMMS, ShareX.
  - **Escritório**: WordCraft, DeckCraft, GridCraft, PdfCraft, AppFlowy, AFFiNE, ONLYOFFICE.
  - **3D & CAD**: CADCraft, Blender, Blockbench, FreeCAD, OrcaSlicer, PrusaSlicer, Dust3D.
  - **Dev & Produtividade**: Godot Engine, Super Productivity.
- **Instalação Silenciosa & Portátil em 1 Clique**:
  - Baixa diretamente das *Releases* e *Mirrors* oficiais de cada desenvolvedora sem depender de cota de API do GitHub.
  - Suporta arquivos `.zip`, `.7z`, instaladores NSIS e Inno Setup descompactados localmente na pasta do usuário (`%LOCALAPPDATA%\Synapps\apps`).
- **Aba de Notícias e Atualizações**:
  - Acompanhe *changelogs*, datas de lançamento e novidades de versão de todos os aplicativos ou apenas dos que você tem instalados.
- **Arquivos Recentes Inteligentes**:
  - Identifica e abre seus arquivos de projeto recentes (`.psd`, `.xcf`, `.kra`, `.blend`, `.svg`, `.godot`, `.fcstd`, etc.) diretamente no aplicativo compatível instalado.
- **Sistema de Temas Totalmente Modular (`.json`)**:
  - Inclui o **Tema Padrão (Synapps)** em vidro acrílico fosco com alternância **Claro / Escuro**, cor de destaque e cor dos ícones sincronizada com os botões da janela.
  - Permite **criar temas visualmente** dentro do próprio launcher, **exportar** e **instalar temas personalizados (`.json`)** criados pela comunidade.

---

## 🎨 Como Criar e Compartilhar Temas Personalizados (`.json`)

Os temas personalizados ficam armazenados em:
```text
%LOCALAPPDATA%\Synapps\themes\
```

Você pode criar um tema diretamente pela interface (**Configurações → Temas e Personalização → + Criar tema**) ou criar um arquivo `.synapps-theme.json` com a seguinte estrutura:

```json
{
  "id": "meu-tema-estudio",
  "name": "Meu Tema Estúdio",
  "author": "Seu Nome",
  "version": "1.0.0",
  "description": "Tema escuro personalizado para o Synapps Launcher.",
  "baseMode": "dark",
  "bgColor": "#111625",
  "surfaceColor": "#1b2338",
  "popoverColor": "#151c2e",
  "accentColor": "#8b5cf6",
  "iconColor": "#f8fafc",
  "textColor": "#f1f5f9",
  "textSecondaryColor": "#94a3b8",
  "borderColor": "#334155",
  "variables": {},
  "customCss": ""
}
```

Para instalar um tema criado por outra pessoa, basta clicar em **Instalar tema (`.json`)** nas configurações do launcher ou copiar o arquivo `.json` para a pasta `themes`.

---

## 🛠️ Como Compilar a partir do Código-Fonte

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v20+)
- [Rust & Cargo](https://rustup.rs/) (estável)
- Microsoft Visual Studio C++ Build Tools & WebView2 (no Windows)

### Passos

```bash
# 1. Instalar dependências do frontend
npm install

# 2. Executar em modo de desenvolvimento
npm run tauri dev

# 3. Gerar o instalador de produção (Windows NSIS)
npm run tauri build -- --bundles nsis
```

O instalador final será gerado em:
`src-tauri/target/release/bundle/nsis/Synapps Launcher_0.1.0_x64-setup.exe`

---

## 📄 Licença

Distribuído sob a licença **GNU General Public License v3.0 (GPLv3)**. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.
