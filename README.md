# 📚 TTS Web – Gerador de Audiobooks com Comandos Embutidos

Aplicação web completa para **converter texto em áudio (Text-to-Speech)** com suporte a **comandos embutidos no texto**, troca de vozes, pausas, controle de velocidade e pitch.

Projetada especialmente para:
- 📖 **Audiobooks**
- 🎙 Narração de textos longos
- 🎭 Histórias com múltiplos personagens
- 🤖 Automação via IA (LLMs)

O projeto roda **localmente**, sem depender de cloud paga, usando vozes neurais do Edge.

---

## ✨ Funcionalidades

- Frontend web simples (textarea + player + download)
- Backend Node.js + TypeScript
- Geração de áudio **MP3 ou WAV**
- Comandos no texto (`[[pause]]`, `[[voice]]`, etc.)
- Troca dinâmica de vozes no meio do texto
- Controle de:
  - Velocidade (rate)
  - Pitch (altura da voz)
- Concatenação precisa com **ffmpeg**
- Cache automático de áudio
- Limpeza de arquivos temporários
- Listagem de vozes disponíveis
- UI com **2 vozes masculinas + 2 femininas**

---

## 🧠 Conceito principal

Você escreve (ou gera via IA) um texto **roteirizado**, usando comandos no formato:

[[comando:valor]]

yaml
Copiar código

O backend interpreta esses comandos e gera o áudio final exatamente com o timing e as vozes desejadas.

---

## 🗂 Estrutura do projeto

tts-web/
├── client/ # Frontend (Vite)
├── server/ # Backend (Node + TypeScript)
├── .gitignore
├── README.md
└── package.json # Monorepo (workspaces)

yaml
Copiar código

---

## 🚀 Como rodar o projeto

### 1️⃣ Pré-requisitos

- **Node.js 18+**
- **ffmpeg** instalado e disponível no PATH

Teste:
```bash
ffmpeg -version
Instalar ffmpeg
Windows

bash
Copiar código
winget install Gyan.FFmpeg
Linux (Debian/Ubuntu)

bash
Copiar código
sudo apt install ffmpeg
macOS

bash
Copiar código
brew install ffmpeg
2️⃣ Instalar dependências
Na raiz do projeto:

bash
Copiar código
npm install
3️⃣ Rodar em modo desenvolvimento
Abra dois terminais.

Backend
bash
Copiar código
npm run dev -w server
Frontend
bash
Copiar código
npm run dev -w client
Abra no navegador:

arduino
Copiar código
http://localhost:5173
4️⃣ Verificar status do backend
bash
Copiar código
http://localhost:3000/health
Resposta esperada:

json
Copiar código
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

Listar vozes via API:

bash
Copiar código
GET /api/voices?lang=pt-BR
🧩 Comandos embutidos no texto
⏸ Pausa (segundos)
lua
Copiar código
[[pause:1.5]]
⏸ Pausa (milissegundos)
lua
Copiar código
[[pause_ms:300]]
🗣 Troca de voz
lua
Copiar código
[[voice:pt-BR-AntonioNeural]]
Afeta todo o texto a partir desse ponto até nova troca.

⚡ Velocidade (rate)
lua
Copiar código
[[rate:1.1]]
Faixa típica: 0.5 a 2.0

🎚 Pitch (altura da voz)
lua
Copiar código
[[pitch:-2]]   // mais grave
[[pitch:5]]    // mais agudo
Faixa típica: -20 a +20

✂ Break (quebra de segmento)
lua
Copiar código
[[break]]
Força o encerramento do trecho atual e inicia um novo segmento de TTS.
Essencial para:

Parágrafos

Diálogos

Troca de personagem

Evitar fala “embolada”

📖 Exemplo completo (audiobook)
text
Copiar código
[[voice:pt-BR-AntonioNeural]][[rate:0.95]][[pitch:-2]]
Capítulo um. [[pause:1]]

O vento batia na janela. [[pause_ms:500]]

[[break]][[voice:pt-BR-FranciscaNeural]][[pitch:2]]
— Você ouviu isso? [[pause_ms:400]]

[[break]][[voice:pt-BR-AntonioNeural]][[pitch:-1]]
— Não foi nada. [[pause:1]]
🤖 Uso com IA (automação de capítulos)
Fluxo recomendado:

Jogar um capítulo/página em uma IA

A IA devolve o texto roteirizado com comandos

Colar o resultado direto na aplicação TTS

Convenção sugerida
1 narrador fixo

Máx. 4 personagens

Voz consistente por personagem

Uso frequente de [[break]]

Pausas naturais

📄 Um manual completo em PDF acompanha o projeto com prompt pronto para IA.

📦 API principal
Gerar áudio
bash
Copiar código
POST /api/tts
Body:

json
Copiar código
{
  "text": "Olá [[pause:1]] mundo",
  "voice": "pt-BR-AntonioNeural",
  "lang": "pt-BR",
  "rate": 1.0,
  "pitch": 0,
  "format": "mp3"
}
Resposta:

json
Copiar código
{
  "id": "abc123",
  "audioUrl": "/audio/abc123.mp3",
  "format": "mp3",
  "bytes": 123456,
  "durationSec": 12.3,
  "cached": false
}
🧹 Cache e limpeza
Áudios e temporários são apagados automaticamente por TTL

Mesmo texto + mesmas configurações reutilizam áudio (cache)

🛠 Problemas comuns
❌ Não sai som
Verifique se o provider não está em stub

Confira /health

❌ ffmpeg não encontrado
ffmpeg não está no PATH

Reinstale e reabra o terminal

❌ Voz inexistente
Consulte /api/voices

Use uma voz listada na UI

📜 Licença
Defina conforme sua intenção (MIT, GPL, etc.).

💡 Observação final
Este projeto foi pensado para controle criativo total sobre áudio, não apenas “converter texto em voz”.

Se você escreve (ou gera) bons roteiros, o áudio final fica nível profissional.

markdown
Copiar código

Se quiser, no próximo passo eu:
- deixo esse README ainda mais “open-source friendly”  
- adiciono badges (Node, License, Status)  
- ou escrevo um **README só para a IA formatadora**  

Agora seu repositório está com cara de projeto sério, não experimento jogado no Git.