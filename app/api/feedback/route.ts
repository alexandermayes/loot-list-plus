import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK_URL

    if (!webhookUrl) {
      console.error('DISCORD_FEEDBACK_WEBHOOK_URL not configured')
      return NextResponse.json(
        { error: 'Feedback system not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { description, screenshot, pageUrl, userAgent } = body

    if (!description?.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Get user info if logged in
    let userInfo = 'Anonymous'
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const displayName = user.user_metadata?.full_name ||
                           user.user_metadata?.name ||
                           user.email?.split('@')[0] ||
                           'Unknown User'
        userInfo = `${displayName} (${user.id.slice(0, 8)}...)`
      }
    } catch (e) {
      // Continue without user info
    }

    // Create the embed
    const embed = {
      title: 'Bug Report',
      description: description.trim(),
      color: 0xff8000, // Orange color
      fields: [
        {
          name: 'Submitted By',
          value: userInfo,
          inline: true
        },
        {
          name: 'Page',
          value: pageUrl || 'Unknown',
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'LootList+ Feedback'
      }
    }

    // Add user agent as a field if present
    if (userAgent) {
      // Simplify user agent
      const browser = userAgent.includes('Chrome') ? 'Chrome' :
                      userAgent.includes('Firefox') ? 'Firefox' :
                      userAgent.includes('Safari') ? 'Safari' :
                      userAgent.includes('Edge') ? 'Edge' : 'Other'
      const os = userAgent.includes('Windows') ? 'Windows' :
                 userAgent.includes('Mac') ? 'macOS' :
                 userAgent.includes('Linux') ? 'Linux' :
                 userAgent.includes('iPhone') ? 'iOS' :
                 userAgent.includes('Android') ? 'Android' : 'Other'

      embed.fields.push({
        name: 'Browser/OS',
        value: `${browser} / ${os}`,
        inline: true
      })
    }

    // Prepare the webhook payload
    const formData = new FormData()

    // Add the embed as payload_json
    formData.append('payload_json', JSON.stringify({
      embeds: [embed]
    }))

    // Add screenshot as file attachment if present
    if (screenshot && screenshot.startsWith('data:image')) {
      try {
        // Convert base64 to buffer
        const base64Data = screenshot.split(',')[1]
        const buffer = Buffer.from(base64Data, 'base64')

        // Create a Blob from the buffer
        const blob = new Blob([buffer], { type: 'image/png' })
        formData.append('files[0]', blob, 'screenshot.png')

        // Update embed to reference the attachment
        formData.set('payload_json', JSON.stringify({
          embeds: [{
            ...embed,
            image: {
              url: 'attachment://screenshot.png'
            }
          }]
        }))
      } catch (e) {
        console.error('Failed to process screenshot:', e)
        // Continue without screenshot
      }
    }

    // Send to Discord webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Discord webhook error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to send feedback to Discord' },
        { status: 500 }
      )
    }

    // Create Linear ticket if configured
    const linearApiKey = process.env.LINEAR_API_KEY
    const linearTeamId = process.env.LINEAR_TEAM_ID
    let linearIssueId = null

    if (linearApiKey && linearTeamId) {
      try {
        // Simplify browser/OS for Linear
        let browserOs = ''
        if (userAgent) {
          const browser = userAgent.includes('Chrome') ? 'Chrome' :
                          userAgent.includes('Firefox') ? 'Firefox' :
                          userAgent.includes('Safari') ? 'Safari' :
                          userAgent.includes('Edge') ? 'Edge' : 'Other'
          const os = userAgent.includes('Windows') ? 'Windows' :
                     userAgent.includes('Mac') ? 'macOS' :
                     userAgent.includes('Linux') ? 'Linux' :
                     userAgent.includes('iPhone') ? 'iOS' :
                     userAgent.includes('Android') ? 'Android' : 'Other'
          browserOs = `${browser} / ${os}`
        }

        // Build markdown description for Linear
        const linearDescription = [
          description.trim(),
          '',
          '---',
          `**Submitted by:** ${userInfo}`,
          `**Page:** ${pageUrl || 'Unknown'}`,
          browserOs ? `**Browser/OS:** ${browserOs}` : '',
        ].filter(Boolean).join('\n')

        // Create issue via Linear GraphQL API
        const linearResponse = await fetch('https://api.linear.app/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': linearApiKey
          },
          body: JSON.stringify({
            query: `
              mutation CreateIssue($title: String!, $description: String!, $teamId: String!) {
                issueCreate(input: {
                  title: $title,
                  description: $description,
                  teamId: $teamId
                }) {
                  success
                  issue {
                    id
                    identifier
                    url
                  }
                }
              }
            `,
            variables: {
              title: `Bug Report: ${description.trim().slice(0, 100)}${description.trim().length > 100 ? '...' : ''}`,
              description: linearDescription,
              teamId: linearTeamId
            }
          })
        })

        const linearData = await linearResponse.json()

        if (linearData.data?.issueCreate?.success) {
          linearIssueId = linearData.data.issueCreate.issue.identifier
          console.log('Linear issue created:', linearIssueId)
        } else {
          console.error('Linear issue creation failed:', linearData.errors || linearData)
        }
      } catch (linearError) {
        console.error('Error creating Linear issue:', linearError)
        // Continue anyway - Discord was successful
      }
    }

    return NextResponse.json({ success: true, linearIssueId })
  } catch (error) {
    console.error('Error in feedback API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
