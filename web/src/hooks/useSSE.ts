import { useEffect, useRef } from 'react'

type SSEHandler = (event: string, data: unknown) => void

export function useSSE(url: string, onEvent: SSEHandler) {
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    const source = new EventSource(url)

    const handler = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        handlerRef.current(e.type, data)
      } catch {
        // ignore parse errors
      }
    }

    source.addEventListener('thread:created', handler)
    source.addEventListener('thread:updated', handler)
    source.addEventListener('thread:deleted', handler)

    return () => source.close()
  }, [url])
}
