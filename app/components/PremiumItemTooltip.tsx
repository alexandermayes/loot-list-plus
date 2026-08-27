/**
 * The LootList+ Premium offer rendered as an in-game item tooltip at
 * legendary quality — the product's signature artifact, shared by the
 * /premium page (full) and the in-app upgrade modal (compact).
 *
 * Styling matches the ParallaxItem hover tooltips: same panel, border,
 * and WoW quality colors. `requirementMet` renders the officer line in
 * the game's unmet-requirement red for viewers who can't purchase.
 */
export default function PremiumItemTooltip({
  variant = 'full',
  requirementMet = true,
  className = '',
}: {
  variant?: 'full' | 'compact'
  requirementMet?: boolean
  className?: string
}) {
  return (
    <div className={`bg-[#1a1a2e]/95 border border-[#4a4a6a] rounded-[6px] px-5 py-4 shadow-xl backdrop-blur-sm ${className}`}>
      <p className="font-poppins font-bold text-[22px] leading-tight text-[#ff8000]">
        LootList+ Premium
      </p>
      <p className="font-poppins text-[13px] text-white mt-1.5">Binds to guild when picked up</p>
      <p className="font-poppins text-[13px] text-white">Unique-Equipped: Guild (1)</p>
      <p className={`font-poppins text-[13px] mt-1.5 ${requirementMet ? 'text-white' : 'text-[#ff2020]'}`}>
        Requires Guild Officer
      </p>
      {variant === 'full' && (
        <>
          <div className="mt-3 space-y-0.5">
            <p className="font-poppins text-[13px] text-white">+ Multiple Raid Teams</p>
            <p className="font-poppins text-[13px] text-white">+ Officer Activity Feed</p>
            <p className="font-poppins text-[13px] text-white">+ Reserve Runs</p>
          </div>
          <div className="mt-3 space-y-2">
            <p className="font-poppins text-[13px] leading-snug text-[#1eff00]">
              Equip: Split your roster into raid groups, each with its own schedule, attendance, and loot views.
            </p>
            <p className="font-poppins text-[13px] leading-snug text-[#1eff00]">
              Equip: Records every loot award, roster move, and setting change — who did it, and when.
            </p>
            <p className="font-poppins text-[13px] leading-snug text-[#1eff00]">
              Equip: Unlocks soft-reserve runs for pugs and one-off raids, with shareable join links.
            </p>
            <p className="font-poppins text-[13px] leading-snug text-[#1eff00]">
              Use: Summons priority support in the LootList+ Discord.
            </p>
            <p className="font-poppins text-[13px] leading-snug text-[#1eff00]">
              Use: Begins a 14-day free trial.
            </p>
          </div>
        </>
      )}
      <p className="font-poppins text-[13px] italic text-[#ffd100] mt-3 leading-snug">
        &quot;Keeps the servers running and the features coming — for every guild, free tier included.&quot;
      </p>
      <p className="font-poppins text-[13px] text-white mt-3">
        Sell Price: <span className="font-semibold">$39 a year</span>
        <span className="text-[#bababa]"> or $4.99 a month</span>
      </p>
    </div>
  )
}
