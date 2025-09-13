<script setup lang="ts">
import { useApi } from '~/composables/useAuth'

definePageMeta({
  title: 'Dashboard',
  preview: {
    title: 'Balance dashboard',
    description: 'For bank account overview',
    categories: ['dashboards'],
    src: '/img/screens/dashboards-balance.png',
    srcDark: '/img/screens/dashboards-balance-dark.png',
    order: 5,
    new: true,
  },
})

// Tipagem para os fundos
interface Fund {
  id: string
  name: string
  type: 'money' | 'bank'
  createdAt: string
  updatedAt: string
}

// Tipagem para os fundos selecionados com valores
interface SelectedFund {
  fundId: string
  fund: Fund
  initialValue: string
}

const showFeatures = ref(true)
const isCashierActive = ref(false)
const isLoading = ref(false)
const isLoadingFunds = ref(false)
const isLoadingCashierStatus = ref(true) // Começa como true para evitar flash do modal
const cashierStatusChecked = ref(false) // Para controlar se já verificou o status
const funds = ref<Fund[]>([])
const selectedFunds = ref<SelectedFund[]>([])
const toaster = useNuiToasts()
const { useCustomFetch } = useApi()

// Chaves para localStorage
const CASHIER_STATUS_KEY = 'casino_cashier_status'
const CASHIER_DATA_KEY = 'casino_cashier_data'

// Datepicker
const date = ref(new Date())

// Funções para gerenciar cache do caixa
function saveCashierStatus(isActive: boolean, data?: any) {
  const today = new Date().toISOString().split('T')[0]
  
  localStorage.setItem(CASHIER_STATUS_KEY, JSON.stringify({
    isActive,
    date: today,
    timestamp: Date.now()
  }))
  
  if (data) {
    localStorage.setItem(CASHIER_DATA_KEY, JSON.stringify(data))
  }
}

function getCachedCashierStatus() {
  try {
    const cached = localStorage.getItem(CASHIER_STATUS_KEY)
    if (!cached) return null
    
    const data = JSON.parse(cached)
    const today = new Date().toISOString().split('T')[0]
    
    // Verifica se o cache é do dia atual (máximo 24h)
    if (data.date !== today) {
      clearCashierCache()
      return null
    }
    
    return data
  } catch (error) {
    console.error('Erro ao ler cache do caixa:', error)
    clearCashierCache()
    return null
  }
}

function clearCashierCache() {
  localStorage.removeItem(CASHIER_STATUS_KEY)
  localStorage.removeItem(CASHIER_DATA_KEY)
}

// Função para verificar se já existe operação do dia (com cache)
async function checkTodayOperation() {
  try {
    // Primeiro, verifica o cache
    const cachedStatus = getCachedCashierStatus()
    if (cachedStatus) {
      console.log('Estado do caixa encontrado no cache:', cachedStatus)
      isCashierActive.value = cachedStatus.isActive
      
      cashierStatusChecked.value = true
      isLoadingCashierStatus.value = false
      return
    }
    
    // Se não há cache, consulta a API
    await getFunds()
    console.log('Consultando API para verificar operação do dia...')
    const { data } = await useCustomFetch<any>('/operations/today', {
      method: 'GET',
    })
    
    if (data.success && data.data) {
      // Já existe operação do dia, ativar o caixa e salvar no cache
      isCashierActive.value = true
      saveCashierStatus(true, data.data)
      
      console.log('Operação do dia já existe:', data.data)
      
      toaster.add({
        title: 'Dia Já Iniciado',
        description: 'Continuando operação do dia atual',
        icon: 'ph:info-circle-fill',
        progress: true,
      })
    } else {
      // Não existe operação, salvar estado inativo no cache
      saveCashierStatus(false)
      console.log('Nenhuma operação encontrada para hoje, aguardando abertura...')
    }
  } catch (error) {
    console.log('Erro ao verificar operação do dia:', error)
    // Em caso de erro, não salva no cache e deixa como inativo
    saveCashierStatus(false)
  } finally {
    cashierStatusChecked.value = true
    isLoadingCashierStatus.value = false
  }
}

// Buscar fundos da API
async function getFunds() {
  isLoadingFunds.value = true
  try {
    const { data } = await useCustomFetch<any>('/funds', {
      method: 'GET',
    })
    
    if (data.success) {
      funds.value = data.data || []
      console.log('Fundos carregados:', funds.value)
    } else {
      throw new Error(data.message || 'Erro ao buscar fundos')
    }
  } catch (error) {
    console.error('Erro ao buscar fundos:', error)
    toaster.add({
      title: 'Erro',
      description: 'Erro ao carregar fundos. Tente novamente.',
      icon: 'lucide:alert-triangle',
      duration: 3000,
    })
    funds.value = []
  } finally {
    isLoadingFunds.value = false
  }
}


// Carrega os fundos e verifica operação do dia quando o componente é montado
onMounted(async () => {
  await checkTodayOperation()
})

// Função para adicionar um fundo à seleção
function addFund() {
  if (funds.value.length === 0) return
  
  // Encontra o primeiro fundo que ainda não foi selecionado
  const availableFund = funds.value.find(fund => 
    !selectedFunds.value.some(sf => sf.fundId === fund.id)
  )
  
  if (availableFund) {
    selectedFunds.value.push({
      fundId: availableFund.id,
      fund: availableFund,
      initialValue: ''
    })
  }
}

// Função para remover um fundo da seleção
function removeFund(index: number) {
  selectedFunds.value.splice(index, 1)
}

// Função para alterar o fundo selecionado em um índice específico
function changeFund(index: number, newFundId: string) {
  const fund = funds.value.find(f => f.id === newFundId)
  if (fund && selectedFunds.value[index]) {
    selectedFunds.value[index].fundId = newFundId
    selectedFunds.value[index].fund = fund
  }
}

// Computed para fundos disponíveis (que ainda não foram selecionados)
const availableFunds = computed(() => {
  return funds.value.filter(fund => 
    !selectedFunds.value.some(sf => sf.fundId === fund.id)
  )
})

// Computed para total de valores
const totalValue = computed(() => {
  return selectedFunds.value.reduce((sum, sf) => {
    const value = parseFloat(sf.initialValue.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0
    return sum + value
  }, 0)
})

const activateCashier = async () => {
  // Validação dos fundos selecionados
  if (selectedFunds.value.length === 0) {
    toaster.add({
      title: 'Erro!',
      description: 'Por favor, adicione pelo menos um fundo para iniciar o dia',
      icon: 'lucide:alert-triangle',
      duration: 3000,
    })
    return
  }

  // Validação dos valores de cada fundo
  const invalidFunds = selectedFunds.value.filter(sf => {
    const value = parseFloat(sf.initialValue.replace(/[^\d,.-]/g, '').replace(',', '.'))
    return !sf.initialValue.trim() || isNaN(value) || value <= 0
  })

  if (invalidFunds.length > 0) {
    toaster.add({
      title: 'Erro!',
      description: 'Todos os fundos devem ter valores válidos maiores que zero',
      icon: 'lucide:alert-triangle',
      duration: 3000,
    })
    return
  }

  isLoading.value = true
  
  try {
    // Prepara os dados para a API
    const today = new Date().toISOString().split('T')[0]
    const fundsData = selectedFunds.value.map(sf => ({
      fundId: sf.fundId,
      amount: parseFloat(sf.initialValue.replace(/[^\d,.-]/g, '').replace(',', '.'))
    }))

    const payload = {
      dateOpened: today,
      funds: fundsData
    }

    console.log('Enviando dados para API:', payload)

    // Chama a API para abrir o dia
    let response
    try {
      response = await useCustomFetch<any>('/operations/open-day', {
        method: 'POST',
        body: payload,
      })
      console.log('Resposta completa da API:', response)
    } catch (fetchError: any) {
      console.error('Erro no fetch:', fetchError)
      console.error('Tipo do erro:', typeof fetchError)
      console.error('Stack do erro:', fetchError.stack)
      throw new Error(`Erro na comunicação com a API: ${fetchError.message}`)
    }

    // Verifica se a resposta tem o formato esperado
    if (!response || typeof response !== 'object') {
      throw new Error('Resposta inválida da API')
    }

    const { data } = response

    if (data && data.success) {
      isCashierActive.value = true
      
      // Salvar no cache que o caixa foi ativado
      saveCashierStatus(true, data.data)
      
      const totalAmount = fundsData.reduce((sum, f) => sum + f.amount, 0)
      
      toaster.add({
        title: 'Sucesso!',
        description: `Dia aberto com ${fundsData.length} fundo(s) - Total: R$ ${totalAmount.toFixed(2)}`,
        icon: 'lucide:check-circle',
        duration: 4000,
      })
      
      console.log('Resposta da API:', data)
    } else {
      throw new Error(data?.message || 'Erro ao abrir o dia')
    }
    
  } catch (error: any) {
    console.error('Erro ao ativar o caixa:', error)
    
    toaster.add({
      title: 'Erro!',
      description: error.message || 'Erro ao ativar o caixa. Tente novamente.',
      icon: 'lucide:alert-triangle',
      duration: 3000,
    })
  } finally {
    isLoading.value = false
  }
}

// Expor função para limpar cache (para uso no login)
defineExpose({
  clearCashierCache
})
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 pb-20 relative">
    <!-- Loading inicial enquanto verifica status do caixa -->
    <div 
      v-if="!cashierStatusChecked" 
      class="fixed inset-0 z-50 bg-white dark:bg-muted-800 flex items-center justify-center"
    >
      <div class="text-center">
        <div class="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mb-4">
          <Icon name="lucide:loader-2" class="size-8 text-primary-600 dark:text-primary-400 animate-spin" />
        </div>
        <BaseHeading as="h2" size="lg" class="text-muted-800 dark:text-muted-100 mb-2">
          Carregando Dashboard
        </BaseHeading>
        <BaseParagraph class="text-muted-600 dark:text-muted-400" size="sm">
          Verificando status do sistema...
        </BaseParagraph>
      </div>
    </div>

    <!-- Overlay com blur quando caixa não está ativo -->
    <div 
      v-if="cashierStatusChecked && !isCashierActive" 
      class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div class="bg-white dark:bg-muted-800 rounded-xl p-8 max-w-md w-full shadow-2xl">
        <div class="text-center mb-6">
          <div class="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mb-4">
            <Icon name="lucide:lock" class="size-8 text-primary-600 dark:text-primary-400" />
          </div>
          <BaseHeading as="h2" size="lg" class="text-muted-800 dark:text-muted-100 mb-2">
            Iniciar o Dia!
          </BaseHeading>
          <BaseParagraph class="text-muted-600 dark:text-muted-400" size="sm">
            Para começar a usar o sistema, você precisa inserir o valor inicial do caixa.
          </BaseParagraph>
        </div>

        <div class="space-y-4">
          <!-- Loading state para verificação do caixa -->
          <div v-if="isLoadingCashierStatus" class="text-center py-8">
            <div class="mx-auto w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mb-4">
              <Icon name="lucide:loader-2" class="size-6 text-primary-600 dark:text-primary-400 animate-spin" />
            </div>
            <BaseText size="sm" class="text-muted-600 dark:text-muted-400 font-medium">
              Consultando informações do caixa...
            </BaseText>
            <BaseText size="xs" class="text-muted-500 mt-1">
              Verificando se o dia já foi iniciado
            </BaseText>
          </div>

          <!-- Loading state para fundos -->
          <div v-else-if="isLoadingFunds" class="text-center py-4">
            <BaseText size="sm" class="text-muted-500">
              <Icon name="lucide:loader-2" class="size-4 animate-spin me-2" />
              Carregando fundos...
            </BaseText>
          </div>
          
          <!-- Estado quando não há fundos -->
          <div v-else-if="!funds.length" class="text-center py-4">
            <BaseText size="sm" class="text-muted-500">
              <Icon name="lucide:alert-circle" class="size-4 me-2" />
              Nenhum fundo disponível
            </BaseText>
          </div>

          <!-- Lista de Fundos Selecionados -->
          <div v-else class="space-y-4">
            <div class="flex items-center justify-between">
              <BaseHeading as="h5" size="sm" weight="medium" class="text-muted-800 dark:text-muted-200">
                Fundos do Dia
              </BaseHeading>
              <BaseButton
                @click="addFund"
                :disabled="availableFunds.length === 0"
                variant="muted"
                size="sm"
                rounded="md"
              >
                <Icon name="lucide:plus" class="size-3 me-1" />
                Adicionar Fundo
              </BaseButton>
            </div>

            <!-- Lista de fundos selecionados -->
            <div v-if="selectedFunds.length === 0" class="text-center py-8 border-2 border-dashed border-muted-200 dark:border-muted-700 rounded-lg">
              <Icon name="lucide:wallet" class="size-8 text-muted-400 mx-auto mb-2" />
              <BaseText size="sm" class="text-muted-500">
                Clique em "Adicionar Fundo" para começar
              </BaseText>
            </div>

            <div v-else class="space-y-3">
              <div 
                v-for="(selectedFund, index) in selectedFunds"
                :key="`selected-${index}`"
                class="bg-muted-50 dark:bg-muted-900 rounded-lg p-4 border border-muted-200 dark:border-muted-700"
              >
                <div class="flex items-start gap-3">
                  <!-- Seletor de Fundo -->
                  <div class="flex-1">
                    <BaseField :label="`Fundo ${index + 1}`" size="sm">
                      <BaseSelect
                        :model-value="selectedFund.fundId"
                        @update:model-value="(value) => changeFund(index, value)"
                        rounded="md"
                        size="sm"
                      >
                        <!-- Fundo atual (sempre disponível para ele mesmo) -->
                        <BaseSelectItem :value="selectedFund.fundId">
                          <div class="flex items-center gap-2">
                            <div 
                              class="size-3 rounded-full"
                              :class="selectedFund.fund.type === 'money' ? 'bg-primary-500' : 'bg-success-500'"
                            />
                            <span class="font-medium">{{ selectedFund.fund.name }}</span>
                            <span class="text-muted-500 text-xs">({{ selectedFund.fund.type === 'money' ? 'Dinheiro' : 'Banco' }})</span>
                          </div>
                        </BaseSelectItem>
                        
                        <!-- Outros fundos disponíveis -->
                        <BaseSelectItem
                          v-for="fund in availableFunds"
                          :key="fund.id"
                          :value="fund.id"
                        >
                          <div class="flex items-center gap-2">
                            <div 
                              class="size-3 rounded-full"
                              :class="fund.type === 'money' ? 'bg-primary-500' : 'bg-success-500'"
                            />
                            <span class="font-medium">{{ fund.name }}</span>
                            <span class="text-muted-500 text-xs">({{ fund.type === 'money' ? 'Dinheiro' : 'Banco' }})</span>
                          </div>
                        </BaseSelectItem>
                      </BaseSelect>
                    </BaseField>
                  </div>

                  <!-- Campo de Valor -->
                  <div class="flex-1">
                    <BaseField label="Valor Inicial (R$)" size="sm" required>
                      <BaseInput
                        v-model="selectedFund.initialValue"
                        placeholder="0,00"
                        rounded="md"
                        size="sm"
                        class="text-right font-medium"
                      />
                    </BaseField>
                  </div>

                  <!-- Botão de Remover -->
                  <div class="pt-6">
                    <BaseButton
                      @click="removeFund(index)"
                      variant="destructive"
                      size="sm"
                      rounded="md"
                    >
                      <Icon name="lucide:trash-2" class="size-3" />
                    </BaseButton>
                  </div>
                </div>
              </div>
            </div>

            <!-- Resumo Total -->
            <div 
              v-if="selectedFunds.length > 0" 
              class="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4"
            >
              <div class="flex items-center justify-between">
                <div>
                  <BaseText weight="medium" class="text-primary-800 dark:text-primary-200">
                    Total Inicial do Caixa
                  </BaseText>
                  <BaseText size="xs" class="text-primary-600 dark:text-primary-400">
                    {{ selectedFunds.length }} fundo(s) selecionado(s)
                  </BaseText>
                </div>
                <div class="text-right">
                  <BaseHeading as="h4" size="lg" weight="semibold" class="text-primary-800 dark:text-primary-200">
                    R$ {{ totalValue.toFixed(2) }}
                  </BaseHeading>
                </div>
              </div>
            </div>

            <BaseButton
              @click="activateCashier"
              :loading="isLoading"
              :disabled="isLoading || selectedFunds.length === 0"
              variant="primary"
              size="lg"
              class="w-full"
            >
              <Icon name="lucide:unlock" class="size-4 me-2" />
              {{ isLoading ? 'Ativando...' : 'Iniciar o dia & Ativar caixa' }}
            </BaseButton>
          </div>
        </div>

        <div class="mt-6 text-center">
          <BaseText size="xs" class="text-muted-500 dark:text-muted-400">
            <Icon name="lucide:info" class="size-3 me-1" />
            Adicione um ou mais fundos com seus valores iniciais para controlar o fluxo de caixa do dia
          </BaseText>
        </div>
      </div>
    </div>

    <!-- Conteúdo principal com blur quando caixa não está ativo -->
    <div :class="{ 'blur-sm pointer-events-none': cashierStatusChecked && !isCashierActive }">
      <div class="grid grid-cols-12 gap-4">
      <div class="col-span-12 lg:col-span-9">
        <Transition
          leave-active-class="transition origin-top duration-75 ease-in"
          leave-from-class="transform scale-y-100 opacity-100"
          leave-to-class="transform scale-y-0 opacity-0"
        >
          <div v-if="showFeatures" class="w-full pb-4">
            <!-- Features widget -->
            <DemoWidgetFeatures>
              <template #actions>
                <BaseButton
                  size="icon-sm"
                  variant="muted"
                  data-nui-tooltip="Hide this"
                  @click="showFeatures = false"
                >
                  <Icon name="lucide:x" class="size-4" />
                </BaseButton>
              </template>
            </DemoWidgetFeatures>
          </div>
        </Transition>
        <div class="grid grid-cols-12 gap-4">
          <!-- Grid item -->
          <div class="col-span-12 md:col-span-5">
            <!-- Welcome widget -->
            <DemoWidgetWelcome />
          </div>
          <div class="col-span-12 md:col-span-7">
            <!-- Account balance widget -->
            <DemoWidgetAccountBalance />
          </div>
          <div class="col-span-12 md:col-span-6">
            <!-- Money out widget -->
            <DemoWidgetMoneyOut />
          </div>
          <div class="col-span-12 md:col-span-6">
            <!-- Money in widget -->
            <DemoWidgetMoneyIn />
          </div>
          <div class="col-span-12 md:col-span-12">
            <!-- Transactions widget -->
            <DemoWidgetTransactionSummary />
          </div>
        </div>
      </div>
      <div class="col-span-12 lg:col-span-3">
        <!-- Column -->
        <div class="relative flex flex-col gap-4">
          <!-- Widget -->
          <DemoActionText
            title="Upgrade to Pro"
            text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quid censes in Latino fore? Nam ante Aristippus, et ille melius."
            label="Upgrade Now"
            to="#"
            rounded="md"
          />
          <!-- Widget -->
          <BaseCard rounded="md" class="flex flex-col p-6">
            <div class="mb-6 flex items-center justify-between">
              <BaseHeading
                as="h3"
                size="sm"
                weight="medium"
                lead="tight"
                class="text-muted-900 dark:text-white"
              >
                <span>Personal Score</span>
              </BaseHeading>
            </div>
            <div class="py-16">
              <DemoChartRadialGaugeAlt class="-mt-14" />
            </div>
            <div class="mt-auto text-center">
              <BaseParagraph size="sm">
                <span class="text-muted-600 dark:text-muted-400">
                  Your score has been calculated based on the latest metrics
                </span>
              </BaseParagraph>
            </div>
          </BaseCard>
          <!-- Widget -->
          <BaseCard rounded="md" class="p-2">
            <LazyAddonDatepicker v-model="date" locale="en" label="Start date" />
          </BaseCard>
          <!-- Widget -->
          <BaseCard class="p-4 md:p-6" rounded="md">
            <DemoNotificationsCompact />
          </BaseCard>
          <!-- Widget -->
          <BaseCard
            variant="none"
            rounded="md"
            class="from-primary-900 to-primary-800 relative flex h-full items-center justify-center bg-gradient-to-br p-6"
          >
            <div class="relative z-20 flex flex-col gap-3 py-10 text-center">
              <BaseHeading
                as="h4"
                size="lg"
                weight="semibold"
                lead="tight"
                class="text-white"
              >
                <span>You're doing great!</span>
              </BaseHeading>
              <BaseParagraph size="md" class="mx-auto max-w-[280px]">
                <span class="text-white/80">
                  Start using our team and project management tools
                </span>
              </BaseParagraph>
              <NuxtLink
                class="font-sans text-sm text-white underline-offset-4 hover:underline"
                to="#"
              >
                Learn More
              </NuxtLink>
            </div>
            <div
              class="absolute bottom-4 end-4 z-10 flex size-14 items-center justify-center"
            >
              <Icon
                name="ph:crown-duotone"
                class="text-primary-600/50 size-14"
              />
            </div>
          </BaseCard>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>
