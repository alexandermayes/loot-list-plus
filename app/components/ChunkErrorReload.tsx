'use client'

import { useEffect } from 'react'
import { isChunkLoadError, reloadOnceForStaleChunk } from '@/utils/chunk-reload'

/**
 * Global listener that recovers from stale-client chunk load failures by
 * forcing one reload (see utils/chunk-reload.ts). Complements DeploymentCheck,
 * which only catches new builds on navigation — a lazy chunk on the current
 * page can fail before that check ever runs.
 */
export function ChunkErrorReload() {
  useEffect(() => {
    const onError = (event: Event) => {
      // Resource load failures (script/link) don't bubble, hence the capture
      // phase; they also carry no message, so detect them by the failed URL.
      const target = event.target as HTMLScriptElement | HTMLLinkElement | null
      const url =
        (target && 'src' in target && typeof target.src === 'string' && target.src) ||
        (target && 'href' in target && typeof target.href === 'string' && target.href) ||
        ''
      const message = event instanceof ErrorEvent ? event.message : ''
      if (isChunkLoadError(message) || url.includes('/_next/static/')) {
        reloadOnceForStaleChunk()
      }
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { name?: string; message?: string } | string | undefined
      const message = typeof reason === 'string' ? reason : reason?.message
      const name = typeof reason === 'object' ? reason?.name : undefined
      if (name === 'ChunkLoadError' || isChunkLoadError(message)) {
        reloadOnceForStaleChunk()
      }
    }

    window.addEventListener('error', onError, true)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError, true)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
