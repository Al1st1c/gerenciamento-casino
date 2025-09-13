// plugins/api.ts
import { ofetch } from 'ofetch'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const api = ofetch.create({
    baseURL: 'http://localhost:8080', // Ex: http://localhost:8080
    credentials: 'include', // inclui cookies HTTP-only
  })

  return {
    provide: {
      api,
    },
  }
})
