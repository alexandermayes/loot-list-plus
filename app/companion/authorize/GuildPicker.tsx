import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Heading, Text } from '@/components/ui/typography'
import { SYNC_TOKEN_DEFAULT_DAYS } from '@/lib/addon/sync-tokens'

/**
 * Copy sign-off (GH #300, signed off 2026-09-28): these strings ship exactly
 * as written, character for character, and are the only user-facing text on
 * this page. C-05's day count is rendered from SYNC_TOKEN_DEFAULT_DAYS so
 * the sentence can never drift from the real token lifetime.
 */
export const COMPANION_AUTHORIZE_COPY = {
  title: 'Connect the companion app ∙ LootList+',
  chooseGuildHeading: 'Choose a guild to sync',
  chooseGuildIntro:
    "The LootList+ companion app will sync loot lists, priorities, loot awards and attendance for the guild you choose. It can't reach your other guilds.",
  officerGuildsLabel: "Guilds where you're an officer",
  finePrint: `This connection lasts ${SYNC_TOKEN_DEFAULT_DAYS} days. Choosing a guild replaces any earlier companion connection you made for it. To cancel, close this window.`,
  noGuildsHeading: 'No guilds to connect',
  noGuildsBody:
    "The companion app needs officer access, and you aren't an officer in any guild yet. Ask your guild master to promote you, then log in again from the companion app.",
  invalidHeading: "This login link doesn't work",
  invalidBody: 'Start the login again from the LootList+ companion app.',
} as const

export interface CompanionGuild {
  id: string
  name: string
  realm: string | null
}

export type GuildPickerState =
  | { kind: 'invalid' }
  | { kind: 'no_guilds' }
  | { kind: 'pick'; guilds: CompanionGuild[]; formAction: string }

function headingFor(state: GuildPickerState): string {
  if (state.kind === 'invalid') return COMPANION_AUTHORIZE_COPY.invalidHeading
  if (state.kind === 'no_guilds') return COMPANION_AUTHORIZE_COPY.noGuildsHeading
  return COMPANION_AUTHORIZE_COPY.chooseGuildHeading
}

function BodyContent({ state }: { state: GuildPickerState }) {
  if (state.kind === 'invalid') {
    return <Text color="muted">{COMPANION_AUTHORIZE_COPY.invalidBody}</Text>
  }

  if (state.kind === 'no_guilds') {
    return <Text color="muted">{COMPANION_AUTHORIZE_COPY.noGuildsBody}</Text>
  }

  return (
    <div className="flex flex-col gap-4">
      <Text color="muted">{COMPANION_AUTHORIZE_COPY.chooseGuildIntro}</Text>
      <Text size="sm" weight="semibold" color="secondary" as="span">{COMPANION_AUTHORIZE_COPY.officerGuildsLabel}</Text>
      <form method="post" action={state.formAction}>
        <ul className="flex flex-col gap-2">
          {state.guilds.map((guild) => (
            <li key={guild.id}>
              <Button
                type="submit"
                name="guild_id"
                value={guild.id}
                variant="outline"
                className="h-auto w-full flex-col items-start gap-0 py-3"
              >
                <span>{guild.name}</span>
                {guild.realm && (
                  <Text as="span" size="sm" color="muted">
                    {guild.realm}
                  </Text>
                )}
              </Button>
            </li>
          ))}
        </ul>
      </form>
      <Text size="sm" color="muted">
        {COMPANION_AUTHORIZE_COPY.finePrint}
      </Text>
    </div>
  )
}

/** Presentational — the async server component in page.tsx resolves state and does all data fetching. */
export default function GuildPicker({ state }: { state: GuildPickerState }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Heading level={1}>{headingFor(state)}</Heading>
        </CardHeader>
        <CardContent>
          <BodyContent state={state} />
        </CardContent>
      </Card>
    </main>
  )
}
