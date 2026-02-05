import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'

// LOW-04: Maximum request body size (5MB to accommodate screenshots)
const MAX_BODY_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: Request) {
  try {
    // Check content-length header for body size limit
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large. Maximum size is 5MB.' },
        { status: 413 }
      )
    }

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

    // Validate screenshot size if present
    if (screenshot && screenshot.length > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Screenshot too large. Maximum size is 5MB.' },
        { status: 413 }
      )
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Get user info if logged in (fast check, no network call)
    let userInfo = 'Anonymous'
    try {
      const { user } = await getAuthenticatedUser()
      if (user) {
        const displayName = user.user_metadata?.full_name ||
                           user.user_metadata?.name ||
                           'Unknown User'
        userInfo = `${displayName} (${user.id.slice(0, 8)}...)`
      }
    } catch (e) {
      // Continue without user info
    }

    // Generate a concise title using Claude (used for both Discord and Linear)
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY
    let generatedTitle = description.trim().slice(0, 80) + (description.trim().length > 80 ? '...' : '')

    if (anthropicApiKey) {
      try {
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 100,
            messages: [{
              role: 'user',
              content: `Generate a concise bug ticket title (max 10 words) for this bug report. Return ONLY the title, no quotes or extra text.\n\nBug description: ${description.trim()}`
            }]
          })
        })

        if (claudeResponse.ok) {
          const claudeData = await claudeResponse.json()
          const title = claudeData.content?.[0]?.text?.trim()
          if (title && title.length > 0 && title.length < 100) {
            generatedTitle = title
          }
        }
      } catch (claudeError) {
        console.error('Error generating title with Claude:', claudeError)
        // Fall back to default title
      }
    }

    // Extract page name from URL for cleaner display
    const pageName = pageUrl ? new URL(pageUrl).pathname || '/' : 'Unknown'

    // Create the embed
    const embed = {
      title: `[Bug Report] ${generatedTitle}`,
      description: description.trim(),
      color: 0xff8000, // Orange color
      fields: [
        {
          name: 'Page',
          value: pageName,
          inline: true
        },
        {
          name: 'Submitted By',
          value: userInfo,
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

    // Create GitHub Issue if configured
    const githubToken = process.env.GITHUB_TOKEN
    const githubRepo = process.env.GITHUB_REPO // format: owner/repo
    let githubIssueNumber = null

    if (githubToken && githubRepo) {
      try {
        // Simplify browser/OS for GitHub
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

        // Build markdown body for GitHub
        const githubBody = [
          '## Description',
          description.trim(),
          '',
          '## Details',
          `- **Submitted by:** ${userInfo}`,
          `- **Page:** ${pageUrl || 'Unknown'}`,
          browserOs ? `- **Browser/OS:** ${browserOs}` : '',
          '',
          '---',
          '*Submitted via in-app feedback*'
        ].filter(Boolean).join('\n')

        // Create issue via GitHub REST API
        const githubResponse = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${githubToken}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: generatedTitle,
            body: githubBody,
            labels: ['bug', 'user-feedback']
          })
        })

        if (githubResponse.ok) {
          const githubData = await githubResponse.json()
          githubIssueNumber = githubData.number
          console.log('GitHub issue created:', githubIssueNumber)
        } else {
          const errorText = await githubResponse.text()
          console.error('GitHub issue creation failed:', githubResponse.status, errorText)
        }
      } catch (githubError) {
        console.error('Error creating GitHub issue:', githubError)
        // Continue anyway - Discord was successful
      }
    }

    return NextResponse.json({ success: true, githubIssueNumber })
  } catch (error) {
    console.error('Error in feedback API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
