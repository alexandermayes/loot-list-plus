import type { SupabaseClient } from '@supabase/supabase-js'

interface LogReserveAuditOptions {
  supabase: SupabaseClient
  reserveRunId: string
  actorUserId?: string | null
  actorLabel?: string | null
  action: string
  details?: Record<string, unknown>
}

/**
 * Write a single reserve audit log entry. Failures are swallowed —
 * audit logging must never block the operation that triggered it.
 */
export async function logReserveAudit({
  supabase,
  reserveRunId,
  actorUserId = null,
  actorLabel = null,
  action,
  details = {},
}: LogReserveAuditOptions): Promise<void> {
  try {
    await supabase.from('reserve_audit_log').insert({
      reserve_run_id: reserveRunId,
      actor_user_id: actorUserId,
      actor_label: actorLabel,
      action,
      details,
    })
  } catch (err) {
    console.error('reserve audit log failed:', err)
  }
}
