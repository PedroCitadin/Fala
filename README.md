# TTS Web (Node.js + TypeScript) com comandos [[...]]

Sistema web que converte texto em áudio (TTS), suporta comandos embutidos no texto e concatena segmentos com ffmpeg.

## Funcionalidades
- UI web: textarea + opções (idioma/voz/velocidade/pitch/formato)
- Endpoint `POST /api/tts` que:
  - Faz parse do texto com comandos `[[...]]`
  - Gera TTS por segmentos (SPEAK)
  - Gera pausas como silêncio com duração exata
  - Concatena tudo em um único arquivo final com ffmpeg
- Provider plugável:
  - **Stub** (padrão): gera WAV silencioso (útil para testes end-to-end)
  - **Google Cloud TTS** (exemplo real, pronto para usar)
- Cache por hash (texto + parâmetros + eventos)
- Rate limit por IP
- Limites de segurança (texto e pausa máxima)
- Limpeza de temporários e cache antigo por TTL

---

## Requisitos
- Node.js 18+ (recomendado 20+)
- **ffmpeg** instalado e disponível no PATH

### Instalar ffmpeg

#### Windows (opções)
- **Chocolatey**: `choco install ffmpeg`
- **Winget**: `winget install Gyan.FFmpeg`
- Ou baixe o build e adicione `bin/` no PATH.

#### Linux (Debian/Ubuntu)
```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
