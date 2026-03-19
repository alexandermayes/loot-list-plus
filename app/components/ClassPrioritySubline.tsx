'use client'

import React from 'react'
import { specMapping, type Role } from '@/domain/loot/spec-role-mapping'

interface LootItemClass {
  class_id: string
  spec_id: string | null
  spec_type: string | null
  class_name?: string | null
  class_color?: string | null
  spec_name?: string | null
}

interface ClassPrioritySublineProps {
  lootItemClasses?: LootItemClass[]
}

const roleLabels: Record<Role, string> = {
  tank: 'All tanks',
  healer: 'All healers',
  physical: 'All physical DPS',
  caster: 'All caster DPS',
}

const allRoles: Role[] = ['tank', 'healer', 'physical', 'caster']

/**
 * Consolidate a list of spec names into role-group summaries where possible.
 * e.g. if all physical DPS specs are present, show "All physical DPS" instead of listing each.
 */
function consolidateSpecs(entries: LootItemClass[]): string {
  const specNames = new Set<string>()
  const classNames = new Set<string>()

  for (const e of entries) {
    if (e.spec_name) specNames.add(e.spec_name)
    if (e.class_name) classNames.add(e.class_name)
  }

  const matchedRoles: Role[] = []
  const consumedSpecs = new Set<string>()

  for (const role of allRoles) {
    const roleSpecs = Object.entries(specMapping)
      .filter(([, info]) => info.roles.includes(role))
      .map(([name]) => name)

    if (roleSpecs.length > 0 && roleSpecs.every(s => specNames.has(s))) {
      matchedRoles.push(role)
      roleSpecs.forEach(s => consumedSpecs.add(s))
    }
  }

  const parts: string[] = matchedRoles.map(r => roleLabels[r])

  for (const e of entries) {
    if (e.spec_name && !consumedSpecs.has(e.spec_name)) {
      consumedSpecs.add(e.spec_name)
      parts.push(e.spec_name)
    }
  }

  if (parts.length === 0 && classNames.size > 0) {
    return [...classNames].join(', ')
  }

  return parts.join(', ')
}

function ClassPrioritySublineInner({ lootItemClasses }: ClassPrioritySublineProps) {
  if (!lootItemClasses || lootItemClasses.length === 0) return null

  const primary = lootItemClasses.filter(c => c.spec_type === 'primary')
  const secondary = lootItemClasses.filter(c => c.spec_type === 'secondary')

  if (primary.length === 0 && secondary.length === 0) return null

  return (
    <span className="block text-[11px] text-muted-foreground leading-tight">
      {primary.length > 0 && (
        <span className="block">Primary: {consolidateSpecs(primary)}</span>
      )}
      {secondary.length > 0 && (
        <span className="block">Secondary: {consolidateSpecs(secondary)}</span>
      )}
    </span>
  )
}

const ClassPrioritySubline = React.memo(ClassPrioritySublineInner)
export default ClassPrioritySubline
