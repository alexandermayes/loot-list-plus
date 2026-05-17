/**
 * Iterate a Supabase select query past the server-side 1000-row cap.
 *
 * Supabase enforces a hard 1000-row response cap by default that `.limit(N)`
 * does NOT override — only configuring `db_settings.max_rows` server-side
 * does. Any query that can return more than 1000 rows must paginate via
 * `.range()`, or rows silently disappear. This helper paginates in
 * 1000-row pages until exhausted.
 *
 * Usage:
 * ```ts
 * const rows = await paginatedSelect<RowShape>((start, end) =>
 *   supabase.from('table').select('cols').eq('guild_id', id).range(start, end)
 * )
 * ```
 */
export async function paginatedSelect<T>(
  buildQuery: (rangeStart: number, rangeEnd: number) => PromiseLike<{ data: T[] | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = []
  for (let start = 0; ; start += pageSize) {
    const { data } = await buildQuery(start, start + pageSize - 1)
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < pageSize) break
  }
  return out
}
