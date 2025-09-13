<script setup lang="ts">
import PanelAddFund from '~/components/panels/PanelAddFund.vue'
import PanelDetailFund from '~/components/panels/PanelDetailFund.vue'
import { useApi } from '~/composables/useAuth'
const { useCustomFetch } = useApi()
const toaster = useNuiToasts()

definePageMeta({
  title: 'Fundos',
  preview: {
    title: 'Fundos de caixa do sistema.',
    description: 'For card management',
    categories: ['layouts', 'lists'],
    src: '/img/screens/layouts-cards.png',
    srcDark: '/img/screens/layouts-cards-dark.png',
    order: 13,
    new: true,
  },
})

const route = useRoute()
const router = useRouter()
const page = computed(() => Number.parseInt((route.query.page as string) ?? '1', 10))

const filter = ref('')
const perPage = ref(45)
const { open } = usePanels()

watch([filter, perPage], () => {
  router.push({
    query: {
      page: undefined,
    },
  })
})



const currentCard = ref()
const funds:any = ref([])

function openCardPanel(id: string, cards: any) {
  const selectedCard = cards.find((card: any) => card.id === id)
  console.log('Opening fund panel for ID:', id, 'Selected card:', selectedCard)
  if (selectedCard) {
    open(PanelDetailFund, { card: selectedCard })
  }
}

function openAddPanel() {
  open(PanelAddFund, {
    onSuccess: async () => {
      // Recarrega a lista de fundos após criar um novo
      console.log('Recarregando lista de fundos...')
      await refreshFunds()
    }
  })
}


async function getFunds() {
  try{
    const { data } = await useCustomFetch<any>('/funds', {
      method: 'GET',
    })
    return data
  } catch (error) {
    console.error(error)
    toaster.add({
      title: 'Oops!',
      description: 'Erro na busca de fundos, tente novamente e contate o suporte.',
      icon: 'lucide:alert-triangle',
      progress: true,
    })
    return []
  }
}

// Função para recarregar a lista de fundos
async function refreshFunds() {
  try {
    const data = await getFunds()
    funds.value = data
    console.log('Lista de fundos atualizada:', data)
    
    toaster.add({
      title: 'Atualizado',
      description: 'Lista de fundos recarregada com sucesso!',
      icon: 'ph:check-circle-fill',
      progress: true,
    })
  } catch (error) {
    console.error('Erro ao recarregar fundos:', error)
  }
}

// Função para formatar valor em reais
function formatCurrency(value: number): string {
  if (!value) return '0,00'
  return Math.abs(value).toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })
}

// Função para obter o saldo atual do fundo
function getCurrentBalance(card: any): number {
  // Prioriza o saldo atual se disponível, senão usa o saldo histórico
  return card.stats.currentBalance !== undefined ? card.stats.currentBalance : card.stats.totalAmount
}

onMounted(async () => {
  const data = await getFunds()
  funds.value = data
})
</script>

<template>
  <div class="w-full px-4 md:px-6 lg:px-8 pb-20 dark:[--color-input-default-bg:var(--color-muted-950)]">
    <!-- Header -->
    <div class="flex items-center justify-between py-6">
      <TairoInput
        v-model="filter"
        icon="lucide:search"
        rounded="lg"
        placeholder="Procurar por nome..."
      />
      <div class="flex items-center gap-2">
        <span class="text-muted-400 font-sans text-sm">
          0-{{ funds.length }} of {{ funds?.total }}
        </span>
      </div>
    </div>

    <div class="w-full">
      <!-- Filters -->
      <div class="flex w-full items-center gap-5">
        <!-- Dropdown -->
        <!-- <div>
          <DemoCardFilters />
        </div> -->

        <!-- <BaseText
          size="sm"
          weight="medium"
          class="text-muted-600 dark:text-muted-500 hidden md:block"
        >
          Nenhum filtro aplicado.
        </BaseText> -->

        <div class="ms-auto">
          <BaseButton
            @click="openAddPanel()"
            rounded="md"
            variant="default"
            size="sm"
          >
            <Icon name="lucide:plus" class="size-4" />
            <span>Adicionar Fundo</span>
          </BaseButton>
        </div>
      </div>
    </div>

    <div class="mt-7 overflow-x-auto">
      <table class="w-full whitespace-nowrap">
        <thead>
          <tr>
            <th
              class="text-muted-400 dark:text-muted-300 px-4 pb-3 text-start font-sans text-xs font-semibold md:w-1/5"
            >
              <span>Nome</span>
            </th>
            <th
              class="text-muted-400 dark:text-muted-300 px-4 pb-3 text-start font-sans text-xs font-semibold md:w-2/5"
            >
              <span>Tipo</span>
            </th>
            <th
              class="text-muted-400 dark:text-muted-300 px-4 pb-3 text-start font-sans text-xs font-semibold"
            >
              <span>Operações Vinculadas</span>
            </th>
            <th
              class="text-muted-400 dark:text-muted-300 px-4 pb-3 text-start font-sans text-xs font-semibold"
            >
              <span>Total no Caixa</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="card in funds.data"
            :key="card.id"
            tabindex="0"
            class="hover:bg-muted-200 dark:hover:bg-muted-800 cursor-pointer transition-colors duration-200 ease-in-out"
            @click="openCardPanel(card.id, funds.data)"
          >
            <td class="p-4">
              <span
                class="text-muted-500 dark:text-muted-300 font-sans text-sm font-medium leading-none"
              >
                {{
                  card.name
                }}
              </span>
            </td>
            <td class="p-4">
              <div
                class="text-muted-500 dark:text-muted-300 me-5 flex items-center gap-2 md:me-0"
              >
                <Icon :name="card.type == 'money' ? 'solar:dollar-linear' : 'solar:card-linear'" class="size-5" />
                <BaseText
                  size="sm"
                  weight="medium"
                  lead="none"
                >
                  {{ card.type }}
                </BaseText>
                <span
                  class="bg-muted-100 dark:bg-muted-600/10 text-muted-500 m-1 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-sans text-xs"
                >
                  <span
                    class="size-2 rounded-full"
                    :class="[
                      card.status === 'active' && 'bg-success-500',
                      card.status === 'disabled'
                        && 'bg-muted-300 dark:bg-muted-700',
                      card.status === 'locked' && 'bg-destructive-500',
                    ]"
                  />
                  <span>{{ card.status }}</span>
                </span>
              </div>
            </td>
            <td class="p-4">
              <BaseText
              weight="medium"
                lead="none"
                size="sm"
                class="text-muted-400"
              >
                {{ card.stats.totalOperations }}
              </BaseText>
            </td>
            <td class="p-4">
              <BaseText
                weight="medium"
                lead="none"
                size="sm"
                :class="[
                  getCurrentBalance(card) >= 0 
                    ? 'text-muted-400' 
                    : 'text-red-600 dark:text-red-400'
                ]"
              >
                R$ {{ formatCurrency(getCurrentBalance(card)) }}
              </BaseText>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
