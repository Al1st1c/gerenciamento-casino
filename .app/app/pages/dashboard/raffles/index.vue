<script setup lang="ts">
import PanelCreateRaffle from '~/components/panels/raffles/PanelCreateRaffle.vue'
import PanelRaffleDetails from '~/components/panels/raffles/PanelRaffleDetails.vue'
import PanelRealizeRaffle from '~/components/panels/raffles/PanelRealizeRaffle.vue'
import PanelRaffleWinners from '~/components/panels/raffles/PanelRaffleWinners.vue'
import { useApi } from '~/composables/useAuth'

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

definePageMeta({
  title: 'Sorteios',
  preview: {
    title: 'Gerenciamento de Sorteios',
    description: 'Crie e gerencie sorteios do casino',
    categories: ['layouts', 'lists'],
    src: '/img/screens/layouts-cards.png',
    srcDark: '/img/screens/layouts-cards-dark.png',
    order: 14,
    new: true,
  },
})

const route = useRoute()
const router = useRouter()
const page = computed(() => Number.parseInt((route.query.page as string) ?? '1', 10))

const filter = ref('')
const statusFilter = ref('all')
const perPage = ref(45)
const { open } = usePanels()

watch([filter, perPage, statusFilter], () => {
  router.push({
    query: {
      page: undefined,
    },
  })
})

const raffles = ref<any[]>([])
const loading = ref(false)

// Opções de filtro por status
const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'PAUSED', label: 'Pausado' },
  { value: 'DRAWING', label: 'Executando' },
  { value: 'FINISHED', label: 'Finalizado' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

function openRafflePanel(id: string, raffleData: any) {
  const selectedRaffle = raffleData.find((raffle: any) => raffle.id === id)
  if (selectedRaffle) {
    open(PanelRaffleDetails, { raffle: selectedRaffle })
  }
}

function openCreatePanel() {
  open(PanelCreateRaffle, {
    onSuccess: async () => {
      await refreshRaffles()
    }
  })
}

function openRealizeRafflePanel(raffle: any) {
  open(PanelRealizeRaffle, { 
    raffle,
    onSuccess: async () => {
      await refreshRaffles()
    }
  })
}

function openWinnersPanel(raffle: any) {
  open(PanelRaffleWinners, { raffle })
}

function openAnimation(raffleId: string) {
  // Abrir em nova aba para fullscreen
  window.open(`/raffle-animation/${raffleId}`, '_blank')
}

async function getRaffles() {
  try {
    loading.value = true
    const { data } = await useCustomFetch<any>('/raffles', {
      method: 'GET',
    })
    return data
  } catch (error) {
    console.error(error)
    toaster.add({
      title: 'Oops!',
      description: 'Erro na busca de sorteios, tente novamente e contate o suporte.',
      icon: 'lucide:alert-triangle',
      progress: true,
    })
    return []
  } finally {
    loading.value = false
  }
}

async function refreshRaffles() {
  try {
    const data = await getRaffles()
    raffles.value = data
    toaster.add({
      title: 'Atualizado',
      description: 'Lista de sorteios recarregada com sucesso!',
      icon: 'ph:check-circle-fill',
      progress: true,
    })
  } catch (error) {
    console.error('Erro ao recarregar sorteios:', error)
  }
}

async function updateRaffleStatus(raffleId: string, status: string) {
  try {
    const { data } = await useCustomFetch<any>(`/raffles/${raffleId}`, {
      method: 'PUT',
      body: { status }
    })

    toaster.add({
      title: 'Sucesso',
      description: `Status do sorteio atualizado para ${status.toLowerCase()}`,
      icon: 'ph:check-circle-fill',
      progress: true,
    })

    await refreshRaffles()
  } catch (error: any) {
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao atualizar status do sorteio',
      icon: 'ph:warning-circle-fill',
      progress: true,
    })
  }
}

// async function deleteRaffle(raffleId: string) {
//   try {
//     await useCustomFetch<any>(`/raffles/${raffleId}`, {
//       method: 'DELETE'
//     })

//     toaster.add({
//       title: 'Sucesso',
//       description: 'Sorteio excluído com sucesso!',
//       icon: 'ph:check-circle-fill',
//       progress: true,
//     })

//     await refreshRaffles()
//   } catch (error: any) {
//     toaster.add({
//       title: 'Erro',
//       description: error.message || 'Erro ao excluir sorteio',
//       icon: 'ph:warning-circle-fill',
//       progress: true,
//     })
//   }
// }

function getStatusColor(status: string) {
  const colors = {
    PENDING: 'bg-muted-300 dark:bg-muted-700',
    ACTIVE: 'bg-success-500',
    PAUSED: 'bg-warning-500',
    DRAWING: 'bg-primary-500',
    FINISHED: 'bg-info-500',
    CANCELLED: 'bg-destructive-500',
  }
  return colors[status as keyof typeof colors] || 'bg-muted-300 dark:bg-muted-700'
}

function getStatusLabel(status: string) {
  const labels = {
    PENDING: 'Pendente',
    ACTIVE: 'Ativo',
    PAUSED: 'Pausado',
    DRAWING: 'Executando',
    FINISHED: 'Finalizado',
    CANCELLED: 'Cancelado',
  }
  return labels[status as keyof typeof labels] || status
}

function formatDate(date: string) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function canRealizeRaffle(raffle: any) {
  // Pode realizar sorteio se:
  // 1. Está ativo E tem bilhetes OU
  // 2. Está finalizado mas ainda tem prêmios não sorteados
  const hasEntries = raffle.entries?.length > 0
  const hasUnsortedPrizes = raffle.prizes?.some((prize: any) => 
    !raffle.winners?.some((winner: any) => winner.prizeId === prize.id)
  )
  
  return (raffle.status === 'ACTIVE' && hasEntries) || 
         (raffle.status === 'FINISHED' && hasEntries && hasUnsortedPrizes)
}

function canEdit(raffle: any) {
  return ['PENDING', 'ACTIVE', 'PAUSED'].includes(raffle.status)
}

function canDelete(raffle: any) {
  return ['PENDING', 'ACTIVE', 'PAUSED'].includes(raffle.status)
}

// Filtrar sorteios baseado no filtro de status
const filteredRaffles = computed(() => {
  if (statusFilter.value === 'all') return raffles.value
  return raffles.value.filter((raffle: any) => raffle.status === statusFilter.value)
})

onMounted(async () => {
  const data = await getRaffles()
  raffles.value = data
})
</script>

<template>
  <div class="w-full px-4 md:px-6 lg:px-8 pb-20 dark:[--color-input-default-bg:var(--color-muted-950)]">
    <!-- Header -->
    <div class="flex items-center justify-between py-6">
      <div class="flex items-center gap-4">
        <TairoInput
          v-model="filter"
          icon="lucide:search"
          rounded="lg"
          placeholder="Procurar por nome..."
          class="w-80"
        />
        <BaseSelect
          v-model="statusFilter"
          rounded="lg"
          placeholder="Filtrar por status"
          class="w-48"
        >
          <BaseSelectItem
            v-for="option in statusOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </BaseSelectItem>
        </BaseSelect>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-muted-400 font-sans text-sm">
          {{ filteredRaffles.length }} sorteios encontrados
        </span>
        <BaseButton
          @click="refreshRaffles"
          variant="muted"
          size="sm"
          rounded="lg"
          :loading="loading"
        >
          <Icon name="lucide:refresh-cw" class="size-4" />
        </BaseButton>
      </div>
    </div>

    <div class="w-full">
      <!-- Actions -->
      <div class="flex w-full items-center gap-5">
        <div class="ms-auto">
          <BaseButton
            @click="openCreatePanel()"
            rounded="md"
            variant="default"
            size="sm"
          >
            <Icon name="lucide:plus" class="size-4" />
            <span>Criar Sorteio</span>
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="mt-8 flex justify-center">
      <div class="flex items-center gap-2 text-muted-500">
        <Icon name="lucide:loader-2" class="size-4 animate-spin" />
        <span>Carregando sorteios...</span>
      </div>
    </div>

    <!-- Raffles Table -->
    <div v-else class="mt-7 overflow-x-auto">
      <table class="w-full whitespace-nowrap">
        <thead>
          <tr>
            <th class="text-muted-400 dark:text-muted-300 px-4 pb-3 text-start font-sans text-xs font-semibold">
              <span>Nome</span>
            </th>
            <th class="text-muted-400 dark:text-muted-300 px-4 pb-3 text-start font-sans text-xs font-semibold">
              <span>Status</span>
            </th>
            <th class="text-muted-400 dark:text-muted-300 px-4 pb-3 text-start font-sans text-xs font-semibold">
              <span>Participantes</span>
            </th>
            <th class="text-muted-400 dark:text-muted-300 px-4 pb-3 text-start font-sans text-xs font-semibold">
              <span>Bilhetes</span>
            </th>
            <th class="text-muted-400 dark:text-muted-300 px-4 pb-3 text-start font-sans text-xs font-semibold">
              <span>Prêmios</span>
            </th>
            <th class="text-muted-400 dark:text-muted-300 px-4 pb-3 text-start font-sans text-xs font-semibold">
              <span>Criado em</span>
            </th>
            <th class="text-muted-400 dark:text-muted-300 px-4 pb-3 text-start font-sans text-xs font-semibold">
              <span>Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="raffle in filteredRaffles"
            :key="raffle.id"
            tabindex="0"
            class="hover:bg-muted-200 dark:hover:bg-muted-800 cursor-pointer transition-colors duration-200 ease-in-out"
            @click="openRafflePanel(raffle.id, filteredRaffles)"
          >
            <td class="p-4">
              <div class="flex flex-col">
                <span class="text-muted-500 dark:text-muted-300 font-sans text-sm font-medium leading-none">
                  {{ raffle.name }}
                </span>
                <span v-if="raffle.description" class="text-muted-400 font-sans text-xs mt-1">
                  {{ raffle.description }}
                </span>
              </div>
            </td>
            <td class="p-4">
              <span
                class="bg-muted-100 dark:bg-muted-600/10 text-muted-500 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-sans text-xs"
              >
                <span
                  class="size-2 rounded-full"
                  :class="getStatusColor(raffle.status)"
                />
                <span>{{ getStatusLabel(raffle.status) }}</span>
              </span>
            </td>
            <td class="p-4">
              <BaseText
                weight="medium"
                lead="none"
                size="sm"
                class="text-muted-400"
              >
                {{ raffle.timeTracking?.length || 0 }}
              </BaseText>
            </td>
            <td class="p-4">
              <BaseText
                weight="medium"
                lead="none"
                size="sm"
                class="text-muted-400"
              >
                {{ raffle.entries?.length || 0 }}
              </BaseText>
            </td>
            <td class="p-4">
              <BaseText
                weight="medium"
                lead="none"
                size="sm"
                class="text-muted-400"
              >
                {{ raffle.prizes?.length || 0 }}
              </BaseText>
            </td>
            <td class="p-4">
              <BaseText
                weight="medium"
                lead="none"
                size="sm"
                class="text-muted-400"
              >
                {{ formatDate(raffle.createdAt) }}
              </BaseText>
            </td>
            <td class="p-4">
              <div class="flex items-center gap-2">
                <!-- Realizar Sorteio -->
                <BaseButton
                  v-if="canRealizeRaffle(raffle)"
                  @click.stop="openRealizeRafflePanel(raffle)"
                  variant="primary"
                  size="sm"
                  rounded="lg"
                >
                  <Icon name="lucide:dice-6" class="size-3" />
                  <span>Realizar Sorteio</span>
                </BaseButton>

                <!-- Animação do Sorteio -->
                <BaseButton
                  v-if="raffle.entries?.length > 0"
                  @click.stop="openAnimation(raffle.id)"
                  variant="default"
                  size="sm"
                  rounded="lg"
                >
                  <Icon name="lucide:tv" class="size-3" />
                  <span>Animação</span>
                </BaseButton>

                <!-- Ver Ganhadores -->
                <BaseButton
                  v-if="raffle.status === 'FINISHED'"
                  @click.stop="openWinnersPanel(raffle)"
                  variant="default"
                  size="sm"
                  rounded="lg"
                >
                  <Icon name="lucide:trophy" class="size-3" />
                  <span>Ganhadores</span>
                </BaseButton>

                <!-- Ativar/Pausar -->
                <BaseButton
                  v-if="raffle.status === 'PENDING'"
                  @click.stop="updateRaffleStatus(raffle.id, 'ACTIVE')"
                  variant="default"
                  size="sm"
                  rounded="lg"
                >
                  <Icon name="lucide:play" class="size-3" />
                  <span>Ativar</span>
                </BaseButton>

                <BaseButton
                  v-if="raffle.status === 'ACTIVE'"
                  @click.stop="updateRaffleStatus(raffle.id, 'PAUSED')"
                  variant="default"
                  size="sm"
                  rounded="lg"
                >
                  <Icon name="lucide:pause" class="size-3" />
                  <span>Pausar</span>
                </BaseButton>

                <BaseButton
                  v-if="raffle.status === 'PAUSED'"
                  @click.stop="updateRaffleStatus(raffle.id, 'ACTIVE')"
                  variant="default"
                  size="sm"
                  rounded="lg"
                >
                  <Icon name="lucide:play" class="size-3" />
                  <span>Retomar</span>
                </BaseButton>

                <!-- Cancelar -->
                <BaseButton
                  v-if="canDelete(raffle)"
                  @click.stop="updateRaffleStatus(raffle.id, 'CANCELLED')"
                  variant="destructive"
                  size="sm"
                  rounded="lg"
                >
                  <Icon name="lucide:x" class="size-3" />
                  <span>Cancelar</span>
                </BaseButton>

                <!-- Excluir -->
                <!-- <BaseButton
                  v-if="canDelete(raffle)"
                  @click.stop="deleteRaffle(raffle.id)"
                  variant="destructive"
                  size="sm"
                  rounded="lg"
                >
                  <Icon name="lucide:trash-2" class="size-3" />
                  <span>Excluir</span>
                </BaseButton> -->
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="filteredRaffles.length === 0" class="text-center py-12">
        <Icon name="lucide:gift" class="size-12 text-muted-400 mx-auto mb-4" />
        <BaseHeading
          as="h3"
          size="lg"
          weight="medium"
          class="text-muted-500 dark:text-muted-400 mb-2"
        >
          Nenhum sorteio encontrado
        </BaseHeading>
        <BaseParagraph size="sm" class="text-muted-400 mb-6">
          {{ filter || statusFilter !== 'all' ? 'Tente ajustar os filtros ou' : 'Crie seu primeiro sorteio para começar' }}
        </BaseParagraph>
        <BaseButton
          v-if="!filter && statusFilter === 'all'"
          @click="openCreatePanel()"
          variant="primary"
          rounded="lg"
        >
          <Icon name="lucide:plus" class="size-4" />
          <span>Criar Primeiro Sorteio</span>
        </BaseButton>
      </div>
    </div>
  </div>
</template>
