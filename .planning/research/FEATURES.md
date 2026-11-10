# Feature Research

**Domain:** Guild raid loot management for World of Warcraft, Forever first (Discovery mode lists, Drop Desk, consumer-grade simplicity, go-to-tool differentiators)
**Researched:** 2026-10-12
**Confidence:** MEDIUM overall. Competitor mechanics are MEDIUM (vendor pages and guides cross-checked). Forever game rules are MEDIUM to LOW (beta datamining and interviews, nothing from Blizzard patch notes on loot methods). The need-picker defaults are LOW to MEDIUM and need officer validation.

**Confidence tags used below:** [HIGH] = verified in code or in this repo. [MEDIUM] = two or more independent web sources agree. [LOW] = one web source only, or my own inference. Per the classify-confidence seam, a single `websearch` source is LOW and a cross-checked one is MEDIUM.

**Scope guard:** Nothing here covers raid assignments, positioning, roster comp or a comp optimiser. Those belong to the owner's separate tool.

---

## Headline Findings

1. **Nobody has solved "loot you cannot see yet."** That's My BiS already lists Forever with Barrow Deeps, Hyjal Summit and Onyxia's Lair but no items ([thatsmybis.com/loot](https://thatsmybis.com/loot)). Guild Order's Forever Loot Ledger runs soft reserve, hard reserve, DKP and EPGP, and says item and BiS data "will be added once raid loot is published" ([guildorder.com/games/wow_forever](https://guildorder.com/games/wow_forever)). The Forever-native addons (Arbiter Loot Council, SimpleLootCouncil) only handle the moment of the drop. Every item-based system, wishlists and soft reserves included, is blank until about reset 2. Discovery mode is a real gap in the market. [MEDIUM]
2. **When a drop happens, the item is revealed on that server, so it can be classified automatically.** Blizzard hides stats "until it drops for you or someone on your server" ([Warcraft Tavern, 2026-09-16](https://www.warcrafttavern.com/forever/news/item-stats-will-not-be-known-in-advance-for-wow-forever/)). The Drop Desk therefore never has to guess. The addon, a pasted item link or the Wowhead Forever tooltip can sort a drop into slot, armour and stats, and every guild's drops add up to a revealed-item map that only LootList+ holds. This is the strongest network-effect hook in the research. [MEDIUM; the addon's ability to read stats needs a spike]
3. **The most-repeated complaint about every system is the "why did they get it?" conversation.** Guild Order calls perceived favouritism "the number one source of loot drama" ([guildorder.com wiki](https://guildorder.com/games/wow/wiki/loot-systems)). Guilds are writing their own scoring scripts on top of TMB exports so that "'why did so-and-so get higher prio than me!?' questions can be answered" ([cr0ok/ultra README, updated 2026-08-25](https://github.com/cr0ok/ultra)). A one-sentence reason on every award, visible on a phone and in Discord, is the single most valuable trust feature. [MEDIUM]
4. **Forever tier sets are probably crafted, not dropped.** Beta datamining says the role-split tier sets are crafted from Malleable Essence of Nature, which comes only from disenchanting Barrow Deeps and Hyjal raid items. Characters may equip just one crafted tier piece at first ([Icy Veins datamine](https://www.icy-veins.com/wow-forever/news/wow-forever-crafted-tier-sets-datamined-recipes-costs-and-set-bonuses/), via search snippets because the page blocked fetches). If that holds, "Tier piece #1" should not be a row in the need picker. Tier becomes a disenchant-and-craft queue, which is a new Forever-only feature. [LOW to MEDIUM; must be checked on live raids]
5. **Treat item-agnostic loot as the historical norm, not an edge case.** DKP was invented in 1999 for EverQuest, when nobody could plan loot in advance ([Wikipedia: Dragon kill points](https://en.wikipedia.org/wiki/Dragon_kill_points)). The original EPGP addon prices items by slot and item level only: two-hand 2.0, main hand, shield and ranged 1.5, head, chest and legs 1.0, shoulders, waist, feet, hands and trinket 0.75, neck, wrist, finger, cloak, off-hand, relic and thrown 0.5 (epgp.lua slot table, read from [fxpw/EPGP](https://github.com/fxpw/EPGP)). That is a tested precedent for the PRD's slot-weighted loot cost. [HIGH for the table]

---

## Part 1: How Today's Loot Tools Work, and What Guilds Love and Hate

### Competitor landscape

| Tool | How it works | What guilds love | What guilds hate or work around | Forever status |
|------|--------------|------------------|----------------------------------|----------------|
| **That's My BiS (TMB)** | Web app with Discord sign-in. Raiders build wishlists, officers set per-item prios, and it records attendance and received loot. Exports to Gargul and in-game viewers. Ad-supported, with Patreon to remove ads ([thatsmybis.com](https://thatsmybis.com)). | Lets loot councils "sort out LC decisions before raid so people aren't standing around a corpse for 5 minutes" ([ULTRA README](https://github.com/cr0ok/ultra)). Free. Covers every flavour. | Officers still do the math when several raiders have an item ranked #1. Guilds build external scorers (ULTRA, `fgeutjens/lootscore`, `kjmagnan1s/Buzz_ThatsMyBiS`) to weigh attendance, time on list and time since last upgrade. The owner's officers called it "too clunky for officers" (brief). | Lists Forever and its three raids. No items yet, and no Discovery concept ([thatsmybis.com/loot](https://thatsmybis.com/loot)). [MEDIUM] |
| **RCLootCouncil** | The master looter starts a session. Raiders pick Mainspec/Need, Offspec/Greed, Minor Upgrade or Pass. The council votes live, the leader awards, and the trade window prompts the handover. Keeps a history and exports it ([CurseForge, 33.9M downloads, updated 2026-08-31](https://www.curseforge.com/wow/addons/rclootcouncil)). | Standard for progression loot council. Live vote state. Add-ons for wishlists (wowaudit, WowUtils) and sim gain. | Slow: every drop needs a vote, sometimes a discussion and sims, which "can pull people away from trash pulls" ([Raider.IO, 2023-09-03](https://raider.io/news/555-raiding-101-is-loot-council-right-for-us)). Trust: "the mage on loot council is biased towards mages" ([EU forums, 2022](https://eu.forums.blizzard.com/en/wow/t/loot-council-is-the-superior-way-to-do-loot-in-a-guild-change-my-mind/393104?page=3)). Guilds add rotating council seats to show it is fair ([RCLC Council Rotation](https://www.curseforge.com/wow/addons/rclootcouncil-council-rotation)). | No Forever build seen. Forever clones: Arbiter Loot Council alpha (responses BiS, Upgrade, Minor, Offspec, Pass; 128 downloads, [CurseForge](https://www.curseforge.com/wow/addons/arbiter-loot-council)) and SimpleLootCouncil ([WoWInterface](https://wowinterface.com/downloads/info27244-SimpleLootCouncil.html)). [MEDIUM] |
| **Gargul** | Master-loot addon. Imports softres.it, TMB, DFT and PRIO3. Tracks rolls and shows MS/OS. Plus-ones, boosted rolls, PackMule auto-loot, and GDKP auctions ([CurseForge, 20.7M downloads, v8.0.1 on 2026-10-03](https://www.curseforge.com/wow/addons/gargul)). | "Only the loot master needs Gargul for most features." Raiders install nothing. Highlights reserved or wishlisted items on tooltips. | No scoring of its own: it reflects whatever sheet you import. The loot council extension adds "days since their last major-upgrade award" and a set-bonus preview ([CurseForge](https://www.curseforge.com/wow/addons/gargul-loot-council-extension)), which shows the demand for history-aware decisions. | Lists a Forever flavour. LootList+ already has a Gargul DFT export (`domain/loot/gargul-dft.ts`). [MEDIUM] |
| **Softres.it** | The raid leader makes a sheet per raid and shares a link. Raiders enter character, class, spec and usually 2 or 3 soft reserves. Supports hard reserves, bonus reserves by player, role or class, locking, a "Raid Audit" of who changed what and when, hidden reserves, and export to Gargul, LootReserve and WeakAuras ([Method guide, 2026-08-17](https://www.method.gg/wow-classic/how-to-use-softres-it-for-your-raids-in-wow-classic-soft-reserve-hard-reserve-explained)). | Zero accounts and fast for pugs. "Lock the raid and prevent people from getting additional SR's behind your back!" | Needs a known item list, so it fails blind. Players complain that undeclared hard reserves are a transparency problem ([Blizzard forums](https://us.forums.blizzard.com/en/wow/t/question-on-soft-reserve-systems/581158)). In 10-player raids "soft reserve gets crowded" ([Guild Order Forever guide](https://guildorder.com/games/wow_forever/wiki/loot-systems-for-a-10-and-a-20)). | Arbiter Soft Reserve, a Forever addon, imports softres.it CSVs and plans "collect all loot at end, MS/OS/Pass, resolve by roll" ([CurseForge](https://www.curseforge.com/wow/addons/arbiter-soft-reserve)). [MEDIUM] |
| **DKP addons** | Points earned per raid are spent on items, by bid or fixed price. Born in EverQuest in 1999 ([Wikipedia](https://en.wikipedia.org/wiki/Dragon_kill_points)). | Transparent and item-agnostic, and rewards attendance. | "Veterans sit on massive point totals and outbid newer members on everything" ([Guild Order](https://guildorder.com/games/wow/wiki/loot-systems)). "people can hoard points because there is not decay" ([US forums, 2024](https://us.forums.blizzard.com/en/wow/t/alternatives-to-the-gdkp-loot-system-that-everyone-can-enjoy/1778651)). | Guild Order Loot Ledger offers DKP for Forever. [MEDIUM] |
| **EPGP addons** | Effort Points for raiding, Gear Points charged on loot, priority = EP/GP, with decay. GP comes from item level times a slot multiplier ([fxpw/EPGP epgp.lua](https://github.com/fxpw/EPGP)). | "Self-balancing - No hoarding problem. Taking loot naturally lowers your priority" ([Guild Order](https://guildorder.com/games/wow/wiki/loot-systems)). | Ignores what raiders actually want. The ratio is unintuitive. Someone has to assign GP values. | Guild Order Loot Ledger runs EPGP with wishlists. Automatic EP needs its paid tier ([guildorder.com plugin](https://guildorder.com/plugins/wow-loot-ledger)). [MEDIUM] |
| **Loot council sheets** | Spreadsheets where class leaders mark BiS and strategists set 1st, 2nd and 3rd prio ([Warcraft Tavern planner](https://www.warcrafttavern.com/community/pve/loot-council-planner-for-classic-wow/)). | Flexible, and captures context such as "gear the main tank first". | "Most of the time loot councils become heavily biased and corrupt" ([US forums, 2024](https://us.forums.blizzard.com/en/wow/t/alternatives-to-the-gdkp-loot-system-that-everyone-can-enjoy/1778651)). "Loot council is the Friends system" ([EU forums](https://eu.forums.blizzard.com/en/wow/t/loot-council-is-the-superior-way-to-do-loot-in-a-guild-change-my-mind/393104?page=3)). "In my eyes loot council is too subjective without something measurable" ([US forums, 2019](https://us.forums.blizzard.com/en/wow/t/putting-numerics-on-loot-council/141537?page=2)). | Works blind, which is why Forever guides lean on it, but it costs officers time. [MEDIUM] |
| **WoWAudit / WowUtils (Viserio)** | Retail wishlists driven by Droptimizer sims. Fixed five-step scale: Best in Slot, Major Upgrade, Sidegrade, Catalyst Only, Do not want ("there's no free-form ranking"). Officers can edit members' wishlists. RCLC column for sim gain ([WowUtils guide](https://wowutils.com/viserio-cooldowns/guide/loot-wishlists), [v5.8.1, 2026-06-30](https://wowutils.com/viserio-cooldowns/news/v5.8.1-cleaner-loot-wishlist)). | Fixed buckets are fast. Owned items are tucked away ("Got it"). Officers can fix a raider's picks. | Depends on sims and known loot tables, so neither works in Forever week one. Needs a desktop bridge app. | None for Forever. [MEDIUM] |
| **Raid-Helper** | Discord sign-up bot, about 271k servers by a third-party count ([alternative.me](https://alternative.me/discord/bots/raid-helper)). No loot feature found. | Where raiders already are. | Not a loot tool. | Its sign-ups are a roster source, not a competitor. [LOW] |
| **Guild Order** | General guild platform (Discord sign-ups, attendance, wiki, roster addon) with a Forever "Loot Ledger": SR, HR, DKP, EPGP. From $3.99/mo, 14-day trial ([guildorder.com/games/wow_forever](https://guildorder.com/games/wow_forever)). | All in one place, and already marketing to Forever guilds. | Item data waits for Blizzard to publish loot. No computed scores or explanations. "Loot Council and TMB import are on the roadmap." | **The most direct Forever competitor today.** [MEDIUM] |
| **Forever discovery addons** | Forever Guide remembers "what you looted yourself... even when no database has it yet" and asks users to export unknown drops (about 58.9k downloads, updated 2026-10-11, [CurseForge](https://www.curseforge.com/wow/addons/forever-guide)). | Raiders clearly want to see revealed loot early. | Personal only; no guild or loot-priority layer. | Validates the reveal-map idea. [MEDIUM] |

### Forever ground rules that shape features

| Fact | Source | Feature implication | Confidence |
|------|--------|---------------------|------------|
| Item stats stay hidden until the item drops on your server. "The first week will be the Wild West." No dungeon journal at first. | [Warcraft Tavern 2026-09-16](https://www.warcrafttavern.com/forever/news/item-stats-will-not-be-known-in-advance-for-wow-forever/) | Discovery mode is required at raid open. A drop is revealed the moment it happens, so classification can be automatic. | MEDIUM |
| GDKP banned on Forever servers (dev Q&A 2026-09-17). Season of Discovery precedent: warnings and suspensions, and players immediately suggested bidding with ore and herbs instead. | [Warcraft Tavern](https://www.warcrafttavern.com/forever/news/blizzard-to-not-allow-gdkp-in-wow-forever/), [MeinMMO 2024](https://mein-mmo.de/en/wow-verbietet-gdkp-community-spottet-sofort,1085277) | Never build bidding, including resource bidding. Position LootList+ as the fair, guild-first alternative Blizzard wants. | MEDIUM |
| Every boss has rare chase items in the Dragonspine Trophy mould, and they "won't be Best in Slot for every class". | [Icy Veins (search snippet)](https://www.icy-veins.com/wow-forever/news/old-raid-loot-could-be-bis-forever/) | Rare drops go outside the need list to a council card with a published reason. | LOW to MEDIUM |
| Tier sets are role-split and crafted, using Malleable Essence of Nature (3 per slot in the datamine) from disenchanted raid items. One crafted tier item equippable at first. | [Icy Veins datamine (snippet)](https://www.icy-veins.com/wow-forever/news/wow-forever-crafted-tier-sets-datamined-recipes-costs-and-set-bonuses/), [hostedgg](https://hostedgg.com/blog/wow-forever-beta-datamine) for the role split | Drops nobody needs have value (disenchant into essence). A crafted-tier queue replaces "tier token" needs. | LOW to MEDIUM |
| Addons follow Midnight's API rules. In Midnight, chat and addon messages are locked only "while there is an active raid encounter". | [kami-labs 2026-09-16](https://kami-labs.fr/en/wow-classic/wow-forever-addons-restreints-comme-sur-midnight/), [Icy Veins Midnight](https://www.icy-veins.com/wow/news/combat-addon-restrictions-eased-in-midnight/) | Collect raider responses on the web or in Discord, not through addon messages. In-game flows run between pulls only. | MEDIUM |
| Master loot is unconfirmed. Guild Order says loot methods "have not been described in Blizzard's articles". SimpleLootCouncil claims Forever "has its own Master Looter auto-loot". | [Guild Order](https://guildorder.com/games/wow_forever/wiki/loot-systems-for-a-10-and-a-20), [WoWInterface](https://wowinterface.com/downloads/info27244-SimpleLootCouncil.html) | The Drop Desk must work with or without master loot, for example by recording a trade instead of a master-loot assignment. | LOW |
| Raids open 2026-12-09 at three sizes (10, 20, 40). | [warcraft.wiki.gg Patch 1.60](https://warcraft.wiki.gg/wiki/Patch_1.60) | Five rows suit a 10-player raid's small loot pool. Guilds may want one pool per raid size. | MEDIUM |

---

## Part 2: Blind Loot, Generic-Need Taxonomies, and the Five-Row Need Picker

### How guilds have handled loot nobody could see

| Era | What guilds did | Item-agnostic? | Lesson for Discovery mode |
|-----|-----------------|----------------|---------------------------|
| EverQuest 1999, vanilla WoW 2004 | DKP: points per kill, spent on whatever dropped ([Wikipedia](https://en.wikipedia.org/wiki/Dragon_kill_points)). Item knowledge was crowdsourced by an in-game plugin that uploaded drops to Thottbot ([Wikipedia: Thottbot](https://en.wikipedia.org/wiki/Thottbot)). | Yes | Standing (attendance, history) has to work before item data exists, and crowdsourced drop data has worked before. Thottbot's founder came from the same guild that invented DKP. [MEDIUM] |
| EPGP era (TBC, Wrath) | GP set by slot and item level only (slot table above). | Yes | A slot-weighted cost is proven and needs no item list. [HIGH] |
| Suicide Kings, MS>OS +1 (Gargul plus-ones) | A position list, or rolls with a penalty for each win. | Yes | Simple, but "Inflexible, no way to prioritize upgrades by value" ([Guild Order](https://guildorder.com/games/wow/wiki/loot-systems)). Rolls are "heavily reliant on dice" ([US forums](https://us.forums.blizzard.com/en/wow/t/alternatives-to-the-gdkp-loot-system-that-everyone-can-enjoy/1778651)). [MEDIUM] |
| Loot council with RCLC responses | Decide at the corpse from responses such as Need, Minor Upgrade, Offspec and Pass. | Yes | Response buckets work blind. The cost is speed and trust. [MEDIUM] |
| Retail new tier, week one | Droptimizer sims plus council. Some guilds pre-allocate BiS trinkets before the raid. Ranking guides put "tier pieces often first, then trinkets, then rings and neck" ([search summary](https://guildorder.com/games/wow/guides/gear-progression-strategy)). | No, loot is known from the journal | The usual priority order by slot is a good source for default rankings. [LOW] |
| Season of Discovery phases | Runes were hidden, but raid loot was usually datamined from the PTR. Guilds leaned on SR and MS>OS. GDKP was banned from Phase 2. | Partly | Players handle hidden content fine, and pugs reach for SR first. A slot-based SR is the missing piece. [LOW] |
| Private-server custom raids | No reliable evidence found. | n/a | Gap, not researched further. |

### Where generic-need taxonomies break down (and the fix)

| Breakdown | Why it happens in Classic-style gear | Fix in the picker |
|-----------|--------------------------------------|-------------------|
| **Too generic: everyone collides on "Trinket".** | Every raider wants weapons and trinkets. | Ask for stats on every row, and use the existing restriction rule (weapons and trinkets restricted). [HIGH, brief] |
| **Too specific: raiders get pigeonholed.** | Hidden loot means you cannot know which axe or bow exists. | Weapon type is optional and defaults to "Any I can use". [HIGH, brief] |
| **"Main stat" does not fit Classic stats.** | Classic-style items mix Strength, Agility, Stamina, Intellect, Spirit, spell damage, healing, hit and crit. A Feral Druid wants Strength and Agility, a Paladin wants Strength or healing depending on spec, and casters split spell damage from healing. | Use five plain **stat families**: Strength, Agility, Spell damage, Healing, Tank. Jewellery, cloaks and trinkets also accept "Physical" (Strength or Agility). These map onto the existing `Role` type (`tank`, `healer`, `physical`, `caster` in `domain/loot/spec-role-mapping.ts`), with physical split into Strength and Agility. [HIGH for the existing code; MEDIUM for the design] |
| **Armour class is not strict.** | Classes often wear a lower armour type for better stats: warriors in leather or mail Agility pieces, hunters in leather, healers in cloth healing gear. | Armour defaults from class. Classes that can wear more than one type get a single "Lighter armour is fine too" toggle. |
| **Weapon hands and types matter.** | Dual-wield and two-hand specs, caster off-hand items, shields, wands and relics (idol, libram, totem), plus weapon skills and racial bonuses in Classic rules. | The weapon question asks "Which hand?" first. Type is an optional follow-up shown only to classes where it changes the decision (Rogue: dagger or sword; Warrior: sword, axe or mace). |
| **Tier tokens were mis-mapped by name.** | GH-269: 24 Naxxramas tokens misattached in 9 guilds because names were the join key (brief). | Do not hard-code Forever tier into needs until the token or crafted convention is confirmed. Join by `wowhead_id` (SEED-001). [HIGH] |
| **Chase items and situational BiS.** | Rare items "won't be Best in Slot for every class". Raid set bonuses use creature-type damage (Demons, Beasts, Undead), which makes some gear situational ([hostedgg](https://hostedgg.com/blog/wow-forever-beta-datamine)). | Rare and legendary drops skip the need match and go to a council card. Raiders opt in with one "Count me in for rare drops" toggle. |
| **Two ring and two trinket slots, unique-equipped items.** | One "Ring" need cannot express wanting two. | Allow "Ring" and "Trinket" twice. The second copy counts against the same budget. |
| **Off-spec.** | Hybrids want off-spec gear without crowding main-spec needs. | One toggle under the list: "Off-spec gear too: [Tank]". Off-spec interest ranks below every main-spec need at the Drop Desk. |

### Concrete proposal: the five-row need picker

**Goal:** a raider on a phone confirms a sensible list in about 10 seconds and finishes a custom list in under 60. Most raiders should never open a question.

**Entry points.** A Discord DM or channel button, "Set your 5 for Forever raids (1 minute)", that deep-links into the picker. A card on the Overview page. A first-run step in guild join.

**Screen (one column, top to bottom):**

1. Header: "Your top 5 for Forever raids", with the character, class and spec chip (tap to change spec).
2. Five rows, already filled in from class and spec (defaults below). Each row is one tappable card with:
   - its rank number (1 = want most),
   - the slot icon,
   - a plain sentence, for example "Two-hand weapon, Strength" or "Chest, Plate, Healing",
   - a small cost marker (Big, Medium or Standard),
   - "Move up" on the right (no drag-and-drop on mobile; drag only on desktop).
3. Budget line: "8 of 10 points used." When a pick would go over, show a plain sentence instead of a number: "That's three big picks. Swap a weapon or trinket for armour."
4. Two toggles: "Count me in for rare drops" (default on) and "Off-spec gear too" (default off; when on, it shows the off-spec role).
5. A primary button: "Looks right" when nothing has changed, "Save my 5" after edits.

**Changing a row: a bottom sheet with at most three auto-advancing questions.** Any question whose answer is already decided is skipped.

| # | Question (raider-facing) | Options | Shown when | Default |
|---|--------------------------|---------|------------|---------|
| Q1 | "Which slot?" | Icon grid in four groups. **Weapons:** Two-hand, Main hand, Off-hand weapon, Shield, Off-hand item, Ranged, Wand, Relic. **Armour:** Head, Shoulders, Chest, Wrist, Hands, Waist, Legs, Feet, Back. **Jewellery:** Neck, Ring. **Trinket.** Slots the class cannot use are hidden (for example, Shield for a Rogue). | Always | The row's current slot |
| Q2a (weapons) | "Any weapon type?" | "Any I can use" (default), or specific types filtered by class: Rogue dagger, sword, mace, fist; Warrior sword, axe, mace; Hunter ranged bow, gun, crossbow. | Weapon slots, and only for classes where type matters | Any I can use |
| Q2b (armour) | "Armour type" | Class armour type (default) plus a "Lighter armour is fine too" checkbox | Armour slots, only for Warrior, Paladin, Hunter, Shaman, Druid | Class armour type |
| Q3 | "Which stats?" | Strength, Agility, Spell damage, Healing, Tank. Neck, Ring, Back and Trinket also offer "Physical (Strength or Agility)". Only stat families the class can use are shown (for example, a Mage sees Spell damage only and Q3 is skipped). | When the class has more than one plausible family | From spec |

**Cost (budget 10 points, guild-tunable).** This keeps the brief's ordering: weapons and trinkets always restricted, then jewellery and tier, then everything else.

| Cost | Slots | Points |
|------|-------|--------|
| Big | Two-hand, Main hand, Off-hand weapon, Ranged (bow, gun, crossbow), Trinket | 3 |
| Medium | Neck, Ring, Shield, Off-hand item, Wand, Relic, Tier piece (only if the guild turns on "Tier drops as tokens") | 2 |
| Standard | Head, Shoulders, Chest, Wrist, Hands, Waist, Legs, Feet, Back | 1 |

A 10-point budget allows two Big picks with one Medium and two Standard, or one Big with three Medium and one Standard. Three Big picks never fit with five rows, which matches how loot council officers think. The ratios line up with EPGP's weighting (two-hand 2.0, main hand 1.5, jewellery 0.5), but trinkets are raised to Big because Forever's chase design and Classic practice treat them as premium. In the UI, "points" appear only in the budget line; every limit is explained in a sentence.

**How a drop matches a need (for the Drop Desk):** Main-hand needs accept Main Hand and One-Hand items. Off-hand weapon needs accept One-Hand and Off Hand weapons. Two-hand needs accept only Two-Hand. Armour must be the raider's armour type, or lighter if they ticked the box. Stats must match the family, and "Physical" matches Strength or Agility. Ring and Trinket match either copy. Drops with no matching need go to "Who's interested?" responses (feature 6 below), then main spec before off spec by standing.

**Defaults by class and spec.** Pattern: best weapon, trinket, a jewellery or secondary-weapon slot, then two high-budget armour slots, varied by spec so a guild's armour needs spread out. Every default fits the 10-point budget. These are starting points for the owner and officers to adjust. [LOW to MEDIUM]

| Spec | 1 | 2 | 3 | 4 | 5 | Armour default |
|------|---|---|---|---|---|----------------|
| Arms Warrior | Two-hand, Strength | Trinket, Physical | Ring, Physical | Chest, Plate, Strength | Hands, Plate, Strength | Plate (lighter allowed) |
| Fury Warrior | Main hand, Strength | Trinket, Physical | Ring, Physical | Chest, Plate, Strength | Hands, Plate, Strength | Plate (lighter allowed) |
| Protection Warrior | Main hand, Tank | Trinket, Tank | Shield, Tank | Chest, Plate, Tank | Legs, Plate, Tank | Plate |
| Holy Paladin | Main hand, Healing | Trinket, Healing | Ring, Healing | Chest, Plate, Healing | Legs, Plate, Healing | Plate (lighter allowed) |
| Retribution Paladin | Two-hand, Strength | Trinket, Physical | Ring, Physical | Chest, Plate, Strength | Legs, Plate, Strength | Plate (lighter allowed) |
| Protection Paladin | Main hand, Tank | Shield, Tank | Trinket, Tank | Chest, Plate, Tank | Legs, Plate, Tank | Plate |
| Restoration Shaman | Main hand, Healing | Trinket, Healing | Shield, Healing | Chest, Mail, Healing | Legs, Mail, Healing | Mail (lighter allowed) |
| Elemental Shaman | Main hand, Spell damage | Trinket, Spell damage | Ring, Spell damage | Chest, Mail, Spell damage | Head, Mail, Spell damage | Mail (lighter allowed) |
| Enhancement Shaman | Two-hand, Strength (check Forever's Windfury rework before launch) | Trinket, Physical | Ring, Physical | Chest, Mail, Strength | Hands, Mail, Strength | Mail (lighter allowed) |
| Restoration Druid | Main hand, Healing | Trinket, Healing | Off-hand item, Healing | Chest, Leather, Healing | Legs, Leather, Healing | Leather (cloth allowed) |
| Feral Druid (cat) | Two-hand, Agility | Trinket, Physical | Ring, Physical | Chest, Leather, Agility | Head, Leather, Agility | Leather |
| Guardian Druid (bear) | Two-hand, Tank | Trinket, Tank | Ring, Tank | Chest, Leather, Tank | Legs, Leather, Tank | Leather |
| Balance Druid | Main hand, Spell damage | Trinket, Spell damage | Off-hand item, Spell damage | Chest, Leather, Spell damage | Legs, Leather, Spell damage | Leather (cloth allowed) |
| Holy/Disc Priest | Main hand, Healing | Trinket, Healing | Off-hand item, Healing | Chest, Cloth, Healing | Legs, Cloth, Healing | Cloth |
| Shadow Priest | Main hand, Spell damage | Trinket, Spell damage | Wand, Spell damage | Chest, Cloth, Spell damage | Head, Cloth, Spell damage | Cloth |
| Mage | Main hand, Spell damage | Trinket, Spell damage | Ring, Spell damage | Head, Cloth, Spell damage | Legs, Cloth, Spell damage | Cloth |
| Warlock | Main hand, Spell damage | Trinket, Spell damage | Ring, Spell damage | Chest, Cloth, Spell damage | Head, Cloth, Spell damage | Cloth |
| Hunter | Ranged, Agility | Trinket, Physical | Ring, Physical | Chest, Mail, Agility | Legs, Mail, Agility | Mail (lighter allowed) |
| Rogue | Main hand, Agility (ask type: dagger or sword) | Trinket, Physical | Ring, Physical | Chest, Leather, Agility | Hands, Leather, Agility | Leather |

**Smarter defaults when gear data is available.** If the raider's equipped gear is known (addon export or Battle.net, both of which `app/api/character-gear` already supports for other expansions), rows 4 and 5 become their two lowest item-level armour slots. The copy reads: "We picked your two weakest slots."

**One list or one per raid?** The default is one Discovery list per raid team, covering all three December raids, because the needs are slot-based rather than raid-based. A guild setting, "Separate lists per raid size", supports guilds that keep separate pools for the 10 and the 20, a pattern Guild Order's Forever guide describes ([Guild Order](https://guildorder.com/games/wow_forever/wiki/loot-systems-for-a-10-and-a-20)).

**Copy rules.** No jargon such as "allocation", "bracket", "BiS" or "GP" in the picker. No em dashes. All copy needs owner sign-off, so the strings above are drafts.

---

## Feature Landscape

### Table Stakes (Users Expect These)

For a Forever guild, missing any of these makes LootList+ feel incomplete next to Guild Order, TMB plus Gargul, or an RCLC clone.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Discovery lists (five-row picker above) | Item-based lists are impossible at raid open, and nobody else offers an alternative | MEDIUM | Builds on existing loot lists, brackets and `spec-role-mapping`. Due Oct 31 |
| Drop Desk: classify a drop, order candidates, award in seconds | RCLC sets the expectation for speed at the corpse, and TMB users expect "not standing around a corpse for 5 minutes" | MEDIUM | Builds on the master sheet, awards and BLP. Due Nov 30. Must work without master loot |
| Plain one-sentence reason on every award | The "why did they get it" problem is the top source of drama | LOW | Built from the existing score breakdown |
| Audited council override | Rare drops and legendaries go to council (brief), and loot council only works with "public loot history" ([Raider.IO](https://raider.io/news/555-raiding-101-is-loot-council-right-for-us)) | LOW | Builds on audit log and award records |
| Class and armour eligibility filtering | A Mage must never top the list for plate | LOW | Existing role logic, plus armour type |
| Main spec before off spec ordering | The universal convention (RCLC, Gargul, SR fallbacks) | LOW | Toggle in the picker |
| Attendance and bad-luck protection that work before items exist | Standing has to accrue from week one (DKP precedent). BLP by slot is in the brief | MEDIUM | Depends on the five defects being fixed (addon awards lack raid_event_id, so BLP is skipped) |
| Discord announcements and lookups for Forever | Raiders live in Discord, and the bot exists (`/score`, `/priority`) | LOW | Fix the wrong Wowhead domain (defect 5). `/priority` must understand needs, not just items |
| Gargul and addon interoperability | Gargul (20.7M downloads) and RCLC (33.9M) are what master looters already run | MEDIUM | Gargul DFT export exists. Extend it to Discovery priority |
| Works for 10, 20 and 40 player raids | Forever opens three sizes at once | LOW | Pool setting per raid size |
| Zero-friction raider onboarding (Discord login, no addon required) | Gargul's "only the loot master needs it" is a loved trait, and softres.it needs no account | LOW | Discord OAuth exists |
| Simplicity pass: one obvious place for each job | The officer sidebar has up to 11 entries with overlapping names (Master Sheet, Loot Lists, Loot Submissions, Loot Management) (`app/components/Sidebar.tsx:44-227`) | MEDIUM | See the simplicity notes below |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Smart-default need list ("Looks right" in one tap) | Nobody else pre-fills a sensible blind list from spec | MEDIUM | Ranked feature 7 |
| Who's-interested responses on the phone and in Discord, not addon messages | Works whatever the addon-comms lockdown, and no install needed | MEDIUM | Ranked feature 6 |
| Revealed-item map pooled across LootList+ guilds | Data only LootList+ can produce in weeks 1 to 3 | HIGH | Ranked feature 16 |
| Auto-classify a drop from its item link | Drop Desk classification in zero taps | HIGH | Ranked feature 17 |
| Crafted-tier essence queue | Forever-only, and turns disenchants into visible fairness | MEDIUM | Ranked feature 13, conditional on verification |
| "What would it take" standing line | A retention loop: raiders come back to check | LOW | Ranked feature 3 |
| Public, shareable guild loot record | Proof of fair loot for recruiting | LOW | Ranked feature 9, opt-in |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| GDKP, gold bidding, or "resource bidding" (ore, herbs) | Popular in Classic and SoD pugs, and Gargul ships it | Banned on Forever. SoD accounts were warned and suspended ([MeinMMO](https://mein-mmo.de/en/wow-takes-it-seriously-first-players-receive-warnings-for-distributing-loot-incorrectly,1088703/)), and resource bidding is the obvious workaround Blizzard may also punish | Generic-need soft reserves for pugs (feature 12) |
| Pre-launch BiS lists or guessed Forever loot tables | Raiders want to plan | The data does not exist, and guesses would be wrong at raid open, which kills trust in "checkable proof" | Discovery needs now, auto-pin when an item is revealed |
| DKP-style bidding or spending | Feels familiar | Hoarding and veteran lock-out are the top DKP complaints | Computed standing with slot-weighted loot cost (non-spend) |
| Per-item GP values typed by officers | EPGP purists ask for it | Admin burden, and items are unknown | Fixed slot-weighted cost, guild-tunable by tier |
| Custom need-taxonomy builder | Officers like control | It is exactly the abstraction the owner wants gone, and it breaks matching | Fixed taxonomy with three toggles (lighter armour, off-spec, rare drops) |
| Mandatory addon for every raider | Rich in-game UX | Installation friction, plus addon-comms lockdown during encounters | Web, phone and Discord for raiders. Addon for the loot master only |
| In-game council voting during the encounter | RCLC habit | Locked during active encounters under Midnight rules, and slows trash | Drop Desk between pulls, on the web |
| AI or automatic awarding with no human confirm | "Just works" | Trust: the score is "a recommendation, not a mandate" (compare page) | Pre-selected winner, one tap to confirm, reason recorded |
| Sim or Droptimizer integration for Forever | Retail habit (WoWAudit, Viserio) | No reliable sims for hidden, new Forever items at launch | Upgrade size from item level (feature 19). Revisit in Known mode |
| Cross-guild player leaderboards with names | Engagement bait | Breaks the privacy constraint (no player or guild names in published data) | Aggregate realm stats with at least 10 guilds per segment |
| Raid assignments, comp or positioning | Officers ask for it | Out of scope: a separate tool | At most a read API later |

---

## Part 3: Ranked New Feature Ideas

**Score = Impact (1 to 5) x Discovery fit (1 to 5) / Complexity (LOW = 1, MEDIUM = 2, HIGH = 3).** "Switch line" is the one-line reason a raider or officer would move to LootList+ for it. Class: TS = table stakes, D = differentiator.

| Rank | Feature | Switch line | Class | Impact | Fit | Complexity | Score | Depends on (existing) | Evidence |
|------|---------|-------------|-------|--------|-----|------------|-------|-----------------------|----------|
| 1 | **Live loot thread in Discord**: the bot opens a thread per raid and posts every award with its one-sentence reason and a "see the math" link | "My raiders stop asking me why in DMs." | D | 4 | 4 | LOW | 16.0 | Discord bot, award records, score breakdown | ULTRA README on publishing prios to Discord. Raider.IO "make your loot history public" |
| 2 | **Weekly fairness digest and drought alert**: Monday post with who got what by role, longest waits, and an officer-only nudge when a regular has had nothing in N weeks | "I find out someone is about to quit over loot before they do." | D | 4 | 4 | LOW | 16.0 | `discord-bot/digest.js`, awards, attendance | "a member who quit the guild over a single item" (r/classicwow via search summary). "Why did the officer's friend get the trinket?" kills guilds ([Guild Order](https://guildorder.com/games/wow/wiki/loot-systems)) |
| 3 | **"What would it take" standing line**: "You're #3 for Trinket, Spell damage. Two more raids puts you #2." on the list, the phone and `/score` | "I can see exactly how to move up, so it feels fair." | D | 4 | 4 | LOW | 16.0 | Scoring engine, standing and interest split (PRD) | Officers want an answer that "isn't 'the officers decided'" (compare page). ULTRA's "Oh, because they have perfect attendance... Got it." |
| 4 | **First-seen reveal card**: when an item drops that no LootList+ guild has recorded before, Discord posts a "First seen" card with stats and boss | "Our Discord lights up every time we reveal something." | D | 3 | 5 | LOW | 15.0 | Award records, item metadata, bot | Forever Guide's 58.9k downloads for remembering your own drops. Greenfield's "Wild West" first week |
| 5 | **Drop Desk verdict line**: each drop shows the pre-selected winner and one sentence ("Ana: Two-hand Strength was her #1, 94% attendance, waited 3 weeks") with Award and Council buttons | "Loot takes ten seconds and nobody argues." | TS | 5 | 5 | MEDIUM | 12.5 | Drop Desk (brief), score breakdown, BLP | Raider.IO: LC "can pull people away from trash pulls". TMB "standing around a corpse" |
| 6 | **Who's-interested responses on the phone and in Discord**: for any drop with no clear match, raiders get Need, Off-spec or Pass buttons, and the Drop Desk orders by response, then standing | "No addon, no whispering, and I never miss a roll." | D | 5 | 5 | MEDIUM | 12.5 | Discord account link (OAuth), Drop Desk, bot interactions (`interactions.js`) | RCLC response buckets. Addon comms locked during encounters (Midnight rules) |
| 7 | **Smart-default need list**: the picker opens pre-filled from spec (and gear, if known), so one tap on "Looks right" finishes it | "My whole raid filled in their lists in a day." | TS | 5 | 5 | MEDIUM | 12.5 | Loot lists, brackets, `spec-role-mapping.ts` | Viserio's fixed buckets ("no free-form ranking"). The brief's quiz-picker decision |
| 8 | **Loot style presets**: three choices at setup ("Reward attendance", "Even rotation", "Officers decide, score advises") that set every scoring knob, with "Fine-tune" hidden | "Set up in two minutes without reading a manual." | TS | 4 | 3 | LOW | 12.0 | Guild settings, `DEFAULT_*` scoring config | Our own report: 84.8% of guilds change attendance defaults, so keep the knobs but put them behind presets |
| 9 | **Public guild loot record link**: an opt-in, shareable page of the guild's awards and rules, with a "names hidden" option | "Recruits trust us before they join." | D | 4 | 3 | LOW | 12.0 | Loot history, public routes (`lib/public-routes.ts`) | "Make your loot history public to guarantee transparency" (Raider.IO). Guilds "publish their loot priorities and keep a public log" (Guild Order) |
| 10 | **End-of-tier recap card**: a shareable image per raider and per guild (items, attendance, firsts) | "Raiders post it, other guilds ask what tool we use." | D | 3 | 4 | LOW | 12.0 | `html2canvas` (already a dependency), award history | Inference: share loops drive organic acquisition. LOW evidence |
| 11 | **Auto-suggest pin on reveal**: when a revealed item matches someone's generic need, they get "This matches your #2. Pin it?" and one tap converts the need to the named item | "My list fills in by itself as loot appears." | D | 4 | 5 | MEDIUM | 10.0 | Pin-to-need (brief), Discord DM, item metadata | PRD pin flow. Forever reveal mechanic |
| 12 | **Slot soft reserves for pugs and alts**: a softres-style run where you reserve "Trinket, Healing", not an item, with a shareable link and lock | "The only soft reserve that works on week one." | D | 4 | 5 | MEDIUM | 10.0 | Reserve runs (`app/api/reserve-runs`), picker taxonomy | Softres needs item lists. "soft reserve gets crowded" in 10s. GDKP banned |
| 13 | **Crafted-tier essence queue**: track disenchanted raid drops that produce Malleable Essence and show a public queue for the next crafted tier piece by role | "Everyone can see whose tier is next and why." | D | 4 | 5 | MEDIUM | 10.0 | Awards (with a disenchant outcome), standing score, award reasons | Icy Veins datamine (crafted, role-split, essence from raid disenchants). **Build only after launch data confirms it** |
| 14 | **Chase-item and legendary council card**: rare drops open a card listing opted-in raiders' standing, the council vote, and a required public one-line reason. Includes a published legendary queue | "Even our 1% drops have a paper trail." | D | 4 | 5 | MEDIUM | 10.0 | Audit log, council override (brief), loot history | Every boss has chase items. Guild Order: legendary "will be the most visible item the guild distributes", so use a published queue |
| 15 | **Zero-setup start**: create a guild from the Discord server, invite by link, pick Forever and a loot style, and you're done. Roster fills as raiders join | "From zero to raid-ready before our next Discord call." | TS | 5 | 4 | MEDIUM | 10.0 | Discord OAuth, guild invites, Forever signup (shipped) | Core value metric (7-day activated guilds). Guild Order's onboarding is the bar |
| 16 | **Forever revealed-item map (network)**: every recorded drop across LootList+ guilds builds per-boss item pages with stats, slot, first-seen date and pooled drop counts. Published only with at least 10 guilds per number, and no guild names | "LootList+ knew the loot table before Wowhead did." | D | 5 | 5 | HIGH | 8.3 | Awards, `wowhead_id` join key (SEED-001), privacy floor, public research pages | Thottbot precedent. Wowhead had "no drop-source listviews yet" (todo, 2026-09-25). Forever Guide asks users to export unknown drops |
| 17 | **Auto-classify at the corpse**: the loot master's addon reads the revealed item's slot, armour and stats and pushes it to the Drop Desk, pre-matched to needs | "I don't type anything on loot night." | D | 5 | 5 | HIGH | 8.3 | In-game addon, `app/api/addon/loot-award`, companion app | Reveal-on-drop mechanic. **Spike needed** on what the Forever addon API exposes for revealed items |
| 18 | **Gargul bridge for Discovery**: export the need-based priority order so Gargul highlights the right raiders on drop | "Keep Gargul, gain fair priority." | TS | 4 | 4 | MEDIUM | 8.0 | `domain/loot/gargul-dft.ts` | Gargul shows "DFT/TMB details on item tooltips" |
| 19 | **Upgrade size from equipped item level**: the Drop Desk shows "+9 item levels over current" per candidate, and the picker suggests the weakest slots | "Loot goes where it helps the raid most." | D | 4 | 4 | MEDIUM | 8.0 | `app/api/character-gear`, addon export | Gargul LC extension shows "equipped gear in that slot". Retail "No Droptimizer, no consideration" ([US forums](https://us.forums.blizzard.com/en/wow/t/how-are-guilds-primarily-dealing-with-raid-loot-now-a-days/1898851)) |
| 20 | **Co-officer phone Drop Desk**: a second officer runs the desk live from a phone while the loot master loots | "Our ML just loots. I hand out from my phone." | D | 3 | 4 | MEDIUM | 6.0 | Drop Desk, Supabase realtime | Loot master delegation exists in SimpleLootCouncil |
| 21 | **One-paste switch from TMB or softres.it**: import wishlists, received loot and attendance from TMB's JSON or CSV export | "We moved over without losing our history." | TS | 4 | 2 | MEDIUM | 4.0 | Sheet import (`app/(app)/sheet-import`) | TMB "Giant JSON blob" export (ULTRA README). Guild Order lists TMB import "on the roadmap" |

### Simplicity pass notes (consumer-grade, across the product)

- **One job, one place.** Officers see up to 11 sidebar entries, four of them loot-named (`Sidebar.tsx`). Proposal: raiders get **My list, Raid night, History**. Officers add **Drop Desk, Roster, Settings**. Everything else moves into those. [HIGH for the current state; LOW for the proposal, which needs a UX phase]
- **Naming mismatch:** `/master-loot` renders submission review, not master looting, and the sidebar labels it "Loot Submissions" with a master-loot icon. **Side finding (privacy):** `app/(app)/master-loot/_client.tsx:262` sends `master_loot_awarded` to PostHog with `character_name` (a player name) and `item_name` set to the review status. That conflicts with the "no player names in analytics" constraint and mislabels the event. Fold the fix into the five-defect phase. [HIGH]
- **Defaults over settings:** presets (feature 8) and the smart-default list (feature 7) mean a new guild can run loot without opening Settings.
- **Every number explains itself in one sentence** (features 3 and 5). No "bracket", "allocation" or "modifier" words in raider-facing copy.

---

## Feature Dependencies

```
Five Forever defects fixed (addon tables, BLP raid_event_id, award recompute, Discord /priority, Wowhead links)
    └──required by──> Drop Desk, BLP-by-slot, Discord loot thread, digest

SEED-001 manifest (raids + bosses, wowhead_id join key)
    └──required by──> Discovery lists (raid/boss scaffolding)
    └──required by──> Revealed-item map (16), Auto-pin (11), Auto-classify (17)

Need taxonomy (slot + hand/type + armour + stat family) + cost table
    └──required by──> Five-row picker (7) ──> Drop Desk matching (5)
    └──required by──> Slot soft reserves (12), Gargul Discovery export (18)

Standing/interest score split (PRD)
    └──required by──> Verdict line (5), "What would it take" (3), essence queue (13)

Drop Desk (5)
    └──enhanced by──> Who's-interested responses (6), Auto-classify (17), Upgrade size (19), Co-officer desk (20)
    └──feeds──> Discord loot thread (1), digest (2), reveal card (4), revealed-item map (16), recap (10)

Award records with outcome = awarded | disenchanted | council
    └──required by──> Essence queue (13), Chase card (14), Revealed-item map (16)

Revealed-item map (16) ──enhances──> Auto-pin (11), Reveal card (4), SEO for Forever items

GDKP / resource bidding ──conflicts──> Forever rules and the fair-loot positioning (never build)
Mandatory raider addon ──conflicts──> Zero-setup start (15) and Who's-interested on the phone (6)
```

### Dependency Notes

- **Drop Desk requires the five defects fixed:** addon awards that never set `raid_event_id` skip BLP, and award DELETE and PATCH never recompute BLP. A Drop Desk on top of those bugs would give wrong verdicts on the first night.
- **Revealed-item map requires `wowhead_id` as the join key:** GH-269 showed that name-keyed joins misattach items. Pooled cross-guild data magnifies any join error.
- **Essence queue requires an award "outcome" field:** today an award is assumed to go to a player. Disenchanted drops need recording because, if the datamine holds, they feed crafted tier.
- **Who's-interested (6) and the Discord thread (1) both depend on mapping Discord IDs to characters:** Discord OAuth gives the user. The character link must be certain before buttons can count as responses.
- **Auto-classify (17) conflicts with relying on in-encounter addon messages:** send data from the loot master's client to the server through the companion or export path, never addon-to-addon during a pull.

## MVP Definition

### Launch With (Discovery lists by 2026-10-31)

- [ ] Five defects fixed: everything downstream depends on correct awards and BLP
- [ ] Five-row picker with smart defaults, the cost budget and three toggles (features 7 and 8): the core Forever promise
- [ ] Need taxonomy and matching rules frozen in `domain/loot`, so the picker and Drop Desk share one source of truth
- [ ] Discord "Set your 5" deep link: activation happens where raiders are
- [ ] Loot style presets at guild setup (feature 8): the simplicity pass starts at first run

### Add Before Raids Open (Drop Desk by 2026-11-30)

- [ ] Drop Desk with verdict line, audited council override, award outcome (awarded, disenchanted, council) (feature 5)
- [ ] Who's-interested responses in Discord and on the web (feature 6)
- [ ] Discord loot thread (feature 1) and "What would it take" (feature 3)
- [ ] Chase-item council card (feature 14), since rare drops exist from the first kill
- [ ] Gargul Discovery export (feature 18), if the beta confirms master loot or trading works with Gargul on Forever

### Add After 2026-12-09 (driven by real drops)

- [ ] Reveal card (4), auto-pin (11), revealed-item map (16): need real revealed items
- [ ] Essence queue (13): only once crafted tier is confirmed live
- [ ] Auto-classify (17): after the addon API spike
- [ ] Fairness digest (2), recap card (10), public record (9), slot soft reserves (12)

### Future Consideration

- [ ] Known-mode transition (deferred per the brief, resets 3 to 6)
- [ ] TMB importer (21): most valuable for the Classic and other-flavour switching story, low Discovery fit
- [ ] Co-officer phone desk (20)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Five-row picker with smart defaults (7) | HIGH | MEDIUM | P1 |
| Loot style presets (8) | HIGH | LOW | P1 |
| Drop Desk verdict line (5) | HIGH | MEDIUM | P1 |
| Who's-interested responses (6) | HIGH | MEDIUM | P1 |
| Discord loot thread (1) | HIGH | LOW | P1 |
| "What would it take" (3) | MEDIUM | LOW | P1 |
| Chase-item council card (14) | HIGH | MEDIUM | P1 |
| Zero-setup start (15) | HIGH | MEDIUM | P1 |
| Reveal card (4) | MEDIUM | LOW | P2 |
| Auto-pin on reveal (11) | HIGH | MEDIUM | P2 |
| Revealed-item map (16) | HIGH | HIGH | P2 |
| Auto-classify at the corpse (17) | HIGH | HIGH | P2 (spike first) |
| Essence queue (13) | HIGH if confirmed | MEDIUM | P2 (conditional) |
| Gargul Discovery export (18) | MEDIUM | MEDIUM | P2 |
| Fairness digest (2) | MEDIUM | LOW | P2 |
| Slot soft reserves (12) | MEDIUM | MEDIUM | P2 |
| Upgrade size from item level (19) | MEDIUM | MEDIUM | P3 |
| Public guild loot record (9) | MEDIUM | LOW | P3 |
| Recap card (10) | MEDIUM | LOW | P3 |
| Co-officer phone desk (20) | LOW | MEDIUM | P3 |
| TMB importer (21) | MEDIUM | MEDIUM | P3 |

## Competitor Feature Analysis

| Feature | TMB + Gargul | RCLC (and Forever clones) | Guild Order Loot Ledger | Softres.it | Our Approach |
|---------|--------------|---------------------------|-------------------------|------------|--------------|
| Works before loot is known | No (item wishlists) | Yes, decides at the drop | Partly (DKP and EPGP standing; SR waits for data) | No | Discovery needs plus standing from week one |
| Computed priority with reasons | No, officers do the math | No, votes | EP/GP ratio, no reasons | No | Score plus one-sentence verdict |
| Raider effort | Build a long wishlist | Install addon, click at drop | Varies | 2 or 3 picks per raid | Confirm five pre-filled rows |
| Raid-night speed | Fast with Gargul when prio is pre-set | Slow (vote per item) | Unknown | Fast (rolls) | Pre-selected winner, one tap |
| Transparency | Prios visible in TMB | Council-only by default | Priority board | Raid Audit log | Public reason per award, Discord thread, opt-in public record |
| Forever-specific hooks | Raid placeholders | Forever builds (alpha) | GDKP off, SR/DKP/EPGP | None found | Reveal map, essence queue, chase card, slot SR |
| Price | Free (ads) | Free | From $3.99/mo | Free | Free core, Premium $4.99/mo |

## Sources

**Forever game rules**
- Warcraft Tavern, "Item Stats Will Not Be Known in Advance for WoW Forever", 2026-09-16: https://www.warcrafttavern.com/forever/news/item-stats-will-not-be-known-in-advance-for-wow-forever/ [MEDIUM]
- Warcraft Tavern, GDKP not allowed, 2026-09-17: https://www.warcrafttavern.com/forever/news/blizzard-to-not-allow-gdkp-in-wow-forever/ [MEDIUM, corroborated by Icy Veins and Inven Global headlines]
- Icy Veins, crafted tier datamine (search snippets only, fetch blocked): https://www.icy-veins.com/wow-forever/news/wow-forever-crafted-tier-sets-datamined-recipes-costs-and-set-bonuses/ [LOW to MEDIUM]
- Icy Veins, chase items (search snippet): https://www.icy-veins.com/wow-forever/news/old-raid-loot-could-be-bis-forever/ [LOW to MEDIUM]
- hostedgg beta datamine (role-split tier, dungeon set changes): https://hostedgg.com/blog/wow-forever-beta-datamine [LOW]
- warcraft.wiki.gg Patch 1.60 (raid sizes, Dec 9): https://warcraft.wiki.gg/wiki/Patch_1.60 [MEDIUM]
- kami-labs, Forever addon restrictions as Midnight, 2026-09-16: https://kami-labs.fr/en/wow-classic/wow-forever-addons-restreints-comme-sur-midnight/ [MEDIUM]
- Icy Veins, Midnight combat addon restrictions eased (search summary): https://www.icy-veins.com/wow/news/combat-addon-restrictions-eased-in-midnight/ [LOW to MEDIUM]
- MeinMMO on SoD GDKP ban and warnings (2024): https://mein-mmo.de/en/wow-verbietet-gdkp-community-spottet-sofort,1085277 and https://mein-mmo.de/en/wow-takes-it-seriously-first-players-receive-warnings-for-distributing-loot-incorrectly,1088703/ [MEDIUM]

**Competitors and tools**
- That's My BiS home and loot tables: https://thatsmybis.com and https://thatsmybis.com/loot [MEDIUM]
- ULTRA (TMB-based scorer) README: https://github.com/cr0ok/ultra [HIGH as a primary source of guild practice]
- RCLootCouncil: https://www.curseforge.com/wow/addons/rclootcouncil [MEDIUM]
- Gargul: https://www.curseforge.com/wow/addons/gargul. Loot council extension: https://www.curseforge.com/wow/addons/gargul-loot-council-extension [MEDIUM]
- Softres.it guide (Method, 2026-08-17): https://www.method.gg/wow-classic/how-to-use-softres-it-for-your-raids-in-wow-classic-soft-reserve-hard-reserve-explained [MEDIUM]
- Arbiter Loot Council and Arbiter Soft Reserve (Forever): https://www.curseforge.com/wow/addons/arbiter-loot-council and https://www.curseforge.com/wow/addons/arbiter-soft-reserve [MEDIUM]
- SimpleLootCouncil (Forever): https://wowinterface.com/downloads/info27244-SimpleLootCouncil.html [LOW]
- Forever Guide addon: https://www.curseforge.com/wow/addons/forever-guide [MEDIUM]
- Guild Order Forever page, Loot Ledger, Forever loot guide: https://guildorder.com/games/wow_forever, https://guildorder.com/plugins/wow-loot-ledger, https://guildorder.com/games/wow_forever/wiki/loot-systems-for-a-10-and-a-20 [MEDIUM]
- WowUtils / Viserio wishlists: https://wowutils.com/viserio-cooldowns/guide/loot-wishlists, https://wowutils.com/viserio-cooldowns/news/v5.8.1-cleaner-loot-wishlist [MEDIUM]
- Raid-Helper server count (third party): https://alternative.me/discord/bots/raid-helper [LOW]

**Community sentiment**
- Guild Order loot systems wiki (2026-06-30): https://guildorder.com/games/wow/wiki/loot-systems [MEDIUM]
- Raider.IO, "Is Loot Council Right For Us?" (2023-09-03): https://raider.io/news/555-raiding-101-is-loot-council-right-for-us [MEDIUM]
- Blizzard forums: GDKP alternatives (2024): https://us.forums.blizzard.com/en/wow/t/alternatives-to-the-gdkp-loot-system-that-everyone-can-enjoy/1778651 ; LC change my mind (2022): https://eu.forums.blizzard.com/en/wow/t/loot-council-is-the-superior-way-to-do-loot-in-a-guild-change-my-mind/393104?page=3 ; numerics on LC (2019): https://us.forums.blizzard.com/en/wow/t/putting-numerics-on-loot-council/141537?page=2 ; how guilds do loot now (2024): https://us.forums.blizzard.com/en/wow/t/how-are-guilds-primarily-dealing-with-raid-loot-now-a-days/1898851 ; soft reserve question: https://us.forums.blizzard.com/en/wow/t/question-on-soft-reserve-systems/581158 [MEDIUM]
- Reddit could not be fetched (blocked). r/classicwow points come only from search-engine summaries and are LOW.

**History and precedent**
- Wikipedia, Dragon kill points: https://en.wikipedia.org/wiki/Dragon_kill_points [MEDIUM]
- Wikipedia, Thottbot: https://en.wikipedia.org/wiki/Thottbot [MEDIUM]
- EPGP slot multipliers, epgp.lua (credited to the original Alkis EPGP): https://github.com/fxpw/EPGP [HIGH]

**This repo (verified)**
- `.planning/workstreams/forever/MILESTONE-BRIEF.md`, `.planning/todos/pending/2026-09-13-build-world-of-warcraft-forever-support-with-a-repeatable-ex.md`
- `app/research/wow-classic-loot-systems-2026/page.tsx` and its aggregates (median list 18 items, 84.8% tune attendance, 45.5% use BLP, 29.5% of ranked awards land in the top bracket); this document reuses those findings and does not contradict them
- `app/compare/page.tsx`, `app/components/Sidebar.tsx`, `domain/loot/spec-role-mapping.ts`, `domain/loot/gargul-dft.ts`, `discord-bot/commands.js`, `app/(app)/master-loot/_client.tsx`

## Gaps to Address

- **Master loot and trading on Forever:** unconfirmed. Verify in the beta client before committing the Drop Desk award flow and the Gargul export.
- **Crafted tier and essence rules:** datamined only. Confirm on Dec 9 before building feature 13. Keep "Tier piece" off the need picker by default.
- **Addon API for revealed items:** spike whether the Forever client returns full stats for a dropped item to the loot master's addon (feature 17).
- **Stat model:** confirm whether Forever separates "+healing" from "+spell damage" as Classic 1.x does. That decides whether Healing and Spell damage stay separate families.
- **Need-picker defaults:** officer review needed per spec (Big Yikes officers), especially Enhancement Shaman after the Windfury rework and Feral after its Windfury interaction.
- **Reddit sentiment:** Reddit blocked direct fetches. A manual pass over r/classicwow and Forever threads would strengthen the quote base.

---
*Feature research for: WoW Forever loot management (Discovery mode, Drop Desk, go-to-tool differentiators)*
*Researched: 2026-10-12*
