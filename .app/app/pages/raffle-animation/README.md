# 🎰 Tela de Animação de Sorteio

Uma tela fullscreen impressionante para exibição de sorteios em TVs do cassino, com animações envolventes e efeitos visuais espetaculares.

## 🚀 Funcionalidades

### ✨ Animações Principais
- **Rolagem de Participantes**: Estilo "slot machine" com rolagem suave
- **Revelação do Ganhador**: Animação dramática com escala e rotação
- **Celebração**: Confetes, brilhos e partículas em movimento
- **Efeitos Visuais**: Gradientes, sombras e transições suaves

### 🎨 Design Visual
- **Fullscreen**: Sem menus, headers ou sidebars
- **Marca da Empresa**: Logo e nome destacados
- **Gradientes**: Backgrounds coloridos e modernos
- **Responsivo**: Adapta-se a diferentes tamanhos de tela

### 🎯 Experiência do Usuário
- **Carregamento**: Spinner animado durante carregamento
- **Controles**: Botão para reiniciar animação
- **Feedback Visual**: Estados claros para cada fase
- **Acessibilidade**: Cores contrastantes e textos legíveis

## 🛠️ Tecnologias Utilizadas

- **Vue.js 3**: Framework principal
- **GSAP**: Animações avançadas e suaves
- **Canvas Confetti**: Efeitos de confete realistas
- **Tailwind CSS**: Estilização e responsividade
- **TypeScript**: Tipagem estática

## 📁 Estrutura de Arquivos

```
app/
├── pages/
│   └── raffle-animation/
│       └── [raffleId].vue          # Página principal da animação
├── components/
│   └── ParticleCanvas.vue         # Canvas para partículas customizadas
├── plugins/
│   └── gsap.client.ts             # Plugin GSAP
└── types/
    └── confetti.d.ts              # Declarações de tipo
```

## 🎮 Como Usar

### 1. Acessar a Animação
- Na página de sorteios, clique no botão **"Animação"**
- A tela abrirá em nova aba (fullscreen)

### 2. URL Direta
```
/raffle-animation/[ID_DO_SORTEIO]
```

### 3. Controles Disponíveis
- **Novo Sorteio**: Executa um sorteio real completo no backend
- **Clique na Tela**: Adiciona partículas extras

### 4. ⚠️ IMPORTANTE - Como Funciona o Sorteio

#### **🎯 Sorteio Real (Backend)**
- **Execução**: Chama a API `/raffles/{id}/execute` (POST)
- **Processo**: Seleciona ganhadores usando algoritmo seguro
- **Resultado**: Retorna dados reais do sorteio
- **Persistência**: Salva ganhadores no banco de dados

#### **🎬 Animação (Frontend)**
- **Rolagem**: Mostra participantes durante 8 segundos
- **Execução**: Chama API real do backend
- **Revelação**: Mostra ganhador real selecionado
- **Celebração**: Efeitos visuais para o ganhador

#### **🔄 Fluxo Completo**
1. **Loading**: Carrega dados do sorteio
2. **Spinning**: Rolagem visual dos participantes
3. **Executing**: Chama API para executar sorteio real
4. **Revealing**: Mostra ganhador real selecionado
5. **Celebrating**: Efeitos de celebração
6. **Finished**: Tela final com dados reais

## 🎬 Sequência da Animação

### 1. **Loading** (2-3 segundos)
- Spinner de carregamento
- Carregamento dos dados do sorteio

### 2. **Spinning** (8 segundos)
- Rolagem dos participantes
- Efeito "slot machine"
- Velocidade gradual

### 3. **Executing** (1-2 segundos)
- **IMPORTANTE**: Chama API real do backend
- Executa sorteio completo com algoritmo seguro
- Seleciona ganhadores reais
- Salva resultados no banco de dados

### 4. **Revealing** (2 segundos)
- Parada da rolagem
- Aparição do cartão do ganhador REAL
- Animação de escala e rotação
- Mostra dados reais: nome, CPF, prêmio, bilhete

### 5. **Celebrating** (5 segundos)
- Disparo de confetes
- Efeitos de brilho
- Partículas em movimento

### 6. **Finished**
- Tela final com ganhador real
- Opção de executar novo sorteio

## 🎨 Personalização

### Cores da Empresa
```css
/* Alterar no arquivo de estilos */
.company-name {
  color: #SUA_COR_PRINCIPAL;
}

.logo {
  background: linear-gradient(45deg, #SUA_COR_1, #SUA_COR_2);
}
```

### Durações da Animação
```typescript
const SPIN_DURATION = 8000      // Tempo de rolagem
const REVEAL_DURATION = 2000    // Tempo de revelação
const CELEBRATION_DURATION = 5000 // Tempo de celebração
```

### Cores dos Confetes
```typescript
colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3']
```

## 📱 Responsividade

- **Desktop**: Experiência completa
- **Tablet**: Adaptação de tamanhos
- **Mobile**: Layout otimizado
- **TV**: Fullscreen perfeito

## 🔧 Configuração para TV

### 1. Modo Kiosk
```bash
# Chrome em modo kiosk
chrome --kiosk --app=http://localhost:3000/raffle-animation/[ID]
```

### 2. Fullscreen Automático
- A página já está configurada para fullscreen
- Sem barras de navegação
- Sem menus do sistema

### 3. Controle Remoto
- Botão "Novo Sorteio" sempre visível
- Clique em qualquer lugar para efeitos extras

## 🎯 Casos de Uso

### 🏆 Sorteios ao Vivo
- Exibição em TVs do cassino
- Criação de expectativa
- Celebração dos ganhadores

### 🎪 Eventos Especiais
- Sorteios promocionais
- Aniversários do cassino
- Torneios especiais

### 📺 Transmissões
- Streaming ao vivo
- Gravação para redes sociais
- Compartilhamento de momentos

## 🚀 Performance

- **Otimizado**: Animações suaves em 60fps
- **Leve**: Carregamento rápido
- **Eficiente**: Uso mínimo de recursos
- **Estável**: Sem travamentos ou lag

## 🎨 Efeitos Visuais

### Gradientes
- Backgrounds dinâmicos
- Transições suaves
- Cores vibrantes

### Animações GSAP
- Movimentos fluidos
- Easing natural
- Performance otimizada

### Partículas
- Canvas personalizado
- Física realista
- Interatividade

### Confetes
- Múltiplas cores
- Trajetórias realistas
- Timing perfeito

## 🎉 Resultado Final

Uma experiência visual impressionante que:
- ✅ Cria expectativa nos participantes
- ✅ Celebra os ganhadores de forma especial
- ✅ Mantém o público engajado
- ✅ Transmite profissionalismo
- ✅ Funciona perfeitamente em TVs

**Perfeito para criar momentos memoráveis no cassino!** 🎰✨
