import { createRouter, createRootRoute, createRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({
  component: () => <div>Hello from root</div>,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Index,
})

function Index() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Collab Reader</h1>
        <div className="neobrutalism-card">
          <h2 className="text-2xl font-bold mb-4">Welcome</h2>
          <p className="mb-4">A web-based EPUB reader with collaborative features</p>
          <button className="neobrutalism-btn">Get Started</button>
        </div>
      </div>
    </div>
  )
}

const routeTree = rootRoute.addChildren([indexRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
