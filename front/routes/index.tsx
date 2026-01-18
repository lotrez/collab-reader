
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      coucou
    </div>
  )
}
