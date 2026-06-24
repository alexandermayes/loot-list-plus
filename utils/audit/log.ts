import { SupabaseClient } from '@supabase/supabase-js'

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'

export interface AuditLogParams {
  supabase: SupabaseClient
  guildId?: string | null
  tableName: string
  recordId: string
  action: AuditAction
  userId: string
  oldData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
}

/**
 * Calculate which fields changed between old and new data
 */
function getChangedFields(
  oldData: Record<string, unknown> | null | undefined,
  newData: Record<string, unknown> | null | undefined
): string[] {
  if (!oldData || !newData) return []

  const changedFields: string[] = []
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])

  for (const key of allKeys) {
    // Skip metadata fields that always change
    if (key === 'updated_at' || key === 'created_at') continue

    const oldValue = oldData[key]
    const newValue = newData[key]

    // Deep comparison for objects/arrays
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changedFields.push(key)
    }
  }

  return changedFields
}

/**
 * Log an audit event to the audit_logs table
 *
 * Usage:
 * ```typescript
 * await logAudit({
 *   supabase,
 *   guildId: submission.guild_id,
 *   tableName: 'loot_submissions',
 *   recordId: submission.id,
 *   action: 'UPDATE',
 *   userId: user.id,
 *   oldData: { status: 'pending' },
 *   newData: { status: 'approved' },
 * })
 * ```
 */
export async function logAudit({
  supabase,
  guildId,
  tableName,
  recordId,
  action,
  userId,
  oldData,
  newData,
}: AuditLogParams): Promise<void> {
  try {
    // Calculate changed fields for UPDATE actions
    const changedFields = action === 'UPDATE' ? getChangedFields(oldData, newData) : null

    // Don't log if nothing actually changed
    if (action === 'UPDATE' && changedFields && changedFields.length === 0) {
      return
    }

    const { error } = await supabase.from('audit_logs').insert({
      guild_id: guildId || null,
      table_name: tableName,
      record_id: recordId,
      action,
      user_id: userId,
      old_data: oldData || null,
      new_data: newData || null,
      changed_fields: changedFields,
    })

    if (error) {
      // Don't throw - audit logging should never break the main operation
      console.error('[Audit] Failed to log audit event:', error)
    }
  } catch (error) {
    // Don't throw - audit logging should never break the main operation
    console.error('[Audit] Unexpected error logging audit event:', error)
  }
}

/**
 * Helper to create a sanitized copy of data for audit logging
 * Removes sensitive fields that shouldn't be stored in audit logs
 */
export function sanitizeForAudit<T extends Record<string, unknown>>(
  data: T,
  sensitiveFields: string[] = []
): Partial<T> {
  const defaultSensitiveFields = ['password', 'token', 'secret', 'api_key']
  const allSensitiveFields = [...defaultSensitiveFields, ...sensitiveFields]

  const sanitized = { ...data }
  for (const field of allSensitiveFields) {
    if (field in sanitized) {
      delete sanitized[field]
    }
  }

  return sanitized
}

/**
 * Helper to log a status change specifically (common operation)
 */
export async function logStatusChange({
  supabase,
  guildId,
  tableName,
  recordId,
  userId,
  oldStatus,
  newStatus,
  additionalData,
}: {
  supabase: SupabaseClient
  guildId?: string | null
  tableName: string
  recordId: string
  userId: string
  oldStatus: string
  newStatus: string
  additionalData?: Record<string, unknown>
}): Promise<void> {
  await logAudit({
    supabase,
    guildId,
    tableName,
    recordId,
    action: 'UPDATE',
    userId,
    oldData: { status: oldStatus, ...additionalData },
    newData: { status: newStatus, ...additionalData },
  })
}
