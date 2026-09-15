import Pusher from 'pusher-js'
 
const PUSHER_KEY = '55eadccf9e19b13932d6'
const PUSHER_CLUSTER = 'ap2'
 
class PusherService {
  constructor() {
    this.pusher = null
    this.channel = null
  }
 
  connect() {
    // Helpful while testing
    Pusher.logToConsole = true
 
    this.pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      forceTLS: true,
    })
 
    // Connection successful
    this.pusher.connection.bind('connected', () => {
      console.log('✅ Pusher connected successfully')
      console.log('Socket ID:', this.pusher.connection.socket_id)
    })
 
    // Connection state changes
    this.pusher.connection.bind('state_change', (states) => {
      console.log(
        `Pusher state: ${states.previous} -> ${states.current}`
      )
    })
 
    // Connection error
    this.pusher.connection.bind('error', (error) => {
      console.error('❌ Pusher connection error:', error)
    })
 
    return this.pusher
  }
 
  subscribe(channelName, eventName, callback) {
    if (!this.pusher) {
      console.error('Pusher is not connected')
      return
    }
 
    console.log(`Subscribing to channel: ${channelName}`)
 
    this.channel = this.pusher.subscribe(channelName)
 
    this.channel.bind('pusher:subscription_succeeded', () => {
      console.log(`✅ Subscribed to channel: ${channelName}`)
    })
 
    this.channel.bind('pusher:subscription_error', (error) => {
      console.error(
        `❌ Subscription error for ${channelName}:`,
        error
      )
    })
 
    this.channel.bind(eventName, (data) => {
      console.log(`📩 Event received: ${eventName}`)
      console.log('Data:', data)
 
      if (callback) {
        callback(data)
      }
    })
 
    return this.channel
  }
 
  unsubscribe(channelName) {
    if (this.pusher) {
      this.pusher.unsubscribe(channelName)
      console.log(`Unsubscribed from: ${channelName}`)
    }
  }
 
  disconnect() {
    if (this.pusher) {
      this.pusher.disconnect()
      this.pusher = null
      this.channel = null
 
      console.log('Pusher disconnected')
    }
  }
 
  getConnectionState() {
    return this.pusher?.connection?.state || 'not-created'
  }
}
 
export default new PusherService()