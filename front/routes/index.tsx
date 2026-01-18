import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b-2 border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="font-heading text-xl font-bold">Collab Reader</div>
            <div className="flex gap-3">
              <Link to="/app">
                <Button variant="neutral">Go to App</Button>
              </Link>
              <Link to="/login">
                <Button>Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="font-heading text-5xl md:text-6xl font-bold mb-6">
            Read Together,<br/>Grow Together
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            A collaborative EPUB reader that transforms reading into a shared experience. Highlight, annotate, and discuss books with your community.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/login">
              <Button size="lg" className="text-base px-8">
                Get Started Free
              </Button>
            </Link>
            <Link to="/app">
              <Button variant="neutral" size="lg" className="text-base px-8">
                Open App
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardContent className="p-6">
              <div className="font-heading text-2xl font-bold mb-3">📚 Read Anywhere</div>
              <p className="text-muted-foreground">
                Upload and read your EPUB collection with a clean, distraction-free interface. Your library is always just a click away.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="font-heading text-2xl font-bold mb-3">✨ Collaborate</div>
              <p className="text-muted-foreground">
                Share highlights, add notes, and discuss passages with friends. Reading becomes social and enriching.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="font-heading text-2xl font-bold mb-3">🔍 Search & Organize</div>
              <p className="text-muted-foreground">
                Full-text search across all your books. Organize with tags and collections. Never lose a quote again.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h2 className="font-heading text-3xl font-bold mb-4">Ready to Start?</h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of readers who are experiencing books in a whole new way.
              </p>
              <Link to="/login">
                <Button size="lg" className="w-full sm:w-auto">
                  Create Your Account
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
