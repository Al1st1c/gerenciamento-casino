<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Detalhes da Lista de Convidados',
  preview: {
    title: 'Detalhes da Lista de Convidados',
    description: 'For viewing guest details',
    categories: ['layouts'],
    src: '/img/screens/layouts-card-grid-4.png',
    srcDark: '/img/screens/layouts-card-grid-4-dark.png',
    order: 60,
  },
})

// Tipagem para os dados da API
interface Guest {
  id: string
  name: string
  document: string
  dateArrival: string
  observations?: string
  createdAt: string
  invitedBy: {
    id: string
    name: string
    email?: string
  }
}

interface DayDetails {
  id: string
  date: string
  createdAt: string
  updatedAt: string
  guestsCount: number
  guests: Guest[]
}

interface ApiResponse {
  success: boolean
  message: string
  data: DayDetails
}

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()
const route = useRoute()
const router = useRouter()

const dayId = route.params.id as string

const pending = ref(false)
const dayDetails = ref<DayDetails | null>(null)
const filter = ref('')
const showObservation = ref(false)
const selectedObservation = ref('')

// Computed para filtrar convidados
const filteredGuests = computed(() => {
  if (!dayDetails.value?.guests) return []
  
  if (!filter.value.trim()) {
    return dayDetails.value.guests
  }
  
  const searchTerm = filter.value.toLowerCase()
  return dayDetails.value.guests.filter(guest => 
    guest.name.toLowerCase().includes(searchTerm) ||
    guest.document.includes(searchTerm) ||
    guest?.invitedBy?.name?.toLowerCase().includes(searchTerm)
  )
})

// Função para buscar detalhes do dia
const fetchDayDetails = async () => {
  if (pending.value) return
  
  pending.value = true
  
  try {
    const response = await useCustomFetch<ApiResponse>(`/guests/days/${dayId}`, {
      method: 'GET',
    })
    
    if (response.data.success) {
      dayDetails.value = response.data.data
    } else {
      throw new Error(response.data.message || 'Erro ao carregar detalhes do dia')
    }
  } catch (error: any) {
    console.error('Erro ao buscar detalhes do dia:', error)
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao carregar detalhes da lista',
      icon: 'lucide:alert-triangle',
      duration: 3000,
    })
    
    // Redirecionar de volta se não encontrar
    if (error.message?.includes('não encontrado')) {
      router.push('/dashboard/guests-list')
    }
  } finally {
    pending.value = false
  }
}

// Função para formatar data
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Função para formatar data e hora
const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Função para formatar CPF
const formatCPF = (cpf: string) => {
  if(!cpf) return ''
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

// Função para mostrar observação
const showObservationModal = (observation: string) => {
  selectedObservation.value = observation
  showObservation.value = true
}

// Função para recarregar dados após adicionar convidado
const reloadData = () => {
  fetchDayDetails()
}

const { open, close } = usePanels()
import { PanelsPanelAddGuestAdmin } from '#components'

function addSequencePanel() {
  if (!dayDetails.value) return
  
  open(PanelsPanelAddGuestAdmin, {
    action: 'create',
    data: { 
      dayId: dayDetails.value.id,
      date: dayDetails.value.date 
    },
    onSave(info: any) {
      close()
      console.log('Convidado adicionado:', info)
      reloadData()
     
    },
  })
}

// Carregar dados iniciais
onMounted(() => {
  fetchDayDetails()
})

</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20 dark:[--color-input-default-bg:var(--color-muted-950)]">
    <TairoContentWrapper>
      <template #left>
        <div class="flex items-center gap-4">
          <!-- Breadcrumb -->
          <nav class="flex items-center gap-2 text-sm">
            <NuxtLink 
              to="/dashboard/guests-list" 
              class="text-muted-500 hover:text-primary-600 transition-colors"
            >
              Lista de Convidados
            </NuxtLink>
            <Icon name="lucide:chevron-right" class="size-4 text-muted-400" />
            <span class="text-muted-800 dark:text-muted-200 font-medium">
              {{ dayDetails ? formatDate(dayDetails.date) : 'Carregando...' }}
            </span>
          </nav>
        </div>
      </template>
      <template #right>
        <div class="flex items-center gap-3">
          <TairoInput
            v-model="filter"
            icon="lucide:search"
            rounded="lg"
            placeholder="Filtrar por nome, CPF..."
            class="w-64"
          />
          <BaseButton 
            variant="primary" 
            size="sm" 
            @click="addSequencePanel"
            :disabled="!dayDetails"
          >
            <Icon name="lucide:plus" />
            <span>Adicionar Convidado</span>
          </BaseButton>
        </div>
      </template>

      <!-- Header do Dia -->
      <div v-if="dayDetails" class="mb-6 bg-white dark:bg-muted-800 rounded-lg p-6 border border-muted-200 dark:border-muted-700">
        <div class="flex items-center justify-between">
          <div>
            <BaseHeading as="h1" size="xl" weight="semibold" class="text-muted-900 dark:text-white mb-2">
              Lista de Convidados - {{ formatDate(dayDetails.date) }}
            </BaseHeading>
            <div class="flex items-center gap-4 text-sm text-muted-600 dark:text-muted-400">
              <span>{{ dayDetails.guestsCount }} {{ dayDetails.guestsCount === 1 ? 'convidado' : 'convidados' }}</span>
              <span>•</span>
              <span>Criado em {{ formatDateTime(dayDetails.createdAt) }}</span>
            </div>
          </div>
          <div class="text-right">
            <div class="flex items-center gap-2 mb-2">
              <BaseTag variant="primary" size="sm">
                {{ dayDetails.guestsCount }}
              </BaseTag>
              <span class="text-sm text-muted-600 dark:text-muted-400">
                {{ dayDetails.guestsCount === 1 ? 'Convidado' : 'Convidados' }}
              </span>
            </div>
            <BaseButton variant="muted" size="sm" @click="fetchDayDetails" :loading="pending">
              <Icon name="lucide:refresh-cw" class="size-4" />
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="pending && !dayDetails" class="space-y-4">
        <div class="animate-pulse bg-muted-200 dark:bg-muted-700 h-32 rounded-lg"></div>
        <div class="animate-pulse bg-muted-200 dark:bg-muted-700 h-96 rounded-lg"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!pending && !dayDetails" class="text-center py-12">
        <BasePlaceholderPage
          title="Dia não encontrado"
          subtitle="O dia solicitado não foi encontrado ou não existe."
        >
          <template #action>
            <BaseButton @click="router.push('/dashboard/guests-list')" variant="primary">
              <Icon name="lucide:arrow-left" class="size-4 me-2" />
              Voltar à Lista
            </BaseButton>
          </template>
        </BasePlaceholderPage>
      </div>

      <!-- Content -->
      <div v-else-if="dayDetails">
        <!-- Empty Guests State -->
        <div v-if="dayDetails.guests.length === 0" class="text-center py-12">
          <BasePlaceholderPage
            title="Nenhum convidado cadastrado"
            subtitle="Ainda não há convidados cadastrados para este dia."
          >
            <template #image>
              <img
                class="block dark:hidden"
                src="/img/illustrations/placeholders/flat/placeholder-search-6.svg"
                alt="Sem convidados"
              >
              <img
                class="hidden dark:block"
                src="/img/illustrations/placeholders/flat/placeholder-search-6-dark.svg"
                alt="Sem convidados"
              >
            </template>
            <template #action>
              <BaseButton @click="addSequencePanel" variant="primary">
                <Icon name="lucide:user-plus" class="size-4 me-2" />
                Adicionar Primeiro Convidado
              </BaseButton>
            </template>
          </BasePlaceholderPage>
        </div>

        <!-- Guests Table -->
        <div v-else-if="filteredGuests.length > 0">
          <TairoFlexTable>
            <template #header>
              <TairoFlexTableHeading type="stable">
                Nome do Convidado
              </TairoFlexTableHeading>
              <TairoFlexTableHeading type="stable">
                Documento
              </TairoFlexTableHeading>
              <TairoFlexTableHeading type="stable">
                Convidado por
              </TairoFlexTableHeading>
              <TairoFlexTableHeading type="stable">
                Data de Chegada
              </TairoFlexTableHeading>
              <TairoFlexTableHeading type="stable">
                Observação
              </TairoFlexTableHeading>
            </template>
            <TairoFlexTableRow
              v-for="guest in filteredGuests"
              :key="guest.id"
              rounded="sm"
            >
              <TairoFlexTableCell type="stable" data-content="Nome do Convidado">
                <div class="flex items-center gap-2">
                  <BaseAvatar 
                    :text="guest.name.charAt(0).toUpperCase()" 
                    size="xs"
                    class="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
                  />
                  <div class="leading-none">
                    <h4 class="font-sans text-sm font-medium leading-tight">
                      {{ guest.name }}
                    </h4>
                  </div>
                </div>
              </TairoFlexTableCell>

              <TairoFlexTableCell type="stable" data-content="Documento" light>
                <span class="font-mono text-sm">{{ guest.document ? formatCPF(guest.document) : '-' }}</span>
              </TairoFlexTableCell>

              <TairoFlexTableCell type="stable" data-content="Convidado por">
                <div class="flex items-center gap-2" v-if="guest?.invitedBy">
                  <BaseAvatar 
                    :text="guest?.invitedBy?.name?.charAt(0).toUpperCase()" 
                    size="xs"
                    class="bg-muted-100 dark:bg-muted-800 text-muted-600 dark:text-muted-400"
                  />
                  <div>
                    <span class="font-medium text-sm">{{ guest?.invitedBy?.name }}</span>
                    <p v-if="guest?.invitedBy?.email" class="text-xs text-muted-500">
                      {{ guest.invitedBy.email }}
                    </p>
                  </div>
                </div>
                <span v-else class="text-muted-400 text-sm">-</span>
              </TairoFlexTableCell>

              <TairoFlexTableCell type="stable" data-content="Data de Chegada">
                <span class="font-medium">{{ guest.dateArrival ? formatDateTime(guest.dateArrival) : '-' }}</span>
              </TairoFlexTableCell>

              <TairoFlexTableCell type="stable" data-content="Observação">
                <BaseButton 
                  v-if="guest.observations && guest.observations.trim()"
                  variant="muted" 
                  size="sm" 
                  @click="showObservationModal(guest.observations)"
                >
                  <Icon name="lucide:eye" />
                </BaseButton>
                <span v-else class="text-muted-400 text-sm">
                  -
                </span>
              </TairoFlexTableCell>
            </TairoFlexTableRow>
          </TairoFlexTable>

          <!-- Results Info -->
          <div class="mt-4 text-center">
            <BaseParagraph size="sm" class="text-muted-500">
              Mostrando {{ filteredGuests.length }} de {{ dayDetails.guests.length }} convidados
              <span v-if="filter.trim()">para "{{ filter }}"</span>
            </BaseParagraph>
          </div>
        </div>

        <!-- Filtered Empty State -->
        <div v-else-if="filter.trim() && filteredGuests.length === 0" class="text-center py-12">
          <BasePlaceholderPage
            title="Nenhum resultado encontrado"
            :subtitle="`Não foram encontrados convidados para '${filter}'`"
          >
            <template #action>
              <BaseButton @click="filter = ''" variant="muted">
                <Icon name="lucide:x" class="size-4 me-2" />
                Limpar Filtro
              </BaseButton>
            </template>
          </BasePlaceholderPage>
        </div>
      </div>

      <!-- Modal de Observação -->
      <DialogRoot v-model:open="showObservation">
        <DialogPortal>
          <DialogOverlay class="bg-muted-800/70 dark:bg-muted-900/80 fixed inset-0 z-50" />
          <DialogContent
            class="p-2 fixed starting:opacity-0 starting:top-[8%] top-[10%] start-[50%] max-h-[85vh] w-[90vw] max-w-[32rem] translate-x-[-50%] text-sm rounded-lg overflow-hidden border border-white dark:border-muted-700 bg-white dark:bg-muted-800 focus:outline-none z-[100] transition-discrete transition-all duration-200 ease-out flex flex-col"
          >
            <div class="flex w-full items-center justify-between p-4 md:p-6">
              <DialogTitle class="font-heading text-muted-900 text-lg font-medium leading-6 dark:text-white">
                Observação
              </DialogTitle>
              <BaseButton class="icon-md" @click="showObservation = false">
                <Icon name="lucide:x" class="size-4" />
              </BaseButton>
            </div>
            <div class="nui-slimscroll overflow-y-auto px-4 pb-4 md:px-6 md:pb-6">
              <div class="grid grid-cols-12 gap-6">
                <div class="col-span-12 flex flex-col gap-4">
                  <DialogDescription>
                    <BaseParagraph size="sm" class="text-muted-600 dark:text-muted-400 whitespace-pre-wrap">
                      {{ selectedObservation }}
                    </BaseParagraph>
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
    </TairoContentWrapper>
  </div>
</template>
