<script setup lang="ts">
import PanelClientTimeTracking from '~/components/panels/raffle-operator/PanelClientTimeTracking.vue'
import { useApi } from '~/composables/useAuth'

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

definePageMeta({
  title: 'Controle de Sorteios - Operador',
  preview: {
    title: 'Controle de Tempo de Jogo',
    description: 'Marque clientes jogando nos sorteios',
    categories: ['layouts', 'lists'],
    src: '/img/screens/layouts-cards.png',
    srcDark: '/img/screens/layouts-cards-dark.png',
    order: 15,
    new: true,
  },
})

const { open } = usePanels()

// Estados reativos
const activeRaffles = ref<any[]>([])
const clients = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const selectedRaffle = ref<any>(null)
const filterByDeposits = ref(true)

// Opções de filtro
const filterOptions = [
  { value: 'all', label: 'Todos os clientes' },
  { value: 'deposits', label: 'Depositaram hoje' },
  { value: 'active', label: 'Jogando agora' },
  { value: 'inactive', label: 'Não estão jogando' },
]

const currentFilter = ref('all')

// Buscar sorteios ativos
async function getActiveRaffles() {
  try {
    loading.value = true
    const { data } = await useCustomFetch<any>('/raffle-operator/active-raffles', {
      method: 'GET',
    })
    activeRaffles.value = data || []
    
    // Selecionar o primeiro sorteio ativo por padrão
    if (activeRaffles.value.length > 0) {
      selectedRaffle.value = activeRaffles.value[0]
      await getClients()
    }
  } catch (error) {
    console.error('Erro ao buscar sorteios ativos:', error)
    toaster.add({
      title: 'Erro',
      description: 'Erro ao carregar sorteios ativos',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  } finally {
    loading.value = false
  }
}

// Buscar clientes
async function getClients() {
  if (!selectedRaffle.value) return
  
  try {
    loading.value = true
    const { data } = await useCustomFetch<any>('/raffle-operator/search/users', {
      method: 'GET',
      query: {
        raffleId: selectedRaffle.value.id,
        filter: currentFilter.value,
        search: searchQuery.value
      }
    })
    clients.value = data || []
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    toaster.add({
      title: 'Erro',
      description: 'Erro ao carregar clientes',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  } finally {
    loading.value = false
  }
}

// Iniciar controle de tempo para cliente
function startTimeTracking(client: any) {
  open(PanelClientTimeTracking, { 
    client, 
    raffle: selectedRaffle.value,
    onSuccess: async () => {
      await getClients()
    }
  })
}

// Pausar tempo de cliente
async function pauseTimeTracking(client: any) {
  try {
    await useCustomFetch<any>(`/raffle-operator/tracking/${selectedRaffle.value.id}/${client.id}`, {
      method: 'POST',
      body: { action: 'pause' }
    })

    toaster.add({
      title: 'Sucesso',
      description: `Tempo pausado para ${client.name}`,
      icon: 'ph:check-circle-fill',
      progress: true,
    })

    await getClients()
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao pausar tempo',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  }
}

// Retomar tempo de cliente
async function resumeTimeTracking(client: any) {
  try {
    await useCustomFetch<any>(`/raffle-operator/tracking/${selectedRaffle.value.id}/${client.id}`, {
      method: 'POST',
      body: { action: 'resume' }
    })

    toaster.add({
      title: 'Sucesso',
      description: `Tempo retomado para ${client.name}`,
      icon: 'ph:check-circle-fill',
      progress: true,
    })

    await getClients()
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao retomar tempo',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  }
}

// Formatar tempo
function formatTime(hours: number): string {
  if (!hours) return '0h 0m'
  const h = Math.floor(hours)
  const m = Math.floor((hours - h) * 60)
  return `${h}h ${m}m`
}

// Formatar valor em reais
function formatCurrency(value: number): string {
  if (!value) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Formatar data
function formatDate(date: string) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Obter status do cliente
function getClientStatus(client: any) {
  if (client.timeTracking?.isActive) {
    return { label: 'Jogando', color: 'bg-success-500', textColor: 'text-success-600' }
  } else if (client.timeTracking?.totalHours > 0) {
    return { label: 'Pausado', color: 'bg-warning-500', textColor: 'text-warning-600' }
  } else {
    return { label: 'Inativo', color: 'bg-muted-300', textColor: 'text-muted-500' }
  }
}

// Clientes filtrados
const filteredClients = computed(() => {
  let filtered = clients.value

  // Filtro por busca
  if (searchQuery.value) {
    filtered = filtered.filter(client => 
      client.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      client.document?.includes(searchQuery.value)
    )
  }

  // Filtro por tipo
  switch (currentFilter.value) {
    case 'deposits':
      filtered = filtered.filter(client => client.hasDepositsToday)
      break
    case 'active':
      filtered = filtered.filter(client => client.timeTracking?.isActive)
      break
    case 'inactive':
      filtered = filtered.filter(client => !client.timeTracking?.isActive)
      break
  }

  // Ordenação: depositaram hoje primeiro, depois por tempo acumulado
  return filtered.sort((a, b) => {
    // Prioriza quem depositou hoje
    if (a.hasDepositsToday && !b.hasDepositsToday) return -1
    if (!a.hasDepositsToday && b.hasDepositsToday) return 1
    
    // Depois por tempo acumulado (maior primeiro)
    const timeA = a.timeTracking?.totalHours || 0
    const timeB = b.timeTracking?.totalHours || 0
    return timeB - timeA
  })
})

// Estatísticas do sorteio
const raffleStats = computed(() => {
  if (!selectedRaffle.value) return null
  
  const totalParticipants = clients.value.length
  const activePlayers = clients.value.filter(c => c.timeTracking?.isActive).length
  const totalHours = clients.value.reduce((sum, c) => sum + (c.timeTracking?.totalHours || 0), 0)
  const totalTickets = clients.value.reduce((sum, c) => sum + (c.timeTracking?.ticketsEarned || 0), 0)
  
  return {
    totalParticipants,
    activePlayers,
    totalHours,
    totalTickets
  }
})

// Watchers
watch([selectedRaffle, currentFilter, searchQuery], () => {
  if (selectedRaffle.value) {
    getClients()
  }
})

onMounted(() => {
  getActiveRaffles()
})
</script>

<template>
  <div class="w-full px-4 md:px-6 lg:px-8 pb-20 dark:[--color-input-default-bg:var(--color-muted-950)]">
    <!-- Header -->
    <div class="flex items-center justify-between py-6">
      <div>
        <BaseHeading
          as="h1"
          size="xl"
          weight="bold"
          class="text-muted-900 dark:text-muted-100 mb-2"
        >
          Controle de Sorteios
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-500 dark:text-muted-400">
          Marque clientes jogando e controle o tempo acumulado
        </BaseParagraph>
      </div>
      
      <div class="flex items-center gap-4">
        <BaseButton
          @click="getActiveRaffles"
          variant="muted"
          size="sm"
          rounded="lg"
          :loading="loading"
        >
          <Icon name="lucide:refresh-cw" class="size-4" />
          <span>Atualizar</span>
        </BaseButton>
      </div>
    </div>

    <!-- Seleção de Sorteio -->
    <div v-if="activeRaffles.length > 0" class="mb-6">
      <BaseField label="Sorteio Ativo">
        <BaseSelect
          v-model="selectedRaffle"
          rounded="lg"
          placeholder="Selecione um sorteio"
        >
          <BaseSelectItem
            v-for="raffle in activeRaffles"
            :key="raffle.id"
            :value="raffle"
          >
            {{ raffle.name }} - {{ raffle.hoursPerTicket }}h por bilhete
          </BaseSelectItem>
        </BaseSelect>
      </BaseField>
    </div>

    <!-- Estatísticas do Sorteio -->
    <div v-if="raffleStats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-muted-900 dark:text-muted-100">
          {{ raffleStats.totalParticipants }}
        </div>
        <div class="text-sm text-muted-500 dark:text-muted-400">
          Participantes
        </div>
      </div>
      <div class="bg-success-50 dark:bg-success-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-success-600 dark:text-success-400">
          {{ raffleStats.activePlayers }}
        </div>
        <div class="text-sm text-success-500 dark:text-success-400">
          Jogando Agora
        </div>
      </div>
      <div class="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">
          {{ formatTime(raffleStats.totalHours) }}
        </div>
        <div class="text-sm text-primary-500 dark:text-primary-400">
          Total de Horas
        </div>
      </div>
      <div class="bg-warning-50 dark:bg-warning-900/20 rounded-lg p-4 text-center">
        <div class="text-2xl font-bold text-warning-600 dark:text-warning-400">
          {{ raffleStats.totalTickets }}
        </div>
        <div class="text-sm text-warning-500 dark:text-warning-400">
          Bilhetes Gerados
        </div>
      </div>
    </div>

    <!-- Filtros e Busca -->
    <div class="flex items-center gap-4 mb-6">
      <TairoInput
        v-model="searchQuery"
        icon="lucide:search"
        rounded="lg"
        placeholder="Buscar por nome ou documento..."
        class="flex-1"
      />
      
      <BaseSelect
        v-model="currentFilter"
        rounded="lg"
        placeholder="Filtrar clientes"
        class="w-48"
      >
        <BaseSelectItem
          v-for="option in filterOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </BaseSelectItem>
      </BaseSelect>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <div class="flex items-center gap-2 text-muted-500">
        <Icon name="lucide:loader-2" class="size-4 animate-spin" />
        <span>Carregando clientes...</span>
      </div>
    </div>

    <!-- Lista de Clientes -->
    <div v-else-if="filteredClients.length > 0" class="space-y-3">
      <div
        v-for="client in filteredClients"
        :key="client.id"
        class="border border-muted-200 dark:border-muted-700 rounded-lg p-4 hover:bg-muted-50 dark:hover:bg-muted-800 transition-colors"
      >
        <div class="flex items-center justify-between">
          <!-- Informações do Cliente -->
          <div class="flex items-center gap-4">
            <div class="bg-primary-100 dark:bg-primary-900/20 rounded-full p-2">
              <Icon name="lucide:user" class="size-5 text-primary-500" />
            </div>
            
            <div>
              <BaseHeading
                as="h3"
                size="sm"
                weight="medium"
                class="text-muted-900 dark:text-muted-100"
              >
                {{ client.name }}
              </BaseHeading>
              <BaseParagraph size="xs" class="text-muted-500 dark:text-muted-400">
                {{ client.document || 'Sem documento' }}
              </BaseParagraph>
            </div>
          </div>

          <!-- Status e Tempo -->
          <div class="flex items-center gap-4">
            <!-- Status -->
            <span
              class="bg-muted-100 dark:bg-muted-600/10 text-muted-500 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-sans text-xs"
            >
              <span
                class="size-2 rounded-full"
                :class="getClientStatus(client).color"
              />
              <span :class="getClientStatus(client).textColor">
                {{ getClientStatus(client).label }}
              </span>
            </span>

            <!-- Tempo Acumulado -->
            <div class="text-right">
              <div class="text-sm font-medium text-muted-900 dark:text-muted-100">
                {{ formatTime(client.timeTracking?.totalHours || 0) }}
              </div>
              <div class="text-xs text-muted-500">
                {{ client.timeTracking?.ticketsEarned || 0 }} bilhetes
              </div>
            </div>

            <!-- Depósito Hoje -->
            <div v-if="client.hasDepositsToday" class="text-right">
              <div class="text-sm font-medium text-success-600 dark:text-success-400">
                {{ formatCurrency(client.todayDeposits) }}
              </div>
              <div class="text-xs text-success-500">
                Depositou hoje
              </div>
            </div>
          </div>

          <!-- Ações -->
          <div class="flex items-center gap-2">
            <!-- Iniciar/Pausar/Retomar -->
            <BaseButton
              v-if="!client.timeTracking?.isActive && !client.timeTracking?.totalHours"
              @click="startTimeTracking(client)"
              variant="primary"
              size="sm"
              rounded="lg"
            >
              <Icon name="lucide:play" class="size-3" />
              <span>Iniciar</span>
            </BaseButton>

            <BaseButton
              v-else-if="client.timeTracking?.isActive"
              @click="pauseTimeTracking(client)"
              variant="warning"
              size="sm"
              rounded="lg"
            >
              <Icon name="lucide:pause" class="size-3" />
              <span>Pausar</span>
            </BaseButton>

            <BaseButton
              v-else-if="client.timeTracking?.totalHours > 0"
              @click="resumeTimeTracking(client)"
              variant="success"
              size="sm"
              rounded="lg"
            >
              <Icon name="lucide:play" class="size-3" />
              <span>Retomar</span>
            </BaseButton>

            <!-- Detalhes -->
            <BaseButton
              @click="startTimeTracking(client)"
              variant="muted"
              size="sm"
              rounded="lg"
            >
              <Icon name="lucide:eye" class="size-3" />
              <span>Detalhes</span>
            </BaseButton>
          </div>
        </div>

        <!-- Sessão Ativa -->
        <div v-if="client.timeTracking?.isActive" class="mt-3 pt-3 border-t border-muted-200 dark:border-muted-700">
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-sm text-muted-600 dark:text-muted-400">
              <Icon name="lucide:clock" class="size-4" />
              <span>Sessão iniciada em {{ formatDate(client.timeTracking.sessionStart) }}</span>
            </div>
            
            <!-- Informações de Auditoria -->
            <div v-if="client.timeTracking.startedBy" class="flex items-center gap-2 text-xs text-muted-500 dark:text-muted-500">
              <Icon name="lucide:user-check" class="size-3 text-success-500" />
              <span>Iniciado por: <span class="font-medium text-success-600 dark:text-success-400">{{ client.timeTracking.startedBy.name }}</span></span>
            </div>
          </div>
        </div>
        
        <!-- Sessão Pausada -->
        <div v-else-if="client.timeTracking?.totalHours > 0" class="mt-3 pt-3 border-t border-muted-200 dark:border-muted-700">
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-sm text-muted-600 dark:text-muted-400">
              <Icon name="lucide:pause-circle" class="size-4" />
              <span>Sessão pausada</span>
            </div>
            
            <!-- Informações de Auditoria -->
            <div v-if="client.timeTracking.pausedBy" class="flex items-center gap-2 text-xs text-muted-500 dark:text-muted-500">
              <Icon name="lucide:user-x" class="size-3 text-warning-500" />
              <span>Pausado por: <span class="font-medium text-warning-600 dark:text-warning-400">{{ client.timeTracking.pausedBy.name }}</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <Icon name="lucide:users" class="size-12 text-muted-400 mx-auto mb-4" />
      <BaseHeading
        as="h3"
        size="lg"
        weight="medium"
        class="text-muted-500 dark:text-muted-400 mb-2"
      >
        Nenhum cliente encontrado
      </BaseHeading>
      <BaseParagraph size="sm" class="text-muted-400 mb-6">
        {{ searchQuery || currentFilter !== 'all' ? 'Tente ajustar os filtros ou' : 'Não há clientes cadastrados' }}
      </BaseParagraph>
    </div>

    <!-- Sem Sorteios Ativos -->
    <div v-if="activeRaffles.length === 0 && !loading" class="text-center py-12">
      <Icon name="lucide:gift" class="size-12 text-muted-400 mx-auto mb-4" />
      <BaseHeading
        as="h3"
        size="lg"
        weight="medium"
        class="text-muted-500 dark:text-muted-400 mb-2"
      >
        Nenhum sorteio ativo
      </BaseHeading>
      <BaseParagraph size="sm" class="text-muted-400">
        Não há sorteios ativos no momento. Aguarde um administrador ativar um sorteio.
      </BaseParagraph>
    </div>
  </div>
</template>
