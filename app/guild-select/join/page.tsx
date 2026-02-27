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
      const urlCode = searchParams.get('code')

      if (!currentUser) {
        // Redirect to login page, preserving the invite code for after auth
        const nextUrl = urlCode
          ? `/guild-select/join?code=${urlCode}`
          : '/guild-select/join'
        router.push(`/?next=${encodeURIComponent(nextUrl)}`)
        return
      }

      setUser(currentUser)

      if (urlCode) {
        setInviteCode(urlCode)
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

              <Button
                variant="primary"
                onClick={handleJoin}
                className="w-full"
                disabled={joining}
                loading={joining}
              >
                Join guild
              </Button>

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
