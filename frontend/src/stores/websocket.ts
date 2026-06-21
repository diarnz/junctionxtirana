import { ref } from 'vue'
import { defineStore } from 'pinia'

import { useNotificationsStore } from './notifications'

function deriveWsBase(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8082/api/v1'
  try {
    const url = new URL(apiBase)
    const proto = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${url.host}`
  } catch {
    return 'ws://localhost:8082'
  }
}

const baseWsUrl = import.meta.env.VITE_WS_URL ?? deriveWsBase()

export const useWebsocketStore = defineStore('websocket', () => {
  const connected = ref(false)
  const lastMessage = ref<string | null>(null)
  const active3dConnections = ref(0)
  let socket: WebSocket | null = null
  let reconnectTimer: number | null = null
  let reconnectAttempts = 0
  let manualClose = false

  function connect() {
    if (socket && socket.readyState === WebSocket.OPEN) return
    manualClose = false

    socket = new WebSocket(`${baseWsUrl}/ws/admin`)

    socket.addEventListener('open', () => {
      connected.value = true
      reconnectAttempts = 0
    })

    socket.addEventListener('message', (event) => {
      const notifications = useNotificationsStore()
      try {
        const message = JSON.parse(event.data) as {
          type: string
          payload?: Record<string, unknown>
        }
        lastMessage.value = message.type

        if (message.type === 'CONNECTED') {
          active3dConnections.value = Number(
            message.payload?.active_3d_connections ?? 0,
          )
        }

        if (message.type === 'REQUEST_SUBMITTED') {
          notifications.push(
            `New request submitted: ${String(message.payload?.title ?? 'Untitled event')}`,
            'info',
          )
        }

        if (message.type === 'REQUEST_STATUS_CHANGED') {
          notifications.push(
            `Request status changed to ${String(message.payload?.new_status ?? 'updated')}`,
            'success',
          )
        }

        if (message.type === 'LAYOUT_AI_APPLIED') {
          notifications.push('AI layout applied in 3D view.', 'success')
        }
      } catch {
        // ignore malformed admin websocket payloads
      }
    })

    socket.addEventListener('close', () => {
      connected.value = false
      if (!manualClose) {
        scheduleReconnect()
      }
    })

    socket.addEventListener('error', () => {
      connected.value = false
    })
  }

  function scheduleReconnect() {
    if (reconnectAttempts >= 10) return
    reconnectAttempts += 1
    reconnectTimer = window.setTimeout(() => connect(), 3000)
  }

  function disconnect() {
    manualClose = true
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    socket?.close()
    socket = null
    connected.value = false
  }

  return {
    connected,
    lastMessage,
    active3dConnections,
    connect,
    disconnect,
  }
})
