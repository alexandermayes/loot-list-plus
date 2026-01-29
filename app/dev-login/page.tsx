'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Only allow in development
const IS_DEV = process.env.NODE_ENV === 'development'

interface TestUser {
  id: string
  email: string
  password: string
}

export default function DevLoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [testUsers, setTestUsers] = useState<TestUser[]>([])

  useEffect(() => {
    // Load test users from API
    fetch('/api/dev/test-users')
      .then(res => res.json())
      .then(data => {
        if (data.users) {
          setTestUsers(data.users.slice(0, 5)) // Show first 5
        }
      })
      .catch(() => {
        // Ignore errors - test users just won't be shown
      })
  }, [])

  // Block access in production
  if (!IS_DEV) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>
                Dev login is only available in development mode.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      // Redirect to overview or guild-select
      router.push('/overview')
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  const handleQuickLogin = async (user: TestUser) => {
    setEmail(user.email)
    setPassword(user.password)
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      router.push('/overview')
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Dev Login</CardTitle>
          <CardDescription>
            Development-only email/password login for testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="loadtest1_xxx@lootlist-test.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Sign In
            </Button>
          </form>

          {testUsers.length > 0 && (
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background-elevated px-2 text-muted-foreground">
                    Quick Login
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {testUsers.map((user, index) => (
                  <Button
                    key={user.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs font-mono"
                    onClick={() => handleQuickLogin(user)}
                    disabled={loading}
                  >
                    Test User {index + 1}: {user.email.split('@')[0].substring(0, 20)}...
                  </Button>
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Password for all test users: <code className="bg-background px-1 rounded">TestPassword123!</code>
              </p>
            </div>
          )}

          <div className="text-center">
            <Button
              variant="link"
              size="sm"
              onClick={() => router.push('/')}
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
