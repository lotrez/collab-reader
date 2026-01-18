import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { authClient } from './lib/auth'
import { routeTree } from './src/routeTree.gen'


const router = createRouter({
  routeTree,
  defaultPreload: 'viewport',
  defaultStaleTime: 5000,
  scrollRestoration: true,
})

function App() {
  const { data: session } = authClient.useSession()
  return <RouterProvider router={router} context={{session}} />
}

const rootElement = document.getElementById('root')
if (rootElement) {
  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
