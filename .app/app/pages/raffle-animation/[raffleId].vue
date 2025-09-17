<script setup lang="ts">
import { useApi } from '~/composables/useAuth'
import ParticleCanvas from '~/components/ParticleCanvas.vue'

const { useCustomFetch } = useApi()
const route = useRoute()
const raffleId = route.params.raffleId as string

// Estados da animação
const animationPhase = ref<'loading' | 'spinning' | 'revealing' | 'celebrating' | 'finished'>('loading')
const participants = ref<any[]>([])
const winner = ref<any>(null)
const prize = ref<any>(null)
const raffle = ref<any>(null)
const loading = ref(true)

// Elementos para animação
const wheelRef = ref<HTMLElement>()
const winnerCardRef = ref<HTMLElement>()
const confettiRef = ref<HTMLElement>()
const particleCanvasRef = ref<InstanceType<typeof ParticleCanvas>>()

// Configurações da animação
const SPIN_DURATION = 8000 // 8 segundos de rolagem
const REVEAL_DURATION = 2000 // 2 segundos para revelar
const CELEBRATION_DURATION = 5000 // 5 segundos de celebração

// Carregar dados do sorteio
async function loadRaffleData() {
  try {
    const { data } = await useCustomFetch<any>(`/raffles/${raffleId}`, {
      method: 'GET'
    })
    
    raffle.value = data
    participants.value = data.entries || []
    
    if (participants.value.length === 0) {
      throw new Error('Nenhum participante encontrado')
    }
    
    loading.value = false
    startAnimation()
  } catch (error) {
    console.error('Erro ao carregar dados do sorteio:', error)
    loading.value = false
  }
}

// Iniciar sequência de animação
function startAnimation() {
  animationPhase.value = 'spinning'
  spinWheel()
}

// Animação da roleta
function spinWheel() {
  if (!wheelRef.value) return
  
  const wheel = wheelRef.value
  const items = wheel.querySelectorAll('.participant-item')
  
  // Criar animação GSAP
  const tl = gsap.timeline()
  
  // Animação de rolagem rápida inicial
  tl.to(items, {
    y: -50,
    duration: 0.5,
    stagger: 0.1,
    ease: "power2.out"
  })
  
  // Loop de rolagem
  tl.to(items, {
    y: `-=${participants.value.length * 100}`,
    duration: SPIN_DURATION / 1000,
    ease: "power2.inOut",
    repeat: -1,
    modifiers: {
      y: gsap.utils.wrap(0, participants.value.length * 100)
    }
  })
  
  // Parar e executar sorteio real após duração
  setTimeout(() => {
    tl.kill()
    executeRealRaffle()
  }, SPIN_DURATION)
}

// Executar sorteio real no backend
async function executeRealRaffle() {
  try {
    // Mostrar loading durante execução
    animationPhase.value = 'loading'
    
    // Executar sorteio completo (todos os prêmios)
    const { data } = await useCustomFetch<any>(`/raffles/${raffleId}/execute`, {
      method: 'POST'
    })
    
    // Atualizar dados do sorteio
    raffle.value = data
    
    // Pegar o último ganhador (mais recente)
    const latestWinner = data.winners?.[data.winners.length - 1]
    if (latestWinner) {
      winner.value = latestWinner
      prize.value = latestWinner.prize
    }
    
    revealWinner()
  } catch (error) {
    console.error('Erro ao executar sorteio:', error)
    // Fallback para sorteio simulado em caso de erro
    revealWinnerSimulated()
  }
}

// Revelar ganhador (versão real)
function revealWinner() {
  animationPhase.value = 'revealing'
  
  // Animação de revelação
  if (winnerCardRef.value) {
    gsap.fromTo(winnerCardRef.value, 
      { 
        scale: 0, 
        rotation: 180,
        opacity: 0 
      },
      { 
        scale: 1, 
        rotation: 0,
        opacity: 1,
        duration: REVEAL_DURATION / 1000,
        ease: "back.out(1.7)"
      }
    )
  }
  
  // Iniciar celebração após revelação
  setTimeout(() => {
    startCelebration()
  }, REVEAL_DURATION)
}

// Revelar ganhador (versão simulada - fallback)
function revealWinnerSimulated() {
  animationPhase.value = 'revealing'
  
  // Selecionar ganhador aleatório
  const randomIndex = Math.floor(Math.random() * participants.value.length)
  winner.value = participants.value[randomIndex]
  
  // Encontrar prêmio correspondente (simplificado)
  prize.value = raffle.value.prizes?.[0] || { name: 'Prêmio Principal' }
  
  revealWinner()
}

// Iniciar celebração com confetes
function startCelebration() {
  animationPhase.value = 'celebrating'
  
  // Disparar confetes
  triggerConfetti()
  
  // Efeitos de brilho e partículas
  createSparkleEffect()
  
  // Adicionar partículas no centro da tela
  if (particleCanvasRef.value) {
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    particleCanvasRef.value.addParticles(centerX, centerY, 50)
  }
  
  // Finalizar após duração
  setTimeout(() => {
    animationPhase.value = 'finished'
  }, CELEBRATION_DURATION)
}

// Disparar confetes
function triggerConfetti() {
  if (typeof window !== 'undefined' && window.confetti) {
    // Confete principal
    window.confetti({
      particleCount: 150,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3']
    })
    
    // Confetes laterais
    setTimeout(() => {
      window.confetti({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3']
      })
      window.confetti({
        particleCount: 100,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3']
      })
    }, 500)
  }
}

// Criar efeito de brilho
function createSparkleEffect() {
  if (!winnerCardRef.value) return
  
  const sparkles = []
  for (let i = 0; i < 20; i++) {
    const sparkle = document.createElement('div')
    sparkle.className = 'sparkle'
    sparkle.style.cssText = `
      position: absolute;
      width: 4px;
      height: 4px;
      background: #ffd700;
      border-radius: 50%;
      pointer-events: none;
      z-index: 1000;
    `
    
    winnerCardRef.value.appendChild(sparkle)
    sparkles.push(sparkle)
    
    // Animação do brilho
    gsap.fromTo(sparkle, 
      { 
        x: Math.random() * 400 - 200,
        y: Math.random() * 400 - 200,
        scale: 0,
        opacity: 0
      },
      { 
        scale: 1,
        opacity: 1,
        duration: 0.5,
        delay: Math.random() * 2,
        ease: "power2.out"
      }
    )
    
    gsap.to(sparkle, {
      scale: 0,
      opacity: 0,
      duration: 0.5,
      delay: Math.random() * 2 + 1,
      ease: "power2.in"
    })
  }
}

// Reiniciar animação
function restartAnimation() {
  animationPhase.value = 'loading'
  winner.value = null
  prize.value = null
  
  // Recarregar dados e executar novo sorteio
  loadRaffleData()
}

// Carregar confetti library
onMounted(async () => {
  // Carregar canvas-confetti
  if (typeof window !== 'undefined') {
    const confetti = await import('canvas-confetti')
    window.confetti = confetti.default
  }
  
  loadRaffleData()
})

// Meta da página
definePageMeta({
  layout: false // Remove layout padrão para fullscreen
})
</script>

<template>
  <div class="raffle-animation-screen">
    <!-- Loading State -->
    <div v-if="loading || animationPhase === 'loading'" class="loading-screen">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <h2 class="loading-text">
          {{ animationPhase === 'loading' ? 'Executando Sorteio...' : 'Carregando Sorteio...' }}
        </h2>
      </div>
    </div>

    <!-- Main Animation Screen -->
    <div v-else class="animation-container">
      <!-- Header com Logo -->
      <header class="animation-header">
        <div class="logo-section">
          <div class="logo">
            <Icon name="lucide:crown" class="logo-icon" />
          </div>
          <h1 class="company-name">CASINO ROYALE</h1>
        </div>
        <div class="raffle-info">
          <h2 class="raffle-title">{{ raffle?.name }}</h2>
          <p class="raffle-subtitle">Sorteio ao Vivo</p>
          <div class="raffle-stats">
            <div class="stat-item">
              <span class="stat-label">Participantes:</span>
              <span class="stat-value">{{ participants.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Prêmios:</span>
              <span class="stat-value">{{ raffle?.prizes?.length || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Status:</span>
              <span class="stat-value">{{ raffle?.status }}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Wheel Animation -->
      <div v-if="animationPhase === 'spinning'" class="wheel-container">
        <div class="wheel-mask">
          <div ref="wheelRef" class="participant-wheel">
            <div 
              v-for="(participant, index) in [...participants, ...participants, ...participants]" 
              :key="`${participant.id}-${index}`"
              class="participant-item"
            >
              <div class="participant-avatar">
                <Icon name="lucide:user" class="avatar-icon" />
              </div>
              <div class="participant-info">
                <h3 class="participant-name">{{ participant.user?.name || 'Participante' }}</h3>
                <p class="participant-tickets">{{ participant.ticket }} bilhetes</p>
              </div>
            </div>
          </div>
        </div>
        <div class="wheel-pointer">
          <Icon name="lucide:triangle" class="pointer-icon" />
        </div>
      </div>

      <!-- Winner Reveal -->
      <div v-if="animationPhase === 'revealing' || animationPhase === 'celebrating' || animationPhase === 'finished'" class="winner-container">
        <div ref="winnerCardRef" class="winner-card">
          <div class="winner-glow"></div>
          <div class="winner-content">
            <div class="winner-avatar">
              <Icon name="lucide:crown" class="crown-icon" />
              <Icon name="lucide:user" class="avatar-icon" />
            </div>
            <h1 class="winner-name">{{ winner?.user?.name || 'Ganhador' }}</h1>
            <div class="prize-info">
              <h2 class="prize-name">{{ prize?.name }}</h2>
              <p class="prize-description">{{ prize?.description || 'Parabéns!' }}</p>
              <div v-if="prize?.value" class="prize-value">
                Valor: R$ {{ prize.value }}
              </div>
            </div>
            <div class="winner-ticket">
              <span class="ticket-label">Bilhete da Sorte:</span>
              <span class="ticket-number">#{{ winner?.entry?.ticket || winner?.ticket }}</span>
            </div>
            <div v-if="winner?.user?.document" class="winner-document">
              <span class="document-label">CPF:</span>
              <span class="document-number">{{ winner.user.document }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="animation-controls">
        <button @click="restartAnimation" class="restart-btn">
          <Icon name="lucide:refresh-cw" class="btn-icon" />
          <span>Novo Sorteio</span>
        </button>
      </div>

      <!-- Confetti Container -->
      <div ref="confettiRef" class="confetti-container"></div>
      
      <!-- Particle Canvas -->
      <ParticleCanvas ref="particleCanvasRef" />
    </div>
  </div>
</template>

<style scoped>
.raffle-animation-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
  font-family: 'Inter', sans-serif;
}

.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.loading-spinner {
  text-align: center;
  color: white;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.animation-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.animation-header {
  padding: 30px 50px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo {
  width: 60px;
  height: 60px;
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
}

.logo-icon {
  width: 30px;
  height: 30px;
  color: #8b4513;
}

.company-name {
  font-size: 36px;
  font-weight: 900;
  color: white;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  letter-spacing: 2px;
}

.raffle-info {
  text-align: right;
  color: white;
}

.raffle-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 5px 0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.raffle-subtitle {
  font-size: 16px;
  margin: 0 0 15px 0;
  opacity: 0.9;
}

.raffle-stats {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #ffd700;
}

.wheel-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 50px;
}

.wheel-mask {
  width: 400px;
  height: 300px;
  overflow: hidden;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 3px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.5);
}

.participant-wheel {
  display: flex;
  flex-direction: column;
  animation: none;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  min-height: 80px;
}

.participant-item:hover {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
}

.participant-avatar {
  width: 50px;
  height: 50px;
  background: linear-gradient(45deg, #4ecdc4, #44a08d);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(78, 205, 196, 0.3);
}

.avatar-icon {
  width: 24px;
  height: 24px;
  color: white;
}

.participant-info {
  flex: 1;
  color: white;
}

.participant-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 5px 0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.participant-tickets {
  font-size: 14px;
  margin: 0;
  opacity: 0.8;
}

.wheel-pointer {
  position: absolute;
  top: 50%;
  right: 100px;
  transform: translateY(-50%);
  z-index: 10;
}

.pointer-icon {
  width: 40px;
  height: 40px;
  color: #ffd700;
  filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));
}

.winner-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 50px;
}

.winner-card {
  position: relative;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
  border-radius: 30px;
  padding: 60px;
  text-align: center;
  box-shadow: 0 0 100px rgba(255, 215, 0, 0.3);
  border: 3px solid rgba(255, 215, 0, 0.5);
  backdrop-filter: blur(20px);
  max-width: 600px;
  width: 100%;
}

.winner-glow {
  position: absolute;
  top: -20px;
  left: -20px;
  right: -20px;
  bottom: -20px;
  background: linear-gradient(45deg, #ffd700, #ffed4e, #ffd700);
  border-radius: 40px;
  opacity: 0.3;
  animation: glow 2s ease-in-out infinite alternate;
  z-index: -1;
}

@keyframes glow {
  from { opacity: 0.3; transform: scale(1); }
  to { opacity: 0.6; transform: scale(1.05); }
}

.winner-content {
  position: relative;
  z-index: 1;
}

.winner-avatar {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 30px;
  background: linear-gradient(45deg, #4ecdc4, #44a08d);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 50px rgba(78, 205, 196, 0.5);
}

.crown-icon {
  position: absolute;
  top: -20px;
  width: 40px;
  height: 40px;
  color: #ffd700;
  animation: bounce 1s ease-in-out infinite alternate;
}

@keyframes bounce {
  from { transform: translateY(0px); }
  to { transform: translateY(-5px); }
}

.avatar-icon {
  width: 50px;
  height: 50px;
  color: white;
}

.winner-name {
  font-size: 48px;
  font-weight: 900;
  color: #2c3e50;
  margin: 0 0 20px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.prize-info {
  margin: 30px 0;
  padding: 20px;
  background: linear-gradient(135deg, rgba(78, 205, 196, 0.1), rgba(68, 160, 141, 0.1));
  border-radius: 15px;
  border: 2px solid rgba(78, 205, 196, 0.3);
}

.prize-name {
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 10px 0;
}

.prize-description {
  font-size: 18px;
  color: #7f8c8d;
  margin: 0;
}

.prize-value {
  font-size: 20px;
  font-weight: 700;
  color: #27ae60;
  margin-top: 10px;
  padding: 10px 20px;
  background: rgba(39, 174, 96, 0.1);
  border-radius: 10px;
  border: 2px solid rgba(39, 174, 96, 0.3);
}

.winner-ticket {
  margin-top: 30px;
  padding: 15px 30px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  border-radius: 25px;
  color: white;
  display: inline-block;
}

.ticket-label {
  font-size: 16px;
  font-weight: 600;
  margin-right: 10px;
}

.ticket-number {
  font-size: 20px;
  font-weight: 900;
  font-family: 'Courier New', monospace;
}

.winner-document {
  margin-top: 20px;
  padding: 15px 30px;
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
  border-radius: 25px;
  color: white;
  display: inline-block;
}

.document-label {
  font-size: 16px;
  font-weight: 600;
  margin-right: 10px;
}

.document-number {
  font-size: 18px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.animation-controls {
  position: absolute;
  bottom: 30px;
  right: 30px;
}

.restart-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 25px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 25px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.restart-btn:hover {
  background: rgba(0, 0, 0, 0.5);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
}

.btn-icon {
  width: 20px;
  height: 20px;
}

.confetti-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

.sparkle {
  animation: sparkle 2s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1); }
}

/* Responsive */
@media (max-width: 768px) {
  .animation-header {
    padding: 20px 30px;
    flex-direction: column;
    gap: 20px;
  }
  
  .company-name {
    font-size: 28px;
  }
  
  .raffle-title {
    font-size: 24px;
  }
  
  .wheel-mask {
    width: 300px;
    height: 250px;
  }
  
  .winner-card {
    padding: 40px 30px;
    margin: 20px;
  }
  
  .winner-name {
    font-size: 36px;
  }
  
  .prize-name {
    font-size: 24px;
  }
}
</style>
