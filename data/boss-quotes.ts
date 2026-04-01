/**
 * Iconic boss quotes from WoW raids.
 * Keyed by boss name (must match boss_name from loot_items table).
 */
export const BOSS_QUOTES: Record<string, string> = {
  // Classic
  'Ragnaros': 'BY FIRE BE PURGED!',
  'Nefarian': 'Let the games begin!',
  'Onyxia': 'How fortuitous. Usually, I must leave my lair to feed.',
  "C'Thun": 'Your heart will explode.',
  'Kel\'Thuzad': 'Minions, servants, soldiers of the cold dark, obey the call of Kel\'Thuzad!',
  'Hakkar': 'PRIDE HERALDS THE END OF YOUR WORLD. COME, MORTALS!',
  'Ossirian the Unscarred': 'You are terminated.',

  // TBC
  'Illidan Stormrage': 'You are not prepared!',
  'Prince Malchezaar': 'All realities, all dimensions are open to me!',
  'Gruul the Dragonkiller': 'Come... and die.',
  'Magtheridon': 'I... am... unleashed!',
  'Lady Vashj': 'I\'ll split you from stem to stern!',
  'Kael\'thas Sunstrider': 'Tempest Keep was merely a setback!',
  'Archimonde': 'All of your efforts have been in vain.',
  'Mother Shahraz': 'So... business or pleasure?',
  'Akama': 'The time has come to face the Betrayer.',
  'High Warlord Naj\'entus': 'You will die in the name of Lady Vashj!',
  'Supremus': 'No rest for the weary.',
  'Shade of Akama': 'The Betrayer no longer needs you.',
  'Teron Gorefiend': 'I have use for you!',
  'Gurtogg Bloodboil': 'Horde will... crush you.',
  'Reliquary of Souls': 'Pain and suffering are all that await you!',
  'Illhoof': 'Ah, you\'re just in time. The rituals are about to begin!',
  'Netherspite': 'I will not be denied!',
  'Nightbane': 'Insects! You dare disturb my slumber?',
  'Void Reaver': 'Alert! You are marked for termination!',
  'Al\'ar': 'Rise from the ashes.',
  'High Astromancer Solarian': 'Tal anu\'men no sin\'dorei!',
  'Morogrim Tidewalker': 'You will drown in blood!',
  'Leotheras the Blind': 'Finally, my banishment ends!',
  'Fathom-Lord Karathress': 'Guards, attend me!',
  'Hydross the Unstable': 'I cannot allow you to interfere!',
  'Doom Lord Kazzak': 'All mortals will perish!',

  // Wrath of the Lich King
  'The Lich King': 'Frostmourne hungers.',
  'Yogg-Saron': 'BOW DOWN BEFORE THE GOD OF DEATH.',
  'Algalon the Observer': 'See your world through my eyes.',
  'Sindragosa': 'You are fools to have come to this place!',
  'Professor Putricide': 'Good news, everyone!',
  'Blood-Queen Lana\'thel': 'You have made an... unwise... decision.',
  'Valithria Dreamwalker': 'Heroes, lend me your aid!',
  'Festergut': 'Fun time!',
  'Rotface': 'Weeee!',
  'Lord Marrowgar': 'BONE STORM!',
  'Lady Deathwhisper': 'What is this disturbance?',
  'Deathbringer Saurfang': 'By my father\'s name, the thirst shall be sated.',
  'Anub\'arak': 'I was king of this empire once, long ago.',
  'Hodir': 'I will put an end to your deceit!',
  'Thorim': 'Interlopers! You mortals shall pay for this intrusion!',
  'Freya': 'The Conservatory must be protected!',
  'Mimiron': 'Oh my! I wasn\'t expecting company!',
  'General Vezax': 'Your destruction will herald a new age of suffering!',
  'XT-002 Deconstructor': 'New toys? For me?!',
  'Kologarn': 'None shall pass!',
  'Auriaya': 'Some things are better left alone!',
  'Ignis the Furnace Master': 'I will burn away your impurities!',
  'Razorscale': 'The skies belong to me!',
  'Flame Leviathan': 'Systems online. Activating defense matrix.',
  'Malygos': 'My patience has reached its limit.',
  'Sartharion': 'It is my charge to oversee this domain.',
  'Koralon the Flame Watcher': 'Burn!',
  'Toravon the Ice Watcher': 'Freeze!',

  // Cataclysm
  'Cho\'gall': 'Brother, it has begun.',
  'Al\'Akir': 'Winds! Obey my command!',
  'Sinestra': 'The brood shall consume you!',
  'Baleroc': 'You are forbidden from entering this place!',
  'Majordomo Staghelm': 'The master\'s kingdom is vast.',
  'Alysrazor': 'I serve a new master now!',
  'Beth\'tilac': 'The web trembles.',
  'Lord Rhyolith': 'Stomp!',
  'Shannox': 'Yes... I smell them too, Riplimb.',
  'Morchok': 'No mortal shall turn me from my task!',
  'Ultraxion': 'I am the beginning of the end!',
  'Warmaster Blackhorn': 'All hands on deck!',
  'Spine of Deathwing': 'The plates! Rip them off!',
  'Madness of Deathwing': 'I AM DEATHWING. THE DESTROYER. THE END OF ALL THINGS.',
  'Hagara the Stormbinder': 'You face the might of the Horde!',
  'Yor\'sahj the Unsleeping': 'Iilth qi\'uothk shn\'ma yeh\'glu Shath\'Yar!',
  'Warlord Zon\'ozz': 'Zzof Shuul wah.',

  // Mists of Pandaria
  'Will of the Emperor': 'The will of the Emperor shall be done!',
  'Elegon': 'The engine of creation must be preserved!',
  'Sha of Fear': 'You will know true fear!',
  'Lei Shi': 'No... no... get away from me!',
  'Tsulong': 'I thank you, strangers.',
  'Protectors of the Endless': 'The waters must be protected!',
  'Jin\'rokh the Breaker': 'Come, and face me!',
  'Horridon': 'The beast must be stopped!',
  'Council of Elders': 'Da spirits gonna feast tonight!',
  'Tortos': 'The turtle is moving!',
  'Megaera': 'Cut off one head, two grow back!',
  'Ji-Kun': 'Protect the nest!',
  'Durumu the Forgotten': 'I see all!',
  'Primordius': 'Evolution at its finest.',
  'Dark Animus': 'Power overwhelming.',
  'Iron Qon': 'You face the might of the Thunder King!',
  'Twin Consorts': 'The celestial dance continues.',
  'Lei Shen': 'I am Lei Shen, slayer of kings and gods.',
  'Ra-den': 'It appears I have guests.',
  'Immerseus': 'The waters are tainted!',
  'Fallen Protectors': 'He was right about you.',
  'Norushen': 'Your corruption must be purged!',
  'Sha of Pride': 'Come, face me. Give in to your pride.',
  'Galakras': 'The skies are ours!',
  'Iron Juggernaut': 'Target acquired.',
  'Kor\'kron Dark Shaman': 'The elements shall destroy you!',
  'General Nazgrim': 'I am a soldier of the Horde. I die for my warchief.',
  'Malkorok': 'I will protect the Warchief!',
  'Spoils of Pandaria': 'Massive energy readings detected!',
  'Thok the Bloodthirsty': 'Feed me!',
  'Siegecrafter Blackfuse': 'Better stand back.',
  'Paragons of the Klaxxi': 'We are the Klaxxi, and we are awakened.',
  'Garrosh Hellscream': 'You disappoint me, Garrosh.',
}

/**
 * Get a quote for a boss name. Handles partial matching for
 * boss names that may differ slightly from the DB.
 */
export function getBossQuote(bossName: string): string | null {
  // Direct match
  if (BOSS_QUOTES[bossName]) return BOSS_QUOTES[bossName]

  // Partial match (boss name contains the key or vice versa)
  for (const [key, quote] of Object.entries(BOSS_QUOTES)) {
    if (bossName.includes(key) || key.includes(bossName)) {
      return quote
    }
  }

  return null
}
