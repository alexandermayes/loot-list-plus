'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Key01Icon, Tick01Icon } from '@hugeicons/core-free-icons'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heading, Text } from '@/components/ui/typography'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function JoinGuildPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <JoinGuildContent />
    </Suspense>
  )
}

function JoinGuildContent() {
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form state
  const [inviteCode, setInviteCode] = useState('')
  const [guildInfo, setGuildInfo] = useState<any>(null)

  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const init = async () => {
      // Check if logged in
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      // Check if there's a code in the URL
      const urlCode = searchParams.get('code')
      if (urlCode) {
        setInviteCode(urlCode)
        // Auto-validate the code (works for both auth and unauth users)
        await validateCode(urlCode)
      }

      setLoading(false)
    }

    init()
  }, [])

  const validateCode = async (code: string) => {
    if (!code.trim()) {
      setError('Please enter an invite code')
      setGuildInfo(null)
      return
    }

    setValidating(true)
    setError('')
    setGuildInfo(null)

    try {
      const response = await fetch(`/api/guild-invites/${code.trim()}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid invite code. Double-check the code and try again.')
        setValidating(false)
        return
      }

      setGuildInfo(data)
      setValidating(false)
    } catch (err) {
      console.error('Error validating code:', err)
      setError('Couldn\'t validate invite code. Check your connection and try again.')
      setValidating(false)
    }
  }

  const handleValidate = (e: React.FormEvent) => {
    e.preventDefault()
    validateCode(inviteCode)
  }

  const handleSignInToJoin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/guild-select/join?code=${inviteCode}`)}`,
        scopes: 'identify guilds'
      }
    })
  }

  const handleJoin = async () => {
    if (!guildInfo) return

    setJoining(true)
    setError('')

    try {
      const response = await fetch(`/api/guild-invites/${inviteCode.trim()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Couldn\'t join guild. Check your connection and try again.')
        setJoining(false)
        return
      }

      // Success!
      setSuccess(true)
      setTimeout(() => {
        if (data.needs_character_creation) {
          window.location.href = '/overview?create_character=true'
        } else {
          window.location.href = '/overview'
        }
      }, 1500)
    } catch (err) {
      console.error('Error joining guild:', err)
      setError('Couldn\'t join guild. Check your connection and try again.')
      setJoining(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-success/20 mx-auto">
            <HugeiconsIcon icon={Tick01Icon} size={40} className="text-success" />
          </div>
          <Heading level={2}>Successfully joined</Heading>
          <Text color="muted">Redirecting...</Text>
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Back button */}
      <div className="absolute top-4 left-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(user ? '/guild-select' : '/')}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back
        </Button>
      </div>

      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mx-auto mb-4">
            <HugeiconsIcon icon={Key01Icon} size={32} className="text-accent" />
          </div>
          <Heading level={1} className="text-3xl">Join a guild</Heading>
          <Text color="muted">
            Enter the invite code shared by your guild officer
          </Text>
        </div>

        {/* Invite Code Input */}
        {!guildInfo && (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleValidate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="inviteCode"
                      type="text"
                      placeholder="ABC123DEF456"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      maxLength={12}
                      disabled={validating || joining}
                      className="font-mono text-lg tracking-wider"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={validating || joining || !inviteCode.trim()}
                      loading={validating}
                    >
                      Validate
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Guild Info + Action */}
        {guildInfo && (
          <Card>
            <CardHeader>
              <CardTitle>{guildInfo.guild.name}</CardTitle>
              <CardDescription>
                {guildInfo.guild.realm || 'No realm'} · {guildInfo.guild.faction}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <code className="px-2 py-1 bg-background-subtle rounded font-mono text-foreground text-xs">
                  {inviteCode}
                </code>
                <span>· Valid invite code</span>
              </div>

              {user ? (
                <Button
                  variant="primary"
                  onClick={handleJoin}
                  className="w-full"
                  disabled={joining}
                  loading={joining}
                >
                  Join guild
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSignInToJoin}
                  className="w-full"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  Sign in with Discord to join
                </Button>
              )}

              {!user && (
                <Text color="muted" size="xs" className="text-center">
                  You need a Discord account to use LootList+
                </Text>
              )}

              <button
                onClick={() => { setGuildInfo(null); setError('') }}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Use a different code
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
