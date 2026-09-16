import Blits from '@lightningjs/blits'
import Hls from 'hls.js'

const VIDEO_URL =
  'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'

export default Blits.Component('VideoSyncTimelinePoc', {
  template: `
    <Element
      w="1920"
      h="1080"
      color="#000000"
    >

      <!-- STATUS -->
      <Element
        x="40"
        y="30"
        w="1840"
        h="60"
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

      <!-- TIMELINE -->
      <Element
        x="40"
        y="100"
        w="600"
        h="650"
        color="#000000"
        alpha="0.75"
      >
        <Text
          x="20"
          y="20"
          :content="$timelineText"
          size="28"
          color="#ffffff"
          fontFace="lato"
        />
      </Element>

      <!-- INSTRUCTION -->
      <Element
        x="40"
        y="970"
        w="1840"
        h="70"
      >
        <Text
          x="0"
          y="0"
          :content="$instructionText"
          size="22"
          color="#aaaaaa"
          fontFace="lato"
        />
      </Element>

    </Element>
  `,

  state() {
    return {
      statusText: 'Loading video...',

      timelineText:
        'VIDEO POSITION\n00:00 / 00:00\n\n' +
        'COMMON TIMELINE\n00:00\n\n' +
        'TARGET POSITION\n00:00\n\n' +
        'DRIFT\n0.00 sec\n\n' +
        'STATUS\nLOADING',

      instructionText:
        'Common timeline synchronization POC',

      video: null,
      timelineOverlay: null,

      hls: null,

      timelineInterval: null,

      commonTimelineStart: null,

      commonTimelineRunning: false,

      serverClockOffset: 0,

      initialSyncDone: false,

      syncInProgress: false,

      buffering: false,

      userPaused: false,
    }
  },

  hooks: {
    async ready() {
      console.log(
        '================================================'
      )

      console.log(
        'HLS VIDEO SYNC POC READY'
      )

      console.log(
        '================================================'
      )

      await this.startCommonTimeline()

      this.createVideo()

      this.$focus()
    },

    destroy() {
      console.log(
        'HLS VIDEO SYNC POC DESTROY'
      )

      this.stopTimelineLogging()

      this.removeVideo()
    },
  },
// input: {
//   space() {
//     this.togglePlayPause()
//   },

//   any(e) {
//     // Android TV Play/Pause key
//     if (
//       e.keyCode === 85 ||
//       e.key === 'MediaPlayPause'
//     ) {
//       this.togglePlayPause()
//     }
//   },
// },
  methods: {
    // ============================================================
    // COMMON TIMELINE
    // ============================================================
togglePlayPause() {
  if (!this.video) {
    return
  }

  if (this.video.paused) {
    console.log(
      'POC: MANUAL PLAY - SYNCING TO COMMON TIMELINE'
    )

    this.userPaused = false

    this.syncToCommonTimeline(
      'MANUAL_PLAY'
    )

    return
  }

  console.log(
    'POC: MANUAL PAUSE'
  )

  this.userPaused = true

  this.video.pause()

  this.statusText = 'Paused'

  this.updateTimelineDisplay()
},
    async startCommonTimeline() {
      if (this.commonTimelineRunning) {
        return
      }

      console.log(
        'POC: GETTING COMMON TIMELINE FROM SYNC SERVER'
      )

      try {
        const response = await fetch(
          'http://192.168.29.250:3001/session'
        )

        if (!response.ok) {
          throw new Error(
            `Sync server returned HTTP ${response.status}`
          )
        }

        const session =
          await response.json()

        const commonTimelineStart =
          Number(
            session.commonTimelineStart
          )

        const serverNow =
          Number(
            session.serverNow
          )

        const localNow =
          Date.now()

        if (
          !Number.isFinite(
            commonTimelineStart
          ) ||
          !Number.isFinite(
            serverNow
          )
        ) {
          throw new Error(
            'Invalid session data from sync server'
          )
        }

        const serverOffset =
          serverNow - localNow

        this.commonTimelineStart =
          commonTimelineStart

        this.serverClockOffset =
          serverOffset

        this.commonTimelineRunning =
          true

        const currentCommonPosition =
          (
            serverNow -
            commonTimelineStart
          ) / 1000

        console.log(
          'COMMON TIMELINE CLOCK SYNC:',
          {
            commonTimelineStart,
            serverNow,
            localNow,
            serverOffset,
            currentCommonPosition,
          }
        )

      } catch (error) {
        console.error(
          'FAILED TO GET COMMON TIMELINE:',
          error
        )

        this.statusText =
          'Unable to connect to sync server'
      }
    },

    getCommonPosition() {
      if (
        !this.commonTimelineRunning ||
        this.commonTimelineStart === null
      ) {
        return 0
      }

      const synchronizedNow =
        Date.now() +
        this.serverClockOffset

      const commonPosition =
        (
          synchronizedNow -
          this.commonTimelineStart
        ) / 1000

      return Math.max(
        0,
        commonPosition
      )
    },

    getLoopPosition(duration) {
      const commonPosition =
        this.getCommonPosition()

      if (
        !Number.isFinite(duration) ||
        duration <= 0
      ) {
        return 0
      }

      return (
        commonPosition % duration
      )
    },

    // ============================================================
    // TIME FORMAT
    // ============================================================

    formatTime(seconds) {
      if (
        !Number.isFinite(seconds) ||
        seconds < 0
      ) {
        return '00:00'
      }

      const totalSeconds =
        Math.floor(seconds)

      const minutes =
        Math.floor(
          totalSeconds / 60
        )

      const remainingSeconds =
        totalSeconds % 60

      return (
        String(minutes).padStart(2, '0') +
        ':' +
        String(remainingSeconds).padStart(2, '0')
      )
    },

    // ============================================================
    // VIDEO CREATION
    // ============================================================

    createVideo() {
      console.log(
        'POC: CREATING HTML5 VIDEO'
      )

      const video =
        document.createElement('video')

      video.id =
        'hls-video-sync-poc'

      // ----------------------------------------------------------
      // FULL SCREEN
      // ----------------------------------------------------------

// VIDEO LAYOUT
// VIDEO LAYOUT
video.style.position = 'fixed'
video.style.left = '40px'
video.style.top = '100px'
video.style.width = 'calc(100vw - 80px)'
video.style.height = 'auto'
video.style.aspectRatio = '16 / 9'
video.style.objectFit = 'contain'
video.style.aspectRatio = '16 / 9'
video.style.backgroundColor = '#000000'
video.style.zIndex = '10'  
      // ----------------------------------------------------------
      // PLAYBACK
      // ----------------------------------------------------------

      video.autoplay =
        true

      video.muted =
        true

      // No native controls.
      video.controls =
        false

      video.playsInline =
        true

      video.preload =
        'auto'

      // We calculate looping ourselves
      // from the common timeline.
      video.loop =
        false

      this.video =
        video

      document.body.appendChild(
        video
      )
      const timelineOverlay = document.createElement('div')

timelineOverlay.id = 'video-sync-timeline-overlay'

timelineOverlay.style.position = 'fixed'
timelineOverlay.style.left = '40px'
timelineOverlay.style.top = '40px'
timelineOverlay.style.width = '420px'
timelineOverlay.style.padding = '20px'
timelineOverlay.style.boxSizing = 'border-box'

timelineOverlay.style.backgroundColor =
  'rgba(0, 0, 0, 0.75)'

timelineOverlay.style.color =
  '#ffffff'

timelineOverlay.style.fontFamily =
  'Arial, sans-serif'

timelineOverlay.style.fontSize =
  '26px'

timelineOverlay.style.lineHeight =
  '1.5'

timelineOverlay.style.zIndex =
  '9999'

timelineOverlay.style.borderRadius =
  '8px'

timelineOverlay.style.pointerEvents =
  'none'

document.body.appendChild(
  timelineOverlay
)

this.timelineOverlay =
  timelineOverlay

      this.attachVideoEvents()

      this.loadVideo()
    },

    // ============================================================
    // VIDEO EVENTS
    // ============================================================

    attachVideoEvents() {
      if (!this.video) {
        return
      }

      this.video.addEventListener(
        'loadedmetadata',
        () => {
          console.log(
            'POC: VIDEO METADATA LOADED'
          )

          console.log(
            'VIDEO DURATION:',
            this.video.duration
          )

          this.statusText =
            'Video metadata loaded'

          this.updateTimelineDisplay()
        }
      )

      this.video.addEventListener(
  'canplay',
  () => {
    console.log(
      'POC: VIDEO CAN PLAY'
    )

    this.statusText =
      'Video ready'

    // ----------------------------------------------------------
    // INITIAL SYNCHRONIZATION
    // ----------------------------------------------------------

    if (!this.initialSyncDone) {
      console.log(
        'POC: INITIAL SYNC START'
      )

      this.syncToCommonTimeline(
        'INITIAL_CAN_PLAY'
      )

      // Give the browser/HLS a moment to apply
      // the initial seek before marking sync complete.
      setTimeout(() => {
        if (!this.video) {
          return
        }

        console.log(
          'POC: INITIAL SYNC RESULT:',
          {
            currentPosition:
              this.video.currentTime,

            targetPosition:
              this.getLoopPosition(
                this.video.duration
              ),

            drift:
              this.video.currentTime -
              this.getLoopPosition(
                this.video.duration
              )
          }
        )

        this.initialSyncDone =
          true

        this.updateTimelineDisplay()
      }, 500)

      return
    }

    // ----------------------------------------------------------
    // BUFFER RECOVERY
    // ----------------------------------------------------------

    if (this.buffering) {
      console.log(
        'POC: VIDEO RECOVERED FROM BUFFERING'
      )

      this.syncToCommonTimeline(
        'BUFFER_RECOVERY'
      )
    }

    this.updateTimelineDisplay()
  }
)
      this.video.addEventListener(
        'playing',
        () => {
          console.log(
            'POC: VIDEO PLAYING'
          )

          this.buffering =
            false

          this.statusText =
            'Playing'

        
          this.updateTimelineDisplay()
        }
      )

      this.video.addEventListener(
        'waiting',
        () => {
          console.log(
            'POC: VIDEO BUFFERING'
          )

          console.log(
            'COMMON TIMELINE CONTINUES:',
            this.getCommonPosition()
          )

          this.buffering =
            true

          this.statusText =
            'Buffering'

          this.updateTimelineDisplay()
        }
      )

      this.video.addEventListener(
        'stalled',
        () => {
          console.log(
            'POC: VIDEO STALLED'
          )

          this.buffering =
            true

          this.statusText =
            'Network stalled'

          this.updateTimelineDisplay()
        }
      )

      this.video.addEventListener(
        'ended',
        () => {
          console.log(
            'POC: VIDEO ENDED'
          )

          console.log(
            'COMMON TIMELINE:',
            this.getCommonPosition()
          )

          // Never simply go to zero.
          // Calculate the current loop position.
          this.syncToCommonTimeline(
            'VIDEO_ENDED'
          )

          if (
            this.video &&
            this.video.paused
          ) {
            this.video.play().catch(
              (error) => {
                console.error(
                  'PLAY AFTER LOOP FAILED:',
                  error
                )
              }
            )
          }
        }
      )

      this.video.addEventListener(
        'timeupdate',
        () => {
          this.updateTimelineDisplay()
        }
      )

      this.video.addEventListener(
        'error',
        (event) => {
          console.error(
            'POC: VIDEO ERROR:',
            event
          )

          console.error(
            'VIDEO ERROR OBJECT:',
            this.video.error
          )

          this.statusText =
            'Video error'

          this.updateTimelineDisplay()
        }
      )
    },

    // ============================================================
    // SYNCHRONIZE TO COMMON TIMELINE
    // ============================================================
resetPlaybackRate() {
  if (
    this.video &&
    this.video.playbackRate !== 1
  ) {
    this.video.playbackRate = 1
  }
},

resumeIfDue() {
  if (
    this.video &&
    this.video.paused &&
    !this.buffering &&
    !this.userPaused
  ) {
    this.video.play().catch(
      (error) => {
        console.error(
          'PLAY FAILED:',
          error
        )
      }
    )
  }
},
    syncToCommonTimeline(reason) {
  if (
    !this.video ||
    !this.commonTimelineRunning
  ) {
    return
  }

  if (this.syncInProgress) {
    return
  }

  // Don't fight an active rebuffer.
  // Let the player recover first.
  if (
    this.buffering &&
    reason !== 'INITIAL_CAN_PLAY'
  ) {
    return
  }

  const duration =
    this.video.duration

  if (
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return
  }

  const commonPosition =
    this.getCommonPosition()

  const targetPosition =
    this.getLoopPosition(
      duration
    )

  const currentPosition =
    this.video.currentTime

  const drift =
    currentPosition - targetPosition

  const absDrift =
    Math.abs(drift)

  // Below this, no correction is needed.
  const SYNC_THRESHOLD =
    0.2

  // Between 0.2 and 2 seconds,
  // correct using playback speed.
  const RATE_CORRECT_THRESHOLD =
    2

  const RATE_FAST =
    1.05

  const RATE_SLOW =
    0.95

  console.log(
    'POC: COMMON TIMELINE SYNC:',
    {
      reason,
      commonPosition,
      duration,
      currentPosition,
      targetPosition,
      drift,
    }
  )

  // ------------------------------------------------------------
  // 1. SMALL DRIFT
  // ------------------------------------------------------------

  if (
    absDrift <= SYNC_THRESHOLD
  ) {
    this.resetPlaybackRate()

    this.resumeIfDue()

    return
  }

  // ------------------------------------------------------------
  // 2. DRIFT BETWEEN 0.2 AND 2 SECONDS
  // ------------------------------------------------------------

  if (
    absDrift <= RATE_CORRECT_THRESHOLD
  ) {
    // Video is ahead -> slow down.
    // Video is behind -> speed up.

    this.video.playbackRate =
      drift > 0
        ? RATE_SLOW
        : RATE_FAST

    this.resumeIfDue()

    return
  }

  // ------------------------------------------------------------
  // 3. DRIFT GREATER THAN 2 SECONDS
  // ------------------------------------------------------------

  this.resetPlaybackRate()

  this.syncInProgress =
    true

  try {
    console.log(
      'POC: SEEKING TO:',
      targetPosition
    )

    this.video.currentTime =
      targetPosition
  } catch (error) {
    console.error(
      'FAILED TO SET CURRENT TIME:',
      error
    )
  }

  this.syncInProgress =
    false

  this.resumeIfDue()

  this.updateTimelineDisplay()
},

    // ============================================================
    // LOAD HLS VIDEO
    // ============================================================

    loadVideo() {
      if (!this.video) {
        return
      }

      console.log(
        'POC: LOADING HLS VIDEO'
      )

      this.statusText =
        'Loading HLS video...'

      if (Hls.isSupported()) {
        console.log(
          'POC: HLS.JS IS SUPPORTED'
        )

        const hls =
          new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
          })

        this.hls =
          hls

        hls.loadSource(
          VIDEO_URL
        )

        hls.attachMedia(
          this.video
        )

        hls.on(
          Hls.Events.MANIFEST_PARSED,
          () => {
            console.log(
              'POC: HLS MANIFEST PARSED'
            )

            this.statusText =
              'HLS manifest parsed'

            this.updateTimelineDisplay()
          }
        )

        hls.on(
          Hls.Events.LEVEL_LOADED,
          (event, data) => {
            console.log(
              'POC: HLS LEVEL LOADED',
              data
            )
          }
        )

        hls.on(
          Hls.Events.ERROR,
          (event, data) => {
            console.error(
  'POC: HLS ERROR:',
  JSON.stringify(data)
)

            if (
              !data ||
              !data.fatal
            ) {
              return
            }

            if (
              data.type ===
              Hls.ErrorTypes.NETWORK_ERROR
            ) {
              console.log(
                'POC: HLS NETWORK ERROR - RECOVERING'
              )

              this.statusText =
                'Network error - recovering'

              try {
                hls.startLoad()
              } catch (error) {
                console.error(
                  'HLS NETWORK RECOVERY FAILED:',
                  error
                )
              }

              return
            }

            if (
              data.type ===
              Hls.ErrorTypes.MEDIA_ERROR
            ) {
              console.log(
                'POC: HLS MEDIA ERROR - RECOVERING'
              )

              this.statusText =
                'Media error - recovering'

              try {
                hls.recoverMediaError()
              } catch (error) {
                console.error(
                  'HLS MEDIA RECOVERY FAILED:',
                  error
                )
              }

              return
            }

            this.statusText =
              'Fatal HLS error'
          }
        )

        this.startTimelineLogging()

        return
      }

      if (
        this.video.canPlayType(
          'application/vnd.apple.mpegurl'
        )
      ) {
        console.log(
          'POC: NATIVE HLS IS SUPPORTED'
        )

        this.video.src =
          VIDEO_URL

        this.statusText =
          'Native HLS loaded'

        this.startTimelineLogging()

        return
      }

      console.error(
        'POC: HLS NOT SUPPORTED'
      )

      this.statusText =
        'HLS not supported'
    },

    // ============================================================
    // PERIODIC SYNC
    // ============================================================

    startTimelineLogging() {
      this.stopTimelineLogging()

      this.timelineInterval =
        setInterval(
          () => {
            if (!this.video) {
              return
            }

            if (
              this.initialSyncDone &&
              !this.buffering
            ) {
              this.syncToCommonTimeline(
                'PERIODIC_SYNC'
              )
            }

            this.updateTimelineDisplay()
          },
          1000
        )
    },

    stopTimelineLogging() {
      if (
        this.timelineInterval
      ) {
        clearInterval(
          this.timelineInterval
        )

        this.timelineInterval =
          null
      }
    },

    // ============================================================
    // DISPLAY
    // ============================================================

    updateTimelineDisplay() {
  if (
    !this.video ||
    !this.timelineOverlay
  ) {
    return
  }

  const currentTime =
    this.video.currentTime

  const duration =
    Number.isFinite(this.video.duration)
      ? this.video.duration
      : 0

  const commonPosition =
    this.getCommonPosition()

  const targetPosition =
    this.getLoopPosition(duration)

  const drift =
    currentTime - targetPosition

  const progress =
    duration > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (currentTime / duration) * 100
          )
        )
      : 0

  let status =
    'PLAYING'

  if (this.buffering) {
    status =
      'BUFFERING'
  } else if (this.video.paused) {
    status =
      'WAITING'
  }

  this.timelineOverlay.innerHTML = `
    <div style="font-size:30px;font-weight:bold;margin-bottom:8px;">
      VIDEO
    </div>

    <div style="font-size:32px;font-weight:bold;">
      ${this.formatTime(currentTime)}
      /
      ${this.formatTime(duration)}
    </div>

    <div style="
      width:100%;
      height:10px;
      background:#555;
      margin-top:12px;
      margin-bottom:18px;
      border-radius:5px;
      overflow:hidden;
    ">
      <div style="
        width:${progress}%;
        height:100%;
        background:#ffffff;
      "></div>
    </div>

    <div style="font-size:24px;">
      COMMON: ${this.formatTime(commonPosition)}
    </div>

    <div style="font-size:24px;">
      TARGET: ${this.formatTime(targetPosition)}
    </div>

    <div style="font-size:24px;">
      DRIFT:
      ${drift >= 0 ? '+' : ''}
      ${drift.toFixed(2)} sec
    </div>

    <div style="
      font-size:22px;
      margin-top:8px;
    ">
      STATUS: ${status}
    </div>
  `
},
    // ============================================================
    // CLEANUP
    // ============================================================

    removeVideo() {
      console.log(
        'POC: REMOVING VIDEO'
      )

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

      this.hls =
        null

      try {
        if (this.video) {
          this.video.pause()

          this.video.removeAttribute(
            'src'
          )

          this.video.load()

          if (
            this.video.parentNode
          ) {
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
      if (this.timelineOverlay) {
  this.timelineOverlay.remove()
  this.timelineOverlay = null
}
      this.video =
        null
    },
  },
})