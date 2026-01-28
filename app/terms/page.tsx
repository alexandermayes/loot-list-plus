import { Heading, Text } from '@/components/ui/typography'
import type { Metadata } from 'next'
import LegalNav from '@/app/components/LegalNav'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for LootList+, the loot management system for World of Warcraft Classic guilds.',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <LegalNav />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Heading level={1} className="mb-2">
          Terms of Service
        </Heading>
        <Text color="secondary" className="mb-8">
          Last updated: January 27, 2025
        </Text>

        <div className="space-y-8 text-foreground">
          <section className="space-y-4">
            <Heading level={2}>1. Acceptance of Terms</Heading>
            <Text>
              By accessing or using LootList+ (&quot;the Service&quot;), operated by Alexander
              &quot;Zev&quot; Mayes (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree
              to be bound by these Terms of Service. If you do not agree to these terms, please do
              not use the Service.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>2. Description of Service</Heading>
            <Text>
              LootList+ is a guild loot management tool for World of Warcraft Classic. The Service
              allows users to:
            </Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>Create and manage World of Warcraft character profiles</Text>
              </li>
              <li>
                <Text>Submit and track loot priority lists</Text>
              </li>
              <li>
                <Text>Track raid attendance</Text>
              </li>
              <li>
                <Text>Manage guild memberships and settings</Text>
              </li>
              <li>
                <Text>Coordinate loot distribution with guild officers</Text>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <Heading level={2}>3. Account Registration</Heading>
            <Text>
              To use LootList+, you must authenticate using Discord OAuth. By connecting your
              Discord account, you authorize us to access certain information from your Discord
              profile as described in our Privacy Policy.
            </Text>
            <Text>You agree to:</Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>Provide accurate information about your characters and guild memberships</Text>
              </li>
              <li>
                <Text>
                  Maintain the security of your Discord account credentials (we never have access to
                  your password)
                </Text>
              </li>
              <li>
                <Text>
                  Accept responsibility for all activities that occur through your account
                </Text>
              </li>
              <li>
                <Text>Notify us immediately of any unauthorized use of your account</Text>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <Heading level={2}>4. Acceptable Use</Heading>
            <Text>You agree NOT to:</Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>
                  Use the Service for any unlawful purpose or in violation of any applicable laws
                </Text>
              </li>
              <li>
                <Text>
                  Impersonate another person or misrepresent your guild membership or character
                  ownership
                </Text>
              </li>
              <li>
                <Text>
                  Attempt to gain unauthorized access to the Service, other accounts, or computer
                  systems
                </Text>
              </li>
              <li>
                <Text>Interfere with or disrupt the Service or servers connected to the Service</Text>
              </li>
              <li>
                <Text>
                  Use automated means (bots, scrapers, etc.) to access the Service without our
                  express permission
                </Text>
              </li>
              <li>
                <Text>Abuse, harass, or threaten other users of the Service</Text>
              </li>
              <li>
                <Text>
                  Circumvent any rate limiting or security measures implemented by the Service
                </Text>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <Heading level={2}>5. Intellectual Property</Heading>
            <Text>
              LootList+ and its original content, features, and functionality are owned by Alexander
              &quot;Zev&quot; Mayes and are protected by copyright, trademark, and other
              intellectual property laws.
            </Text>
            <Text>
              World of Warcraft, Blizzard Entertainment, and all related names, logos, and images
              are trademarks or registered trademarks of Blizzard Entertainment, Inc. LootList+ is
              not affiliated with or endorsed by Blizzard Entertainment.
            </Text>
            <Text>
              Item data, boss information, and game-related content displayed on the Service is
              derived from publicly available World of Warcraft game data and community resources.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>6. Guild Management</Heading>
            <Text>
              Guild Masters and Officers have elevated permissions within their guilds on LootList+,
              including the ability to:
            </Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>Approve or reject loot submissions</Text>
              </li>
              <li>
                <Text>Manage guild settings and raid configurations</Text>
              </li>
              <li>
                <Text>View member loot lists and attendance records</Text>
              </li>
              <li>
                <Text>Remove members from the guild</Text>
              </li>
            </ul>
            <Text>
              We are not responsible for decisions made by guild officers regarding loot
              distribution or membership. Disputes between guild members should be resolved within
              your guild or Discord community.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>7. Service Availability</Heading>
            <Text>
              We strive to maintain the availability of LootList+, but we do not guarantee
              uninterrupted access. The Service may be temporarily unavailable due to:
            </Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>Scheduled or emergency maintenance</Text>
              </li>
              <li>
                <Text>Technical difficulties or server issues</Text>
              </li>
              <li>
                <Text>Circumstances beyond our reasonable control</Text>
              </li>
            </ul>
            <Text>
              We reserve the right to modify, suspend, or discontinue the Service at any time
              without prior notice.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>8. Disclaimer of Warranties</Heading>
            <Text>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
              WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
              IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT.
            </Text>
            <Text>
              We do not warrant that the Service will be error-free, secure, or available at all
              times. We do not warrant the accuracy or completeness of any information provided
              through the Service.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>9. Limitation of Liability</Heading>
            <Text>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, LOOTLIST+ AND ITS OPERATOR SHALL NOT BE LIABLE
              FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
              BUT NOT LIMITED TO LOSS OF DATA, LOSS OF PROFITS, OR LOSS OF GOODWILL, ARISING OUT OF
              OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
            </Text>
            <Text>
              Our total liability for any claims arising from your use of the Service shall not
              exceed the amount you paid us in the twelve (12) months preceding the claim, or $100
              USD, whichever is greater.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>10. Indemnification</Heading>
            <Text>
              You agree to indemnify, defend, and hold harmless LootList+ and its operator from any
              claims, damages, losses, liabilities, and expenses (including reasonable
              attorneys&apos; fees) arising out of or related to your use of the Service, your
              violation of these Terms, or your violation of any rights of another.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>11. Termination</Heading>
            <Text>
              We may terminate or suspend your access to the Service immediately, without prior
              notice or liability, for any reason, including if you breach these Terms.
            </Text>
            <Text>
              You may stop using the Service at any time. To delete your account and associated
              data, please contact us at{' '}
              <a href="mailto:zev@lootlistplus.com" className="text-accent hover:underline">
                zev@lootlistplus.com
              </a>
              .
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>12. Changes to Terms</Heading>
            <Text>
              We reserve the right to modify these Terms at any time. We will notify users of
              significant changes by posting a notice on the Service or through other reasonable
              means. Your continued use of the Service after changes are posted constitutes your
              acceptance of the modified Terms.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>13. Governing Law</Heading>
            <Text>
              These Terms shall be governed by and construed in accordance with the laws of the
              United States, without regard to its conflict of law provisions.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>14. Contact Information</Heading>
            <Text>
              If you have any questions about these Terms, please contact us at:
            </Text>
            <Text>
              <strong>LootList+</strong>
              <br />
              Alexander &quot;Zev&quot; Mayes
              <br />
              Email:{' '}
              <a href="mailto:zev@lootlistplus.com" className="text-accent hover:underline">
                zev@lootlistplus.com
              </a>
            </Text>
          </section>
        </div>
      </div>
    </div>
  )
}
