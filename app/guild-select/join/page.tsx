'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Key, Check } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export default function JoinGuildPage() {
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
    const checkUser = async () => {
      // Check if logged in
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/')
        return
      }
      setUser(currentUser)

      // Check if there's a code in the URL
      const urlCode = searchParams.get('code')
      if (urlCode) {
        setInviteCode(urlCode)
        // Auto-validate the code
        validateCode(urlCode)
      }

      setLoading(false)
    }

    checkUser()
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
        setError(data.error || 'Invalid invite code')
        setValidating(false)
        return
      }

      // Code is valid, show guild info
      setGuildInfo(data)
      setValidating(false)
    } catch (err) {
      console.error('Error validating code:', err)
      setError('Failed to validate invite code')
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
        setError(data.error || 'Failed to join guild')
        setJoining(false)
        return
      }

      // Success!
      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (err) {
      console.error('Error joining guild:', err)
      setError('An error occurred while joining the guild')
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
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-600/20 mx-auto">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Successfully Joined!</h2>
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="absolute top-4 left-4">
        <button
          onClick={() => router.push('/guild-select')}
          className="text-muted-foreground hover:text-foreground transition flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-600/20 mx-auto mb-4">
            <Key className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Join via Invite Code</h1>
          <p className="text-muted-foreground">
            Enter the invite code provided by your guild officer
          </p>
        </div>

        {/* Invite Code Form */}
        <Card>
          <CardHeader>
            <CardTitle>Enter Invite Code</CardTitle>
            <CardDescription>
              Your officer should have shared a 12-character code with you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleValidate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
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
                    disabled={validating || joining || !inviteCode.trim()}
                  >
                    {validating ? 'Checking...' : 'Validate'}
                  </Button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-950/50 border border-red-600/50">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Guild Info (shown after validation) */}
        {guildInfo && (
          <Card className="border-green-600/50 bg-green-950/20">
            <CardHeader>
              <CardTitle className="text-green-200">Valid Invite Code!</CardTitle>
              <CardDescription>You can join this guild</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Guild</p>
                  <p className="font-medium text-foreground">{guildInfo.guild.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Realm</p>
                  <p className="font-medium text-foreground">
                    {guildInfo.guild.realm || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faction</p>
                  <p className="font-medium text-foreground">{guildInfo.guild.faction}</p>
                </div>
                {guildInfo.uses_remaining && (
                  <div>
                    <p className="text-sm text-muted-foreground">Uses Remaining</p>
                    <p className="font-medium text-foreground">{guildInfo.uses_remaining}</p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleJoin}
                className="w-full"
                disabled={joining}
              >
                {joining ? 'Joining Guild...' : 'Join Guild'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Help Card */}
        <Card className="bg-card/50">
          <CardContent className="pt-6">
            <h3 className="font-medium text-foreground mb-2">Don't have an invite code?</h3>
            <p className="text-sm text-muted-foreground">
              Contact your guild officer to generate an invite code for you. They can find this option in the Guild Settings page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
