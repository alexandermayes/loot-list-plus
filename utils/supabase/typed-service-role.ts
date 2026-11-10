import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

export type TypedServiceClient = SupabaseClient<Database>

/**
 * Service-role client typed against the generated schema, for addon and bot
 * routes. A nonexistent table or filter column fails typecheck, which is the
 * guard against the bad_luck_protection / item_priorities class of defect
 * (FIX-06). A bad column inside a select string surfaces only where the row
 * is consumed, so consume typed rows without `as` casts.
 *
 * It delegates to createServiceRoleClient (instead of calling createClient
 * itself) so the existing test files that mock `createServiceRoleClient`
 * keep working unchanged.
 */
export function createTypedServiceRoleClient(): TypedServiceClient {
  return createServiceRoleClient() as TypedServiceClient
}
