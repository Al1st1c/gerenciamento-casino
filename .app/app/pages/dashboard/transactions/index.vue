<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

const { useCustomFetch } = useApi()

definePageMeta({
  title: 'Transactions',
  preview: {
    title: 'Transactions',
    description: 'For transactions history',
    categories: ['layouts', 'lists'],
    src: '/img/screens/layouts-transactions.png',
    srcDark: '/img/screens/layouts-transactions-dark.png',
    order: 69,
    new: true,
  },
})

// Tipagem para os dados da API
interface TransactionItem {
  id?: string
  date?: string
  issuer?: string
  amount?: number
  type?: 'in' | 'out'
  account?: string
  status?: string
  method?: string
  user?: {
    id: string
    name: string
  }
  transactionType?: string
  referenceId?: string | null
  createdAt?: string
}

interface TransactionResponse {
  data: TransactionItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

interface FilterData {
  dateRange?: string
  dateFrom?: string
  dateTo?: string
  transactionType?: string
  userId?: string
  fundId?: string
  minAmount?: number
  maxAmount?: number
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
const perPage = ref(20)
const pending = ref(false)
const data = ref<TransactionResponse | null>(null)
const filters = ref<FilterData>({})
const exportLoading = ref(false)
const fundName = ref<string>('')

// Inicializar filtros com base nos parâmetros da URL
const initializeFiltersFromQuery = () => {
  const query = route.query
  const initialFilters: FilterData = {}
  
  if (query.fundId && typeof query.fundId === 'string') {
    initialFilters.fundId = query.fundId
  }
  
  if (query.transactionType && typeof query.transactionType === 'string') {
    initialFilters.transactionType = query.transactionType
  }
  
  if (query.dateRange && typeof query.dateRange === 'string') {
    initialFilters.dateRange = query.dateRange
  }
  
  if (query.dateFrom && typeof query.dateFrom === 'string') {
    initialFilters.dateFrom = query.dateFrom
  }
  
  if (query.dateTo && typeof query.dateTo === 'string') {
    initialFilters.dateTo = query.dateTo
  }
  
  if (query.minAmount && typeof query.minAmount === 'string') {
    initialFilters.minAmount = parseFloat(query.minAmount)
  }
  
  if (query.maxAmount && typeof query.maxAmount === 'string') {
    initialFilters.maxAmount = parseFloat(query.maxAmount)
  }
  
  if (Object.keys(initialFilters).length > 0) {
    filters.value = initialFilters
    
    // Se há um fundId, buscar o nome do fundo
    if (initialFilters.fundId) {
      fetchFundName(initialFilters.fundId)
    }
  }
}

// Função para buscar o nome do fundo
const fetchFundName = async (fundId: string) => {
  try {
    const { data } = await useCustomFetch<any>(`/funds/${fundId}`, {
      method: 'GET',
    })
    
    if (data.success && data.data) {
      fundName.value = data.data.name
    }
  } catch (error) {
    console.error('Erro ao buscar nome do fundo:', error)
  }
}

watch([filter, perPage, filters], () => {
  router.push({
    query: {
      page: undefined,
    },
  })
}, { deep: true })

// Função para buscar as transações
const fetchTransactions = async () => {
  if (pending.value) return
  
  pending.value = true
  
  try {
    const queryParams = new URLSearchParams({
      page: page.value.toString(),
      perPage: perPage.value.toString(),
    })

    if (filter.value) {
      queryParams.append('filter', filter.value)
    }

    // Adicionar filtros avançados
    if (filters.value.dateRange && filters.value.dateRange !== 'all') {
      queryParams.append('dateRange', filters.value.dateRange)
    }
    
    if (filters.value.dateFrom) {
      queryParams.append('dateFrom', filters.value.dateFrom)
    }
    
    if (filters.value.dateTo) {
      queryParams.append('dateTo', filters.value.dateTo)
    }
    
    if (filters.value.transactionType && filters.value.transactionType !== 'all') {
      queryParams.append('transactionType', filters.value.transactionType)
    }
    
    if (filters.value.minAmount !== undefined) {
      queryParams.append('minAmount', filters.value.minAmount.toString())
    }
    
    if (filters.value.maxAmount !== undefined) {
      queryParams.append('maxAmount', filters.value.maxAmount.toString())
    }
    
    if (filters.value.fundId && filters.value.fundId !== 'all') {
      queryParams.append('fundId', filters.value.fundId)
    }

    const response = await useCustomFetch<TransactionResponse>(`/transactions?${queryParams}`, {
      method: 'GET',
    })
    
    data.value = response.data
  } catch (error) {
    console.error('Erro ao buscar transações:', error)
    data.value = { data: [], total: 0, page: 1, perPage: 20, totalPages: 0 }
  } finally {
    pending.value = false
  }
}

// Buscar transações ao montar o componente
onMounted(() => {
  // Primeiro inicializar filtros da query string
  initializeFiltersFromQuery()
  // Depois buscar as transações
  fetchTransactions()
})

// Observar mudanças na paginação e filtros
watch([page, filter, perPage, filters], () => {
  fetchTransactions()
}, { deep: true })

// Funções para gerenciar filtros
const onApplyFilters = (newFilters: FilterData) => {
  filters.value = { ...newFilters }
  
  // Se o fundId mudou, buscar o novo nome
  if (newFilters.fundId && newFilters.fundId !== 'all') {
    fetchFundName(newFilters.fundId)
  } else {
    fundName.value = ''
  }
}

const onClearFilters = () => {
  filters.value = {}
  fundName.value = ''
}

// Função para exportar para Excel
const exportToExcel = async () => {
  if (exportLoading.value) return
  
  exportLoading.value = true
  
  try {
    // Construir parâmetros de query (mesma lógica do fetchTransactions)
    const queryParams = new URLSearchParams()

    if (filter.value) {
      queryParams.append('filter', filter.value)
    }

    // Adicionar filtros avançados
    if (filters.value.dateRange && filters.value.dateRange !== 'all') {
      queryParams.append('dateRange', filters.value.dateRange)
    }
    
    if (filters.value.dateFrom) {
      queryParams.append('dateFrom', filters.value.dateFrom)
    }
    
    if (filters.value.dateTo) {
      queryParams.append('dateTo', filters.value.dateTo)
    }
    
    if (filters.value.transactionType && filters.value.transactionType !== 'all') {
      queryParams.append('transactionType', filters.value.transactionType)
    }
    
    if (filters.value.minAmount !== undefined) {
      queryParams.append('minAmount', filters.value.minAmount.toString())
    }
    
    if (filters.value.maxAmount !== undefined) {
      queryParams.append('maxAmount', filters.value.maxAmount.toString())
    }
    
    if (filters.value.fundId && filters.value.fundId !== 'all') {
      queryParams.append('fundId', filters.value.fundId)
    }

    // Fazer requisição para exportação
    const response = await useCustomFetch(`/transactions/export?${queryParams}`, {
      method: 'GET',
      responseType: 'blob'
    })

    // Criar blob e fazer download
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio-transacoes-${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    // Mostrar notificação de sucesso
    const toaster = useNuiToasts()
    toaster.add({
      title: 'Exportação concluída',
      description: 'O relatório foi baixado com sucesso',
      icon: 'lucide:check-circle',
      duration: 3000,
    })

  } catch (error) {
    console.error('Erro ao exportar:', error)
    
    // Mostrar notificação de erro
    const toaster = useNuiToasts()
    toaster.add({
      title: 'Erro na exportação',
      description: 'Ocorreu um erro ao gerar o relatório',
      icon: 'lucide:alert-triangle',
      duration: 5000,
    })
  } finally {
    exportLoading.value = false
  }
}

// Computed para verificar se há filtros aplicados
const hasFilters = computed(() => {
  return Object.keys(filters.value).some(key => {
    const value = filters.value[key as keyof FilterData]
    return value !== undefined && value !== '' && value !== null
  })
})

// Computed para texto dos filtros aplicados
const appliedFiltersText = computed(() => {
  const filterTexts = []
  
  if (filters.value.dateRange && filters.value.dateRange !== 'all') {
    const dateRangeLabels: Record<string, string> = {
      'today': 'Hoje',
      'yesterday': 'Ontem',
      'last_7_days': 'Últimos 7 dias',
      'last_30_days': 'Últimos 30 dias',
      'this_month': 'Este mês',
      'last_month': 'Mês passado',
      'this_year': 'Este ano',
      'custom': 'Período personalizado'
    }
    filterTexts.push(dateRangeLabels[filters.value.dateRange] || filters.value.dateRange)
  }
  
  if (filters.value.transactionType && filters.value.transactionType !== 'all') {
    const typeLabels: Record<string, string> = {
      'DEPOSIT': 'Depósito',
      'WITHDRAW': 'Saque',
      'CASHBACK': 'Cashback',
      'BONUS': 'Bônus',
      'FREE_CREDITS': 'Créditos Grátis'
    }
    filterTexts.push(typeLabels[filters.value.transactionType] || filters.value.transactionType)
  }
  
  if (filters.value.fundId && filters.value.fundId !== 'all') {
    filterTexts.push(fundName.value ? `Fundo: ${fundName.value}` : `Fundo selecionado`)
  }
  
  if (filters.value.minAmount !== undefined || filters.value.maxAmount !== undefined) {
    let amountText = 'Valor: '
    if (filters.value.minAmount !== undefined && filters.value.maxAmount !== undefined) {
      amountText += `R$ ${filters.value.minAmount} - R$ ${filters.value.maxAmount}`
    } else if (filters.value.minAmount !== undefined) {
      amountText += `≥ R$ ${filters.value.minAmount}`
    } else if (filters.value.maxAmount !== undefined) {
      amountText += `≤ R$ ${filters.value.maxAmount}`
    }
    filterTexts.push(amountText)
  }
  
  return filterTexts.length > 0 ? filterTexts.join(', ') : 'Nenhum filtro aplicado'
})

// Função para formatar valor em R$
function formatCurrency(value: number): string {
  if (!value) return '0,00'
  return value.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })
}

// Função para traduzir status
function getStatusLabel(status: string | undefined): string {
  if (!status) return 'Desconhecido'
  
  const statusLabels: Record<string, string> = {
    'complete': 'Concluído',
    'completed': 'Concluído',
    'in progress': 'Em Andamento',
    'processing': 'Processando',
    'pending': 'Pendente',
    'cancelled': 'Cancelado',
    'canceled': 'Cancelado',
    'failed': 'Falhou',
    'success': 'Sucesso',
    'approved': 'Aprovado',
    'rejected': 'Rejeitado'
  }
  
  return statusLabels[status.toLowerCase()] || status
}

function statusColor(itemStatus: string | undefined) {
  if (!itemStatus) return 'muted'
  
  switch (itemStatus.toLowerCase()) {
    case 'complete':
    case 'completed':
    case 'success':
    case 'approved':
      return 'primary'
    case 'in progress':
    case 'processing':
    case 'pending':
      return 'dark'
    case 'cancelled':
    case 'canceled':
    case 'failed':
    case 'rejected':
      return 'muted'
    default:
      return 'default'
  }
}
</script>

<template>
  <div class="w-full px-4 md:px-6 lg:px-8 pb-20 dark:[--color-input-default-bg:var(--color-muted-950)]">
    <!-- Header -->
    <div class="flex items-center justify-between pb-6">
      <TairoInput
        v-model="filter"
        icon="lucide:search"
        rounded="lg"
        placeholder="Buscar transações..."
      />
      <div class="flex items-center gap-2">
        <span class="text-muted-400 font-sans text-sm">
          {{ ((page - 1) * perPage) + 1 }}-{{ Math.min(page * perPage, data?.total || 0) }} de {{ data?.total || 0 }}
        </span>
      </div>
    </div>

    <div class="w-full">
      <!-- Filters -->
      <div class="flex w-full items-center gap-5">
        <!-- Dropdown -->
        <div>
          <TransactionFilters 
            v-model="filters"
            @apply="onApplyFilters"
            @clear="onClearFilters"
          />
        </div>

        <span
          class="text-muted-600 dark:text-muted-500 hidden font-sans text-sm font-medium md:block"
        >
          {{ appliedFiltersText }}
        </span>

        <!-- Clear filters button -->
        <BaseButton
          v-if="hasFilters"
          variant="muted"
          size="sm"
          @click="onClearFilters"
        >
          <Icon name="lucide:x" class="size-4" />
          <span>Limpar Filtros</span>
        </BaseButton>

        <div class="ms-auto">
          <BaseButton
            rounded="md"
            size="sm"
            :loading="exportLoading"
            :disabled="exportLoading"
            @click="exportToExcel"
          >
            <Icon name="solar:download-linear" class="size-4" />
            <span>{{ exportLoading ? 'Exportando...' : 'Exportar' }}</span>
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <DemoTransactionsListPlaceload v-if="pending" />
    
    <!-- Empty state - No transactions found -->
    <div v-else-if="!pending && data && Array.isArray(data.data) && data.data.length === 0" class="mt-7 text-center">
      <BasePlaceholderPage
        title="Nenhuma transação encontrada"
        subtitle="Não foram encontradas transações para os filtros aplicados."
      >
        <template #image>
          <img
            class="block dark:hidden"
            src="/img/illustrations/placeholders/flat/placeholder-search-1.svg"
            alt="Placeholder image"
          >
          <img
            class="hidden dark:block"
            src="/img/illustrations/placeholders/flat/placeholder-search-1-dark.svg"
            alt="Placeholder image"
          >
        </template>
        <template #action>
          <BaseButton
            v-if="hasFilters"
            variant="muted"
            size="sm"
            @click="onClearFilters"
          >
            <Icon name="lucide:x" class="size-4 me-2" />
            Limpar Filtros
          </BaseButton>
        </template>
      </BasePlaceholderPage>
    </div>
    
    <!-- Fallback para dados inválidos -->
    <div v-else-if="!data || !Array.isArray(data.data)" class="mt-7 text-center">
      <BasePlaceholderPage
        title="Erro nos dados"
        subtitle="Houve um problema ao carregar as transações."
      >
        <template #image>
          <Icon name="lucide:alert-triangle" class="size-16 text-muted-400" />
        </template>
      </BasePlaceholderPage>
    </div>
    <div v-else class="mt-7 overflow-x-auto px-2">
      <table class="w-full whitespace-nowrap">
        <thead>
          <tr>
            <th
              class="text-muted-400 dark:text-muted-300 w-1/5 px-4 pb-3 text-start font-sans text-xs font-semibold"
            >
              <span>Data</span>
            </th>
            <th
              class="text-muted-400 dark:text-muted-300 w-2/5 px-4 pb-3 text-start font-sans text-xs font-semibold"
            >
              <span>Usuário</span>
            </th>
            <th
              class="text-muted-400 dark:text-muted-300 px-4 pb-3 text-start font-sans text-xs font-semibold"
            >
              <span>Valor</span>
            </th>
            <th
              class="text-muted-400 dark:text-muted-300 px-4 pb-3 text-start font-sans text-xs font-semibold"
            >
              <span>Conta</span>
            </th>
            <th
              class="text-muted-400 dark:text-muted-300 px-4 pb-3 text-start font-sans text-xs font-semibold"
            >
              <span>Status</span>
            </th>
            <th
              class="text-muted-400 dark:text-muted-300 px-4 pb-3 text-start font-sans text-xs font-semibold"
            >
              <span>Método</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Row -->
          <tr
            v-for="(item, index) in (data?.data || []).filter(item => item != null)"
            :key="item?.id || index"
            tabindex="0"
            class="hover:bg-muted-200 dark:hover:bg-muted-800 transition-colors duration-300 ease-in-out"
          >
            <td class="p-4">
              <BaseText
                size="sm"
                lead="none"
                class="text-muted-600 dark:text-muted-400"
              >
                {{ item?.date || '-' }}
              </BaseText>
            </td>
            <td class="p-4">
              <BaseText
                size="sm"
                weight="medium"
                lead="none"
                class="text-muted-600 dark:text-muted-400"
              >
                {{ item?.issuer || '-' }}
              </BaseText>
            </td>
            <td class="p-4">
              <BaseText
                size="sm"
                weight="semibold"
                lead="none"
                class="text-muted-800 dark:text-muted-100"
              >
                {{ item?.type === 'in' ? '+' : '-' }} R$ {{ formatCurrency(item?.amount || 0) }}
              </BaseText>
            </td>
            <td class="p-4">
              <BaseText
                size="sm"
                weight="medium"
                lead="none"
                class="text-muted-400"
              >
                {{ item?.account || '-' }}
              </BaseText>
            </td>
            <td class="p-4">
              <BaseTag
                rounded="full"
                :variant="statusColor(item?.status)"
                size="sm"
              >
                {{ getStatusLabel(item?.status) }}
              </BaseTag>
            </td>
            <td class="p-4">
              <div class="text-muted-400 flex items-center gap-2">
                <Icon
                  v-if="item?.method === 'credit card'"
                  name="solar:card-linear"
                  class="size-5"
                />
                <Icon
                  v-else-if="item?.method === 'cheque'"
                  name="solar:document-linear"
                  class="size-5"
                />
                <Icon
                  v-else-if="item?.method === 'transfer'"
                  name="solar:transfer-horizontal-linear"
                  class="size-5"
                />
                <Icon
                  v-else-if="item?.method === 'bank'"
                  name="solar:safe-square-linear"
                  class="size-5"
                />
                <BaseText
                  size="sm"
                  lead="none"
                  class="text-muted-600 dark:text-muted-400"
                >
                  {{ item?.method || '-' }}
                </BaseText>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="mt-6">
        <BasePagination
          v-model:page="page"
          :total="data?.total ?? 0"
          :items-per-page="perPage"
          rounded="lg"
          class="w-full"
        />
      </div>
    </div>
  </div>
</template>
