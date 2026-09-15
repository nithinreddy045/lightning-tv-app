import Blits from '@lightningjs/blits'
import Hls from 'hls.js'
import Pusher from 'pusher-js'

// ============================================================
// PUSHER CONFIGURATION
// ============================================================

const PUSHER_KEY = '55eadccf9e19b13932d6'
const PUSHER_CLUSTER = 'ap2'

// Android emulator -> Windows PC
const PUSHER_AUTH_URL = 'http://10.0.2.2:3000/pusher/auth'

const SYNC_CHANNEL = 'presence-tv-sync'
const VIDEO_ID = 'tears-of-steel'

const VIDEO_URL =
  'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'

// ============================================================
// VIDEO COMPONENT
// ============================================================

export default Blits.Component('Video', {
  template: `
    <Element
      w="1920"
      h="1080"
      color="#000000"
    >
      <Element
        x="40"
        y="30"
        w="1840"
        h="70"
      >
        <Text
          x="0"
          y="0"
          :content="$statusText"
          size="30"
          color="#ffffff"
          fontFace="lato"
        />
      </Element>

      <Element
        x="40"
        y="100"
        w="1840"
        h="850"
      >
        <Element
          ref="videoContainer"
          x="0"
          y="0"
          w="1840"
          h="850"
        />
      </Element>

      <Element
        x="40"
        y="970"
        w="1840"
        h="70"
      >
        <Text
          x="0"
          y="0"
          :content="$syncText"
          size="28"
          color="#aaaaaa"
          fontFace="lato"
        />
      </Element>
    </Element>
  `,

  state() {
    return {
      statusText: 'Loading video...',
      syncText: 'Connecting to Pusher...',

      isPlaying: false,
      currentTime: 0,
      duration: 0,

      role: 'unknown',

      pendingPlaybackState: null,

      video: null,
      hls: null,

      pusher: null,
      syncChannel: null,

      pusherClientId: null,

      serverClockOffset: 0,

      syncInterval: null,

      lastSentPosition: -1,
      lastSentPlaying: null,

      isApplyingRemoteState: false,
    }
  },

  hooks: {
    ready() {
      console.log('VIDEO PAGE READY')

      this.createClientId()

      this.createVideo()

      this.$focus()

      this.connectSyncServer()

      this.startSync()
    },

    destroy() {
      console.log('VIDEO PAGE DESTROY')

      this.stopSync()

      this.disconnectSyncServer()

      this.removeVideo()
    },
  },

  methods: {
    // ========================================================
    // UI HELPERS
    // ========================================================

    setStatus(text) {
      this.statusText = text
      console.log(text)
    },

    setSyncStatus(text) {
      this.syncText = text
      console.log(text)
    },

    // ========================================================
    // CLIENT ID
    // ========================================================

    createClientId() {
      const storageKey = 'lightning-tv-sync-client-id'

      let clientId = null

      try {
        clientId = localStorage.getItem(storageKey)
      } catch (error) {
        console.log('LOCAL STORAGE READ ERROR:', error)
      }

      if (!clientId) {
        clientId =
          `tv-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`

        try {
          localStorage.setItem(storageKey, clientId)
        } catch (error) {
          console.log('LOCAL STORAGE WRITE ERROR:', error)
        }
      }

      this.pusherClientId = clientId

      console.log('PUSHER CLIENT ID:', clientId)
    },

    // ========================================================
    // VIDEO CREATION
    // ========================================================

    createVideo() {
  console.log('CREATING HTML5 VIDEO')

  const video = document.createElement('video')

  video.id = 'lightning-sync-video'

  video.style.position = 'fixed'
  video.style.left = '40px'
  video.style.top = '100px'
  video.style.width = '1840px'
  video.style.height = '850px'

  video.style.objectFit = 'contain'
  video.style.backgroundColor = '#000000'

  video.style.zIndex = '10'

  video.autoplay = true
  video.muted = false
  video.controls = false
  video.playsInline = true
  video.preload = 'auto'

  this.video = video

  // Add the HTML5 video to the actual browser DOM
  document.body.appendChild(video)

  this.attachVideoEvents()

  this.loadVideo()
},

    // ========================================================
    // VIDEO EVENTS
    // ========================================================

    attachVideoEvents() {
      if (!this.video) return

      this.video.addEventListener('loadedmetadata', () => {
        console.log('VIDEO METADATA LOADED')

        this.duration = Number.isFinite(this.video.duration)
          ? this.video.duration
          : 0

        console.log('VIDEO DURATION:', this.duration)

        if (this.pendingPlaybackState) {
          const pendingState = this.pendingPlaybackState

          this.pendingPlaybackState = null

          console.log('APPLYING PENDING PLAYBACK STATE')

          this.handleRemotePlaybackState(pendingState)
        }

        this.startPlaybackIfReady()
      })

      this.video.addEventListener('canplay', () => {
        console.log('VIDEO CAN PLAY')

        this.startPlaybackIfReady()
      })

      this.video.addEventListener('play', () => {
        console.log('VIDEO PLAYING')

        this.isPlaying = true

        if (!this.isApplyingRemoteState && this.role === 'leader') {
          this.sendPlaybackState()
        }
      })

      this.video.addEventListener('pause', () => {
        console.log('VIDEO PAUSED')

        this.isPlaying = false

        if (!this.isApplyingRemoteState && this.role === 'leader') {
          this.sendPlaybackState()
        }
      })

      this.video.addEventListener('timeupdate', () => {
        if (!this.video) return

        this.currentTime = this.video.currentTime
      })

      this.video.addEventListener('ended', () => {
        console.log('VIDEO ENDED')

        this.isPlaying = false

        if (this.role === 'leader') {
          this.sendPlaybackState()
        }
      })

      this.video.addEventListener('error', (event) => {
        console.error('VIDEO ERROR:', event)
      })
    },

    // ========================================================
    // LOAD VIDEO
    // ========================================================

    loadVideo() {
      if (!this.video) return

      console.log('LOADING VIDEO')

      this.setStatus('Loading video...')

      if (Hls.isSupported()) {
        console.log('HLS.JS IS SUPPORTED')

        const hls = new Hls({
          enableWorker: true,

          lowLatencyMode: false,

          backBufferLength: 90,

          maxBufferLength: 30,

          maxMaxBufferLength: 60,
        })

        this.hls = hls

        hls.loadSource(VIDEO_URL)

        hls.attachMedia(this.video)

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS MANIFEST PARSED')

          this.setStatus('Video ready')

          this.startPlaybackIfReady()
        })

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS ERROR:', event, data)

          if (data && data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('HLS NETWORK ERROR - RETRYING')

                hls.startLoad()

                break

              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('HLS MEDIA ERROR - RECOVERING')

                hls.recoverMediaError()

                break

              default:
                console.error('HLS FATAL ERROR')

                this.setStatus('Video error')

                break
            }
          }
        })

        return
      }

      // ======================================================
      // NATIVE HLS SUPPORT
      // ======================================================

      if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('NATIVE HLS IS SUPPORTED')

        this.video.src = VIDEO_URL

        this.setStatus('Video ready')

        return
      }

      console.error('HLS NOT SUPPORTED')

      this.setStatus('HLS not supported')
    },

    // ========================================================
    // AUTOMATIC PLAYBACK
    // ========================================================

    async startPlaybackIfReady() {
      if (!this.video) return

      if (this.video.readyState < 2) {
        console.log('VIDEO NOT READY FOR PLAYBACK')

        return
      }

      // ------------------------------------------------------
      // FOLLOWER
      // ------------------------------------------------------

      if (this.role === 'follower') {
        console.log('FOLLOWER WAITING FOR LEADER STATE')

        return
      }

      // ------------------------------------------------------
      // LEADER
      // ------------------------------------------------------

      if (this.role === 'leader') {
        if (!this.video.paused) {
          return
        }

        try {
          console.log('LEADER: STARTING AUTOMATIC PLAYBACK')

          await this.video.play()

          this.isPlaying = true

          console.log('LEADER PLAYBACK STARTED')

          this.sendPlaybackState()
        } catch (error) {
          console.error('LEADER PLAY ERROR:', error)

          /*
           * Some Android versions may block unmuted autoplay.
           *
           * We still try again when the video becomes ready.
           */

          setTimeout(() => {
            if (this.role === 'leader') {
              this.startPlaybackIfReady()
            }
          }, 1000)
        }
      }
    },

    // ========================================================
    // PUSHER CONNECTION
    // ========================================================

    connectSyncServer() {
      console.log('CONNECTING TO PUSHER')

      this.setSyncStatus('Connecting to Pusher...')
      console.log('TESTING AUTH ENDPOINT:', PUSHER_AUTH_URL)

fetch(PUSHER_AUTH_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    socket_id: 'test.123',
    channel_name: 'presence-tv-sync',
    client_id: this.pusherClientId,
  }),
})
  .then(async (response) => {
    console.log('AUTH FETCH STATUS:', response.status)
    console.log('AUTH FETCH RESPONSE:', await response.text())
  })
  .catch((error) => {
    console.error('AUTH FETCH FAILED:', error)
  })

      try {
        this.pusher = new Pusher(PUSHER_KEY, {
  cluster: PUSHER_CLUSTER,

  channelAuthorization: {
    endpoint: PUSHER_AUTH_URL,
    transport: 'ajax',
    paramsProvider: () => ({
      client_id: this.pusherClientId,
    }),
  },
})

        // ----------------------------------------------------
        // CONNECTION STATE
        // ----------------------------------------------------

        this.pusher.connection.bind(
          'connected',
          () => {
            console.log('PUSHER CONNECTED')

            this.setSyncStatus('Pusher connected')

            this.subscribeToSyncChannel()
          }
        )

        this.pusher.connection.bind(
          'connecting',
          () => {
            console.log('PUSHER CONNECTING')

            this.setSyncStatus('Connecting to Pusher...')
          }
        )

        this.pusher.connection.bind(
          'disconnected',
          () => {
            console.log('PUSHER DISCONNECTED')

            this.setSyncStatus('Pusher disconnected')
          }
        )

        this.pusher.connection.bind(
          'failed',
          () => {
            console.log('PUSHER CONNECTION FAILED')

            this.setSyncStatus('Pusher connection failed')
          }
        )

        this.pusher.connection.bind(
          'error',
          (error) => {
            console.error('PUSHER CONNECTION ERROR:', error)
          }
        )
      } catch (error) {
        console.error('PUSHER SETUP ERROR:', error)

        this.setSyncStatus('Pusher setup error')
      }
    },

    // ========================================================
    // SUBSCRIBE
    // ========================================================

    subscribeToSyncChannel() {
      if (!this.pusher) return

      console.log('SUBSCRIBING TO:', SYNC_CHANNEL)

      try {
        this.syncChannel = this.pusher.subscribe(
          SYNC_CHANNEL
        )

        // ----------------------------------------------------
        // SUBSCRIPTION SUCCESS
        // ----------------------------------------------------

        this.syncChannel.bind(
          'pusher:subscription_succeeded',
          (members) => {
            console.log('PUSHER CHANNEL SUBSCRIBED')

            this.setSyncStatus('Sync channel connected')

            this.printMembers(members)

            this.updateLeaderFromMembers(members)

            if (this.role === 'follower') {
              console.log(
                'FOLLOWER REQUESTING CURRENT STATE'
              )

              this.requestCurrentState()
            }
          }
        )

        // ----------------------------------------------------
        // SUBSCRIPTION ERROR
        // ----------------------------------------------------

       this.syncChannel.bind(
  'pusher:subscription_error',
  (status) => {
    console.error('PUSHER SUBSCRIPTION ERROR STATUS:', status)
    console.error(
      'PUSHER SUBSCRIPTION ERROR JSON:',
      JSON.stringify(status)
    )
    console.error(
      'PUSHER SUBSCRIPTION ERROR TYPE:',
      typeof status
    )

    this.setSyncStatus(
      'Pusher subscription failed'
    )
  }
)

        // ----------------------------------------------------
        // MEMBER ADDED
        // ----------------------------------------------------

        this.syncChannel.bind(
          'pusher:member_added',
          (member) => {
            console.log(
              'PUSHER MEMBER ADDED:',
              member
            )

            this.refreshLeader()
          }
        )

        // ----------------------------------------------------
        // MEMBER REMOVED
        // ----------------------------------------------------

        this.syncChannel.bind(
          'pusher:member_removed',
          (member) => {
            console.log(
              'PUSHER MEMBER REMOVED:',
              member
            )

            this.refreshLeader()
          }
        )

        // ----------------------------------------------------
        // PLAYBACK STATE
        // ----------------------------------------------------

        this.syncChannel.bind(
          'client-playback-state',
          (message) => {
            console.log(
              'PUSHER PLAYBACK STATE:',
              message
            )

            this.handleRemotePlaybackState(message)
          }
        )

        // ----------------------------------------------------
        // STATE REQUEST
        // ----------------------------------------------------

        this.syncChannel.bind(
          'client-request-state',
          (message) => {
            console.log(
              'PUSHER STATE REQUEST:',
              message
            )

            if (this.role === 'leader') {
              console.log(
                'LEADER RESPONDING WITH CURRENT STATE'
              )

              this.sendPlaybackState()
            }
          }
        )
      } catch (error) {
        console.error(
          'PUSHER SUBSCRIBE ERROR:',
          error
        )
      }
    },

    // ========================================================
    // PRINT MEMBERS
    // ========================================================

    printMembers(members) {
      try {
        const list = []

        members.each((member) => {
          list.push({
            id: member.id,
            info: member.info,
          })
        })

        console.log(
          'PUSHER MEMBERS:',
          list
        )
      } catch (error) {
        console.error(
          'MEMBER LIST ERROR:',
          error
        )
      }
    },

    // ========================================================
    // LEADER ELECTION
    // ========================================================

    updateLeaderFromMembers(members) {
      if (!members) return

      const memberIds = []

      try {
        members.each((member) => {
          memberIds.push(member.id)
        })
      } catch (error) {
        console.error(
          'MEMBER ITERATION ERROR:',
          error
        )

        return
      }

      if (memberIds.length === 0) {
        return
      }

      memberIds.sort()

      const leaderId = memberIds[0]

      let myPresenceId = null

      try {
        const myMember =
          members.get(
            this.findMyPresenceId(members)
          )

        if (myMember) {
          myPresenceId = myMember.id
        }
      } catch (error) {
        console.log(
          'COULD NOT GET MY MEMBER DIRECTLY'
        )
      }

      if (!myPresenceId) {
        myPresenceId =
          this.findMyPresenceId(members)
      }

      if (myPresenceId === leaderId) {
        this.setRole('leader')
      } else {
        this.setRole('follower')
      }

      console.log(
        'LEADER PRESENCE ID:',
        leaderId
      )

      console.log(
        'MY PRESENCE ID:',
        myPresenceId
      )
    },

    // ========================================================
    // FIND MY PRESENCE ID
    // ========================================================

    findMyPresenceId(members) {
      let result = null

      try {
        members.each((member) => {
          if (
            member.info &&
            member.info.name === this.pusherClientId
          ) {
            result = member.id
          }
        })
      } catch (error) {
        console.error(
          'FIND MY PRESENCE ID ERROR:',
          error
        )
      }

      return result
    },

    // ========================================================
    // REFRESH LEADER
    // ========================================================

    refreshLeader() {
      if (!this.syncChannel) return

      const members =
        this.syncChannel.members

      if (!members) return

      this.updateLeaderFromMembers(members)

      if (this.role === 'follower') {
        setTimeout(() => {
          this.requestCurrentState()
        }, 300)
      }
    },

    // ========================================================
    // SET ROLE
    // ========================================================

    setRole(newRole) {
      if (this.role === newRole) {
        return
      }

      this.role = newRole

      console.log(
        'MY SYNC ROLE:',
        newRole
      )

      if (newRole === 'leader') {
        this.setSyncStatus(
          'TV is LEADER'
        )

        this.startPlaybackIfReady()

        return
      }

      if (newRole === 'follower') {
        this.setSyncStatus(
          'TV is FOLLOWER'
        )

        if (this.video) {
          this.isApplyingRemoteState = true

          try {
            this.video.pause()
          } catch (error) {
            console.log(
              'FOLLOWER INITIAL PAUSE ERROR:',
              error
            )
          }

          this.isApplyingRemoteState = false
        }
      }
    },

    // ========================================================
    // REQUEST CURRENT STATE
    // ========================================================

    requestCurrentState() {
      if (!this.syncChannel) {
        console.log(
          'CANNOT REQUEST STATE - NO CHANNEL'
        )

        return
      }

      try {
        this.syncChannel.trigger(
          'client-request-state',
          {
            videoId: VIDEO_ID,

            requestedAt: Date.now(),

            requester: this.pusherClientId,
          }
        )

        console.log(
          'FOLLOWER STATE REQUEST SENT'
        )
      } catch (error) {
        console.error(
          'STATE REQUEST ERROR:',
          error
        )
      }
    },

    // ========================================================
    // SEND PLAYBACK STATE
    // ========================================================

    sendPlaybackState() {
      if (!this.syncChannel) {
        return
      }

      if (!this.video) {
        return
      }

      if (this.role !== 'leader') {
        return
      }

      if (!Number.isFinite(this.video.currentTime)) {
        return
      }

      const now = Date.now()

      const message = {
        videoId: VIDEO_ID,

        position: this.video.currentTime,

        playing: !this.video.paused,

        updatedAt: now,

        serverTime: now,

        sender: this.pusherClientId,
      }

      try {
        this.syncChannel.trigger(
          'client-playback-state',
          message
        )

        this.lastSentPosition =
          this.video.currentTime

        this.lastSentPlaying =
          !this.video.paused

        console.log(
          'PLAYBACK STATE SENT:',
          message
        )
      } catch (error) {
        console.error(
          'PLAYBACK STATE SEND ERROR:',
          error
        )
      }
    },

    // ========================================================
    // HANDLE REMOTE STATE
    // ========================================================

    handleRemotePlaybackState(message) {
      if (!message) return

      if (message.videoId !== VIDEO_ID) {
        console.log(
          'IGNORING STATE FOR DIFFERENT VIDEO:',
          message.videoId
        )

        return
      }

      if (this.role === 'leader') {
        return
      }

      if (!this.video) {
        console.log(
          'VIDEO NOT READY - SAVING PENDING STATE'
        )

        this.pendingPlaybackState = message

        return
      }

      if (
        !Number.isFinite(message.position)
      ) {
        return
      }

      // ------------------------------------------------------
      // SERVER CLOCK OFFSET
      // ------------------------------------------------------

      if (
        Number.isFinite(message.serverTime)
      ) {
        this.serverClockOffset =
          Date.now() - message.serverTime
      }

      // ------------------------------------------------------
      // CALCULATE CURRENT TARGET POSITION
      // ------------------------------------------------------

      let targetPosition =
        message.position

      if (
        message.playing &&
        Number.isFinite(message.updatedAt)
      ) {
        const now = Date.now()

        const elapsed =
          (now - message.updatedAt) / 1000

        if (elapsed > 0 && elapsed < 30) {
          targetPosition =
            message.position + elapsed
        }
      }

      // ------------------------------------------------------
      // CLAMP
      // ------------------------------------------------------

      if (
        Number.isFinite(this.video.duration) &&
        this.video.duration > 0
      ) {
        targetPosition =
          Math.max(
            0,
            Math.min(
              targetPosition,
              this.video.duration
            )
          )
      }

      const localPosition =
        this.video.currentTime

      const drift =
        targetPosition - localPosition

      console.log(
        'REMOTE POSITION:',
        targetPosition
      )

      console.log(
        'LOCAL POSITION:',
        localPosition
      )

      console.log(
        'DRIFT:',
        drift
      )

      // ------------------------------------------------------
      // CORRECT POSITION
      // ------------------------------------------------------

      if (Math.abs(drift) > 0.25) {
        console.log(
          'FOLLOWER SYNC CORRECTION'
        )

        this.isApplyingRemoteState = true

        try {
          this.video.currentTime =
            targetPosition
        } catch (error) {
          console.error(
            'CURRENT TIME SET ERROR:',
            error
          )
        }

        this.isApplyingRemoteState = false
      }

      // ------------------------------------------------------
      // PLAY / PAUSE
      // ------------------------------------------------------

      if (message.playing) {
        this.startFollowerPlayback()
      } else {
        this.pauseFollowerPlayback()
      }
    },

    // ========================================================
    // FOLLOWER PLAYBACK
    // ========================================================

    async startFollowerPlayback() {
      if (!this.video) return

      if (!this.video.paused) {
        this.isPlaying = true

        return
      }

      this.isApplyingRemoteState = true

      try {
        console.log(
          'FOLLOWER STARTING PLAYBACK'
        )

        await this.video.play()

        this.isPlaying = true

        console.log(
          'FOLLOWER PLAYBACK STARTED'
        )
      } catch (error) {
        console.error(
          'FOLLOWER PLAY ERROR:',
          error
        )

        setTimeout(() => {
          this.startFollowerPlayback()
        }, 1000)
      }

      this.isApplyingRemoteState = false
    },

    // ========================================================
    // FOLLOWER PAUSE
    // ========================================================

    pauseFollowerPlayback() {
      if (!this.video) return

      this.isApplyingRemoteState = true

      try {
        if (!this.video.paused) {
          console.log(
            'FOLLOWER PAUSING PLAYBACK'
          )

          this.video.pause()
        }

        this.isPlaying = false
      } catch (error) {
        console.error(
          'FOLLOWER PAUSE ERROR:',
          error
        )
      }

      this.isApplyingRemoteState = false
    },

    // ========================================================
    // SYNC LOOP
    // ========================================================

    startSync() {
      console.log(
        'VIDEO SYNC LOOP STARTED'
      )

      this.stopSync()

      this.syncInterval =
        setInterval(() => {
          this.syncTick()
        }, 1000)
    },

    stopSync() {
      if (this.syncInterval) {
        clearInterval(
          this.syncInterval
        )

        this.syncInterval = null
      }

      console.log(
        'VIDEO SYNC LOOP STOPPED'
      )
    },

    // ========================================================
    // SYNC TICK
    // ========================================================

    syncTick() {
      if (!this.video) return

      if (this.role !== 'leader') {
        return
      }

      if (!this.syncChannel) {
        return
      }

      const position =
        this.video.currentTime

      const playing =
        !this.video.paused

      if (
        !Number.isFinite(position)
      ) {
        return
      }

      const positionChanged =
        Math.abs(
          position -
            this.lastSentPosition
        ) >= 0.5

      const playingChanged =
        playing !==
        this.lastSentPlaying

      if (
        positionChanged ||
        playingChanged
      ) {
        this.sendPlaybackState()
      }
    },

    // ========================================================
    // DISCONNECT
    // ========================================================

    disconnectSyncServer() {
      console.log(
        'DISCONNECTING FROM PUSHER'
      )

      try {
        if (this.pusher) {
          this.pusher.disconnect()
        }
      } catch (error) {
        console.error(
          'PUSHER DISCONNECT ERROR:',
          error
        )
      }

      this.syncChannel = null
      this.pusher = null
    },

    // ========================================================
    // REMOVE VIDEO
    // ========================================================

    removeVideo() {
  console.log('REMOVING VIDEO')

  try {
    if (this.hls) {
      this.hls.destroy()
    }
  } catch (error) {
    console.error(
      'HLS DESTROY ERROR:',
      error
    )
  }

  this.hls = null

  try {
    if (this.video) {
      this.video.pause()

      this.video.removeAttribute('src')

      this.video.load()

      if (this.video.parentNode) {
        this.video.parentNode.removeChild(
          this.video
        )
      }
    }
  } catch (error) {
    console.error(
      'VIDEO REMOVE ERROR:',
      error
    )
  }

  this.video = null
},
  },
})