TTS Web – Gerador de Audiobooks com Comandos Embutidos

Aplicação web completa para converter texto em áudio (Text-to-Speech) com suporte a comandos embutidos no texto, troca de vozes, pausas, controle de velocidade e pitch.

Pensado especialmente para:

audiobooks

narração de textos longos

roteiros com múltiplos personagens

automação via IA (LLMs)

O projeto roda localmente, sem depender de cloud paga, usando vozes neurais do Edge.

✨ Funcionalidades

Frontend web simples (textarea + player + download)

Backend Node.js + TypeScript

Geração de áudio MP3 ou WAV

Suporte a comandos no texto ([[pause]], [[voice]], etc.)

Troca dinâmica de vozes no meio do texto

Controle de:

velocidade (rate)

pitch (altura da voz)

Concatenação precisa com ffmpeg

Cache automático de áudio

Limpeza de arquivos temporários

Listagem de vozes disponíveis

Suporte a 2 vozes masculinas + 2 femininas na UI

🧠 Conceito principal

Você escreve (ou gera via IA) um texto roteirizado, usando comandos no formato:

[[comando:valor]]


O backend interpreta esses comandos e gera o áudio final exatamente com o timing e as vozes desejadas.

🗂 Estrutura do projeto
tts-web/
├── client/        # Frontend (Vite)
├── server/        # Backend (Node + TS)
├── .gitignore
├── README.md
└── package.json   # Monorepo (workspaces)

🚀 Como rodar o projeto
1) Pré-requisitos

Node.js 18+

ffmpeg instalado e disponível no PATH

Teste:

ffmpeg -version

Instalar ffmpeg

Windows: winget install Gyan.FFmpeg

Linux (Debian/Ubuntu): sudo apt install ffmpeg

macOS: brew install ffmpeg

2) Instalar dependências

Na raiz do projeto:

npm install

3) Rodar em modo desenvolvimento

Abra dois terminais.

Backend
npm run dev -w server

Frontend
npm run dev -w client


Abra no navegador:

http://localhost:5173

4) Verificar status do backend
http://localhost:3000/health


Resposta esperada:

{ "ok": true, "provider": "edge" }

🎤 Seleção de vozes

A interface oferece:

2 vozes masculinas (recomendadas)

2 vozes femininas (recomendadas)

Campo manual para digitar qualquer voz disponível

Prioridade de escolha

Voz manual (se preenchida)

Voz masculina selecionada

Voz feminina selecionada

Voz padrão do provider

Você pode listar vozes via API:

GET /api/voices?lang=pt-BR

🧩 Comandos embutidos no texto
⏸ Pausa (segundos)
[[pause:1.5]]

⏸ Pausa (milissegundos)
[[pause_ms:300]]

🗣 Troca de voz
[[voice:pt-BR-AntonioNeural]]


Afeta todo o texto a partir desse ponto até nova troca.

⚡ Velocidade (rate)
[[rate:1.1]]


Faixa típica: 0.5 a 2.0

🎚 Pitch (altura da voz)
[[pitch:-2]]   // mais grave
[[pitch:5]]    // mais agudo


Faixa típica: -20 a +20

✂ Break (quebra de segmento)
[[break]]


Força o encerramento do trecho atual e inicia um novo segmento de TTS.
Essencial para:

parágrafos

diálogos

troca de personagem

evitar “fala embolada”

📖 Exemplo completo (audiobook)
[[voice:pt-BR-AntonioNeural]][[rate:0.95]][[pitch:-2]]
Capítulo um. [[pause:1]]

O vento batia na janela. [[pause_ms:500]]

[[break]][[voice:pt-BR-FranciscaNeural]][[pitch:2]]
— Você ouviu isso? [[pause_ms:400]]

[[break]][[voice:pt-BR-AntonioNeural]][[pitch:-1]]
— Não foi nada. [[pause:1]]