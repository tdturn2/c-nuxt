/** Warm the departments tree after sign-in so first nav click is instant. */
export default defineNuxtPlugin(() => {
  const { status } = useAuth()

  watch(
    status,
    (authStatus) => {
      if (authStatus !== 'authenticated') return
      useConnectPagesTreeData()
    },
    { immediate: true },
  )
})
