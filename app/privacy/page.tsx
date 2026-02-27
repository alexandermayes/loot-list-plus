import { Heading, Text } from '@/components/ui/typography'
import type { Metadata } from 'next'
import LegalNav from '@/app/components/LegalNav'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for LootList+. Learn how we collect, use, and protect your data.',
  alternates: {
    canonical: 'https://www.getlootlist.com/privacy',
  },
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <LegalNav />
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Heading level={1} className="mb-2">
          Privacy Policy
        </Heading>
        <Text color="secondary" className="mb-8">
          Last updated: February 6, 2026
        </Text>

        <div className="space-y-8 text-foreground">
          <section className="space-y-4">
            <Heading level={2}>1. Introduction</Heading>
            <Text>
              LootList+ (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), operated by the
              LootList+ Team, is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use
              our loot management service for World of Warcraft Classic.
            </Text>
            <Text>
              By using LootList+, you consent to the data practices described in this policy. If you
              do not agree with our policies, please do not use the Service.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>2. Information We Collect</Heading>

            <Heading level={3} className="mt-6">
              2.1 Information from Discord OAuth
            </Heading>
            <Text>
              When you log in via Discord, we request the minimum permissions needed to provide the
              Service. We collect:
            </Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>Discord user ID</Text>
              </li>
              <li>
                <Text>Discord username and display name</Text>
              </li>
              <li>
                <Text>Discord avatar URL</Text>
              </li>
              <li>
                <Text>List of Discord servers you belong to (to match guild memberships)</Text>
              </li>
            </ul>
            <Text className="mt-4">
              We do NOT request access to your email address from Discord. Email is optional and
              only collected if you choose to provide it directly within LootList+.
            </Text>

            <Heading level={3} className="mt-6">
              2.2 Information You Provide
            </Heading>
            <Text>When using the Service, you may provide:</Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>
                  Character information (name, realm, class, specialization, level)
                </Text>
              </li>
              <li>
                <Text>Guild membership information</Text>
              </li>
              <li>
                <Text>Loot priority lists and item preferences (up to 50 ranked items)</Text>
              </li>
              <li>
                <Text>Equipped gear data imported from external tools like WowSims</Text>
              </li>
              <li>
                <Text>Profile information (display name, bio)</Text>
              </li>
              <li>
                <Text>Privacy and notification preferences</Text>
              </li>
            </ul>

            <Heading level={3} className="mt-6">
              2.3 Information Collected Automatically
            </Heading>
            <Text>We automatically collect:</Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>IP address (for rate limiting and security purposes)</Text>
              </li>
              <li>
                <Text>Browser type and version</Text>
              </li>
              <li>
                <Text>Device information</Text>
              </li>
              <li>
                <Text>Usage data (pages visited, features used, timestamps)</Text>
              </li>
              <li>
                <Text>Session information</Text>
              </li>
            </ul>

            <Heading level={3} className="mt-6">
              2.4 Guild Activity Data
            </Heading>
            <Text>When participating in a guild, we track:</Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>Raid attendance records</Text>
              </li>
              <li>
                <Text>Loot submission history</Text>
              </li>
              <li>
                <Text>Loot approval/rejection status</Text>
              </li>
              <li>
                <Text>Guild membership dates and roles</Text>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <Heading level={2}>3. How We Use Your Information</Heading>
            <Text>We use the information we collect to:</Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>Provide, operate, and maintain the Service</Text>
              </li>
              <li>
                <Text>Authenticate your identity via Discord</Text>
              </li>
              <li>
                <Text>Match you with your World of Warcraft guild</Text>
              </li>
              <li>
                <Text>Process and manage your loot submissions</Text>
              </li>
              <li>
                <Text>Track raid attendance for your guild</Text>
              </li>
              <li>
                <Text>Display relevant information to your guild officers and members</Text>
              </li>
              <li>
                <Text>Communicate with you about service updates (if you opt in)</Text>
              </li>
              <li>
                <Text>Enforce our Terms of Service and prevent abuse</Text>
              </li>
              <li>
                <Text>Improve and optimize the Service</Text>
              </li>
              <li>
                <Text>Protect against security threats and unauthorized access</Text>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <Heading level={2}>4. Information Sharing and Disclosure</Heading>

            <Heading level={3} className="mt-6">
              4.1 With Your Guild Members
            </Heading>
            <Text>The following information may be visible to members of guilds you join:</Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>Your character name, class, and specialization</Text>
              </li>
              <li>
                <Text>Your loot submissions and priorities</Text>
              </li>
              <li>
                <Text>Your attendance records (subject to your privacy settings)</Text>
              </li>
              <li>
                <Text>Your profile information (subject to your privacy settings)</Text>
              </li>
            </ul>
            <Text>
              Guild officers have additional visibility into your loot history and attendance
              statistics to manage loot distribution fairly.
            </Text>

            <Heading level={3} className="mt-6">
              4.2 With Third-Party Service Providers
            </Heading>
            <Text>We share information with third-party services that help us operate:</Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>
                  <strong>Supabase</strong> - Database hosting and authentication
                </Text>
              </li>
              <li>
                <Text>
                  <strong>Vercel</strong> - Application hosting and deployment
                </Text>
              </li>
              <li>
                <Text>
                  <strong>Discord</strong> - Authentication provider
                </Text>
              </li>
              <li>
                <Text>
                  <strong>Upstash</strong> - Rate limiting services
                </Text>
              </li>
            </ul>
            <Text>
              These providers are contractually obligated to protect your information and use it
              only for the purposes we specify.
            </Text>

            <Heading level={3} className="mt-6">
              4.3 Legal Requirements
            </Heading>
            <Text>We may disclose your information if required to do so by law or in response to:</Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>Valid legal processes (subpoenas, court orders)</Text>
              </li>
              <li>
                <Text>Requests from law enforcement</Text>
              </li>
              <li>
                <Text>Protection of our rights, property, or safety</Text>
              </li>
              <li>
                <Text>Investigation of potential Terms of Service violations</Text>
              </li>
            </ul>

            <Heading level={3} className="mt-6">
              4.4 What We Do NOT Do
            </Heading>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>We do NOT sell your personal information to third parties</Text>
              </li>
              <li>
                <Text>We do NOT share your data with advertisers</Text>
              </li>
              <li>
                <Text>We do NOT use your data for targeted advertising</Text>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <Heading level={2}>5. Data Storage and Security</Heading>
            <Text>
              Your data is stored on secure servers provided by Supabase, which uses
              industry-standard security measures including:
            </Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>Encryption of data in transit (TLS/SSL)</Text>
              </li>
              <li>
                <Text>Encryption of data at rest</Text>
              </li>
              <li>
                <Text>Row-level security policies to isolate user data</Text>
              </li>
              <li>
                <Text>Regular security audits and updates</Text>
              </li>
            </ul>
            <Text>
              While we implement reasonable security measures, no method of transmission over the
              Internet or electronic storage is 100% secure. We cannot guarantee absolute security
              of your data.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>6. Your Privacy Controls</Heading>
            <Text>
              LootList+ provides privacy settings that allow you to control the visibility of your
              information:
            </Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>
                  <strong>Email visibility</strong> - Control whether your email is visible to guild
                  members
                </Text>
              </li>
              <li>
                <Text>
                  <strong>Discord username visibility</strong> - Control whether your Discord
                  username is displayed
                </Text>
              </li>
              <li>
                <Text>
                  <strong>Attendance stats visibility</strong> - Control whether your attendance
                  statistics are visible
                </Text>
              </li>
              <li>
                <Text>
                  <strong>Loot history visibility</strong> - Control whether your loot history is
                  visible to other members
                </Text>
              </li>
            </ul>
            <Text>
              You can adjust these settings at any time from your profile settings page.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>7. Your Rights</Heading>
            <Text>Depending on your location, you may have the following rights:</Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>
                  <strong>Access</strong> - Request a copy of the personal data we hold about you
                </Text>
              </li>
              <li>
                <Text>
                  <strong>Correction</strong> - Request correction of inaccurate personal data
                </Text>
              </li>
              <li>
                <Text>
                  <strong>Deletion</strong> - Request deletion of your personal data
                </Text>
              </li>
              <li>
                <Text>
                  <strong>Portability</strong> - Request a copy of your data in a portable format
                </Text>
              </li>
              <li>
                <Text>
                  <strong>Objection</strong> - Object to certain processing of your data
                </Text>
              </li>
            </ul>
            <Text>
              To exercise any of these rights, please contact us at{' '}
              <a href="mailto:info@lootlistplus.com" className="text-accent hover:underline">
                info@lootlistplus.com
              </a>
              .
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>8. Data Retention</Heading>
            <Text>We retain your information for as long as:</Text>
            <ul className="ml-6 list-disc space-y-2">
              <li>
                <Text>Your account is active</Text>
              </li>
              <li>
                <Text>Necessary to provide you with the Service</Text>
              </li>
              <li>
                <Text>Required to comply with legal obligations</Text>
              </li>
              <li>
                <Text>Necessary to resolve disputes and enforce agreements</Text>
              </li>
            </ul>
            <Text>
              When you delete your account, we will delete or anonymize your personal data within 30
              days, except where we are required by law to retain it or where it is necessary for
              legitimate business purposes (such as maintaining guild loot history records).
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>9. Children&apos;s Privacy</Heading>
            <Text>
              LootList+ is not directed at children under 13 years of age. We do not knowingly
              collect personal information from children under 13. If you believe we have collected
              information from a child under 13, please contact us immediately at{' '}
              <a href="mailto:info@lootlistplus.com" className="text-accent hover:underline">
                info@lootlistplus.com
              </a>{' '}
              and we will take steps to delete that information.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>10. International Data Transfers</Heading>
            <Text>
              Your information may be transferred to and processed in countries other than your
              country of residence. These countries may have data protection laws that are different
              from the laws of your country.
            </Text>
            <Text>
              By using LootList+, you consent to the transfer of your information to the United
              States and other countries where our service providers operate.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>11. Third-Party Links</Heading>
            <Text>
              The Service may contain links to third-party websites, including Wowhead for item
              tooltips and Discord for authentication. We are not responsible for the privacy
              practices of these third-party sites. We encourage you to review their privacy
              policies.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>12. Changes to This Policy</Heading>
            <Text>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by posting a notice on the Service or through other reasonable means. The
              &quot;Last updated&quot; date at the top of this policy indicates when it was last
              revised.
            </Text>
            <Text>
              Your continued use of the Service after changes are posted constitutes your acceptance
              of the updated Privacy Policy.
            </Text>
          </section>

          <section className="space-y-4">
            <Heading level={2}>13. Contact Us</Heading>
            <Text>
              If you have any questions about this Privacy Policy or our data practices, please
              contact us at:
            </Text>
            <Text>
              <strong>LootList+ Team</strong>
              <br />
              Email:{' '}
              <a href="mailto:info@lootlistplus.com" className="text-accent hover:underline">
                info@lootlistplus.com
              </a>
            </Text>
          </section>

          <section className="mt-12 rounded-lg border border-border bg-background-subtle p-6">
            <Heading level={3}>Summary of Key Points</Heading>
            <ul className="mt-4 ml-6 list-disc space-y-2">
              <li>
                <Text>We collect information you provide and data from Discord OAuth</Text>
              </li>
              <li>
                <Text>Your loot lists and attendance are visible to your guild members</Text>
              </li>
              <li>
                <Text>We use Supabase, Vercel, and Discord to provide the Service</Text>
              </li>
              <li>
                <Text>We do NOT sell your data or use it for advertising</Text>
              </li>
              <li>
                <Text>You can control visibility of your information via privacy settings</Text>
              </li>
              <li>
                <Text>You can request deletion of your account and data at any time</Text>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
