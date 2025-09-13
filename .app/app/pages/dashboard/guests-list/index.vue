<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Controle de Convidados',
  preview: {
    title: 'Controle de Convidados',
    description: 'For item grids and collections',
    categories: ['layouts'],
    src: '/img/screens/layouts-card-grid-4.png',
    srcDark: '/img/screens/layouts-card-grid-4-dark.png',
    order: 60,
  },
})

// Tipagem para os dados da API
interface DayGuestList {
  id: string
  date: string
  createdAt: string
  updatedAt: string
  guestsCount: number
}

interface ApiResponse {
  success: boolean
  message: string
  data: DayGuestList[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

const monthActual = ref(new Date().getMonth() + 1)
const yearActual = ref(new Date().getFullYear())

const numberToMonth = (month: number) => {
  const MONTH_NAMES = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]
  return MONTH_NAMES[month - 1]
}

const route = useRoute()
const router = useRouter()
const page = computed({
  get: () => Number.parseInt((route.query.page as string) ?? '1', 10),
  set: (value) => {
    router.push({
      query: {
        ...route.query,
        page: value,
      },
    })
  },
})

const filter = ref('')
const perPage = ref(12)
const pending = ref(false)
const data = ref<ApiResponse | null>(null)

// Computed para o filtro de mês no formato YYYY-MM
const monthFilter = computed(() => {
  return `${yearActual.value}-${monthActual.value.toString().padStart(2, '0')}`
})

// Função para buscar os dias da API
const fetchDays = async () => {
  if (pending.value) return
  
  pending.value = true
  
  try {
    const queryParams = new URLSearchParams({
      page: page.value.toString(),
      limit: perPage.value.toString(),
      month: monthFilter.value,
    })

    const response = await useCustomFetch<ApiResponse>(`/guests/days?${queryParams}`, {
      method: 'GET',
    })
    
    if (response.data.success) {
      data.value = response.data
    } else {
      throw new Error(response.data.message || 'Erro ao carregar dias')
    }
  } catch (error: any) {
    console.error('Erro ao buscar dias:', error)
    toaster.add({
      title: 'Erro',
      description: error.message || 'Erro ao carregar lista de dias',
      icon: 'lucide:alert-triangle',
      duration: 3000,
    })
    data.value = { success: false, message: '', data: [], total: 0, page: 1, limit: 12, totalPages: 0 }
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

// Função para verificar se é hoje
const isToday = (dateString: string) => {
  const date = new Date(dateString)
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

// Watchers para recarregar dados
watch([page, perPage, monthActual, yearActual], () => {
  fetchDays()
})

watch([filter], () => {
  // Reset página quando filtrar
  router.push({
    query: {
      page: undefined,
    },
  })
})

// Carregar dados iniciais
onMounted(() => {
  fetchDays()
})
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20 dark:[--color-input-default-bg:var(--color-muted-950)]">
    <TairoContentWrapper>
      <template #left>
        <div class="flex items-center gap-4">
          <TairoInput
            v-model="filter"
            icon="lucide:search"
            rounded="lg"
            placeholder="Filtrar por dia..."
          />
          
          <!-- Loading indicator -->
          <div v-if="pending" class="flex items-center gap-2 text-muted-500">
            <Icon name="lucide:loader-2" class="size-4 animate-spin" />
            <span class="text-sm">Carregando...</span>
          </div>
        </div>
      </template>
      <template #right>
        <div class="flex items-center gap-3">
          <!-- Seletor de Ano -->
          <BaseDropdown variant="muted" :label="yearActual.toString()">
            <BaseDropdownItem 
              v-for="year in [2024, 2025, 2026]" 
              :key="year" 
              :value="year" 
              @click="yearActual = year"
            >
              {{ year }}
            </BaseDropdownItem>
          </BaseDropdown>
          
          <!-- Seletor de Mês -->
          <BaseDropdown variant="default" :label="monthActual ? `${numberToMonth(monthActual)}` : 'Selecione o mês'">
            <BaseDropdownItem v-for="month in 12" :key="month" :value="month" @click="monthActual = month">
              {{ numberToMonth(month) }}
            </BaseDropdownItem>
          </BaseDropdown>
        </div>
      </template>
      <div>
        <!-- Loading State -->
        <div v-if="pending" class="grid w-full gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <BaseCard v-for="i in 8" :key="i" rounded="lg" class="p-3 flex flex-col animate-pulse">
            <div class="h-40 w-full rounded-lg bg-muted-200 dark:bg-muted-700"></div>
            <div class="flex flex-col grow mt-3 space-y-2">
              <div class="h-4 bg-muted-200 dark:bg-muted-700 rounded w-3/4"></div>
              <div class="h-3 bg-muted-200 dark:bg-muted-700 rounded w-1/2"></div>
              <div class="mt-auto flex items-center gap-2 pt-4">
                <div class="size-6 bg-muted-200 dark:bg-muted-700 rounded-full"></div>
                <div class="flex-1 space-y-1">
                  <div class="h-3 bg-muted-200 dark:bg-muted-700 rounded w-12"></div>
                  <div class="h-2 bg-muted-200 dark:bg-muted-700 rounded w-8"></div>
                </div>
                <div class="h-8 w-20 bg-muted-200 dark:bg-muted-700 rounded"></div>
              </div>
            </div>
          </BaseCard>
        </div>

        <!-- Empty State -->
        <div v-else-if="!pending && (!data || data.data.length === 0)">
          <BasePlaceholderPage
            title="Nenhum dia encontrado"
            subtitle="Não foram encontrados dias para o período selecionado."
          >
            <template #image>
              <img
                class="block dark:hidden"
                src="/img/illustrations/placeholders/flat/placeholder-search-6.svg"
                alt="Placeholder image"
              >
              <img
                class="hidden dark:block"
                src="/img/illustrations/placeholders/flat/placeholder-search-6-dark.svg"
                alt="Placeholder image"
              >
            </template>
            <template #action>
              <BaseButton @click="fetchDays" variant="primary" size="sm">
                <Icon name="lucide:refresh-cw" class="size-4 me-2" />
                Recarregar
              </BaseButton>
            </template>
          </BasePlaceholderPage>
        </div>

        <!-- Content -->
        <div v-else>
          <div class="grid w-full gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <TransitionGroup
              enter-active-class="transform-gpu"
              enter-from-class="opacity-0 -translate-x-full"
              enter-to-class="opacity-100 translate-x-0"
              leave-active-class="absolute transform-gpu"
              leave-from-class="opacity-100 translate-x-0"
              leave-to-class="opacity-0 -translate-x-full"
            >
              <BaseCard
                v-for="day in data?.data"
                :key="day.id"
                rounded="lg"
                class="group p-3 flex flex-col hover:shadow-lg transition-all duration-200"
              >
                <div class="relative">
                  <img
                    src="https://img.cdndsgni.com/preview/10160308-m.jpg"
                    class="h-40 w-full rounded-lg object-cover"
                    alt="Lista de convidados"
                  >
                  <BaseTag
                    v-if="isToday(day.date)"
                    rounded="full"
                    variant="primary"
                    size="sm"
                    class="absolute start-3 top-3 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                  >
                    Hoje
                  </BaseTag>
                  <BaseTag
                    v-else
                    rounded="full"
                    variant="muted"
                    size="sm"
                    class="absolute start-3 top-3 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                  >
                    {{ formatDate(day.date) }}
                  </BaseTag>
                </div>
                <div class="flex flex-col grow">
                  <div class="mb-6 mt-3">
                    <BaseHeading
                      tag="h3"
                      size="md"
                      weight="medium"
                      lead="snug"
                      class="line-clamp-2 text-gray-800 dark:text-gray-100"
                    >
                      Lista de {{ isToday(day.date) ? 'hoje' : formatDate(day.date) }}
                    </BaseHeading>
                    <BaseParagraph size="xs" class="text-muted-500 mt-1">
                      Criado em {{ formatDate(day.createdAt) }}
                    </BaseParagraph>
                  </div>

                  <div class="mt-auto flex items-center gap-2">
                    <BaseAvatar
                      src="https://img.lovepik.com/png/20231107/Cartoon-character-hand-made-bald-little-boy-little-boys-kid_520278_wh1200.png"
                      :text="day.guestsCount.toString()"
                      size="xs"
                      class="bg-primary-500/20 text-primary-600 dark:text-primary-400"
                    />
                    <div class="leading-none">
                      <h4 class="text-muted-800 dark:text-muted-100 font-sans text-sm font-medium leading-tight">
                        {{ day.guestsCount }}
                      </h4>
                      <p class="text-muted-600 dark:text-muted-400 font-sans text-xs">
                        {{ day.guestsCount === 1 ? 'Convidado' : 'Convidados' }}
                      </p>
                    </div>
                    <div class="ms-auto">
                      <BaseButton 
                        :to="`/dashboard/guests-list/details/${day.id}`" 
                        rounded="md" 
                        size="sm"
                        variant="primary"
                      >
                        <Icon name="lucide:eye" />
                        <span>Visualizar</span>
                      </BaseButton>
                    </div>
                  </div>
                </div>
              </BaseCard>
            </TransitionGroup>
          </div>
          
          <!-- Pagination -->
          <div v-if="data && data.total > 0" class="mt-6">
            <BasePagination
              v-model:page="page"
              :total="data.total"
              :items-per-page="perPage"
              rounded="lg"
              class="w-full"
            />
            
            <!-- Stats -->
            <div class="mt-4 text-center">
              <BaseParagraph size="sm" class="text-muted-500">
                Mostrando {{ data.data.length }} de {{ data.total }} dias • 
                Página {{ data.page }} de {{ data.totalPages }}
              </BaseParagraph>
            </div>
          </div>
        </div>
      </div>
    </TairoContentWrapper>
  </div>
</template>
