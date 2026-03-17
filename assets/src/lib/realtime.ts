import { Socket } from 'phoenix'

type RefreshCallback = () => void

type ChangePayload = {
  resource?: string
}

const REFRESH_DEBOUNCE_MS = 100

const resourceSubscriptions = new Map<string, Set<RefreshCallback>>()
const resourceRefreshTimers = new Map<string, number>()
let socket: Socket | null = null
let joinedChannel: ReturnType<Socket['channel']> | null = null
let listening = false

function ensureChannel() {
  if (typeof window === 'undefined') {
    return null
  }

  if (!socket) {
    socket = new Socket('/socket')
    socket.connect()
  }

  if (!joinedChannel) {
    joinedChannel = socket.channel('ash:sync', {})
    joinedChannel.join()
  }

  if (!listening) {
    listening = true
    joinedChannel.on('changed', (payload: ChangePayload) => {
      if (!payload.resource) return

      const existingTimer = resourceRefreshTimers.get(payload.resource)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      const timer = window.setTimeout(() => {
        resourceRefreshTimers.delete(payload.resource!)
        const callbacks = resourceSubscriptions.get(payload.resource!)
        callbacks?.forEach((callback) => callback())
      }, REFRESH_DEBOUNCE_MS)

      resourceRefreshTimers.set(payload.resource, timer)
    })
  }

  return joinedChannel
}

export function subscribeToResource(resourceName: string, callback: RefreshCallback) {
  ensureChannel()

  const callbacks = resourceSubscriptions.get(resourceName) ?? new Set<RefreshCallback>()
  callbacks.add(callback)
  resourceSubscriptions.set(resourceName, callbacks)

  return () => {
    const current = resourceSubscriptions.get(resourceName)
    if (!current) return
    current.delete(callback)
    if (current.size === 0) {
      resourceSubscriptions.delete(resourceName)
    }
  }
}
