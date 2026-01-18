import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '../../lib/auth'

export const Route = createFileRoute('/app/')({
  component: RouteComponent,
  beforeLoad: async ({ location }) => {
    const { data: session } = await authClient.getSession()
    
    if (!session?.user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href }
      })
    }
    
    return { session }
  },
})

function RouteComponent() {
  return <div>Hello "/app/"!</div>
}
