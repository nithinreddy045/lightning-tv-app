import Blits from '@lightningjs/blits'
import Hls from 'hls.js'

import { getSyncServerUrl } from '../utils/syncServer.js'



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

      instructionText: 'Common timeline synchronization POC',

      video: null,
      timelineOverlay: null,

      hls: null,

      timelineInterval: null,

      clockResyncInterval: null,

      commonTimelineStart: null,

      commonTimelineRunning: false,

      serverClockOffset: 0,

      playlist: [],

      playlistVersion: 1,

      /*
       * These two values define where the current
       * playlist version starts on the common timeline.
       *
       * They come from the sync server.
       */
      playlistCycleStartCommonPosition: 0,

      playlistCycleStartIndex: 0,

      pendingVideos: [],

      currentVideoIndex: 0,

      playlistDurations: [],

      playlistTotalDuration: 0,

      playlistLoaded: false,

      playlistPollInterval: null,

      streamStopped: false,

      initialSyncDone: false,

      syncInProgress: false,

      buffering: false,

      userPaused: false,
    }
  },

  hooks: {
    async ready() {
      console.log('================================================')

      console.log('HLS VIDEO SYNC POC READY')

      console.log('================================================')

      await this.startCommonTimeline()

      await this.loadPlaylistDurations()

      this.createVideo()

      /*
       * Keep checking the server for playlist changes.
       *
       * This is required because an old TV must also learn
       * that Video 4 has become part of the active playlist.
       */
      this.startPlaylistPolling()

      this.$focus()
    },

    destroy() {
      console.log('HLS VIDEO SYNC POC DESTROY')

      this.stopTimelineLogging()

      this.stopClockResync()

      this.stopPlaylistPolling()

      this.removeVideo()
    },
  },

  input: {
  space() {
    console.log('SPACE PRESSED')
    this.togglePlayPause()
  },

  any(e) {
    console.log('KEY PRESSED:', e.key)
  },
},

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

        this.syncToPlaylistTimeline(
          'MANUAL_PLAY'
        )

        return
      }

      console.log('POC: MANUAL PAUSE')

      this.userPaused = true

      this.video.pause()

      this.statusText = 'Paused'

      this.updateTimelineDisplay()
    },

    async fetchSyncSession() {
      const controller =
        new AbortController()

      const timeout =
        setTimeout(() => {
          controller.abort()
        }, 5000)

      try {
        const response =
          await fetch(
            getSyncServerUrl(),
            {
              signal: controller.signal,
            }
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

        return {
          commonTimelineStart,

          serverNow,

          playlist:
            Array.isArray(
              session.playlist
            )
              ? session.playlist
              : [],

          playlistVersion:
            Number(
              session.playlistVersion
            ) || 1,

          pendingVideos:
            Array.isArray(
              session.pendingVideos
            )
              ? session.pendingVideos
              : [],

          playlistCycleStartCommonPosition:
            Number(
              session.playlistCycleStartCommonPosition
            ) || 0,

          playlistCycleStartIndex:
            Number(
              session.playlistCycleStartIndex
            ) || 0,

          streaming:
            session.streaming !== false,
        }
      } finally {
        clearTimeout(timeout)
      }
    },

    delay(ms) {
      return new Promise(
        (resolve) => {
          setTimeout(
            resolve,
            ms
          )
        }
      )
    },

    async startCommonTimeline() {
      if (
        this.commonTimelineRunning
      ) {
        return
      }

      console.log(
        'POC: GETTING COMMON TIMELINE FROM SYNC SERVER'
      )

      const MAX_RETRIES = 5

      for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
      ) {
        try {
          const {
            commonTimelineStart,
            serverNow,
            playlist,
            playlistVersion,
            pendingVideos,
            playlistCycleStartCommonPosition,
            playlistCycleStartIndex,
            streaming,
          } =
            await this.fetchSyncSession()

          const localNow =
            Date.now()

          const serverOffset =
            serverNow -
            localNow

          this.commonTimelineStart =
            commonTimelineStart

          this.serverClockOffset =
            serverOffset

          this.playlist =
            playlist

          this.playlistVersion =
            playlistVersion

          this.pendingVideos =
            pendingVideos

          this.playlistCycleStartCommonPosition =
            playlistCycleStartCommonPosition

          this.playlistCycleStartIndex =
            playlistCycleStartIndex

          this.streamStopped =
            !streaming

          // Save sync data locally for offline recovery.
          localStorage.setItem(
            'playlist',
            JSON.stringify(
              this.playlist
            )
          )

          localStorage.setItem(
            'playlistVersion',
            String(
              this.playlistVersion
            )
          )

          localStorage.setItem(
            'playlistCycleStartCommonPosition',
            String(
              this.playlistCycleStartCommonPosition
            )
          )

          localStorage.setItem(
            'playlistCycleStartIndex',
            String(
              this.playlistCycleStartIndex
            )
          )

          localStorage.setItem(
            'serverClockOffset',
            String(
              this.serverClockOffset
            )
          )

          localStorage.setItem(
            'commonTimelineStart',
            String(
              this.commonTimelineStart
            )
          )

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

              playlistVersion:
                this.playlistVersion,

              playlistCycleStartCommonPosition:
                this.playlistCycleStartCommonPosition,

              playlistCycleStartIndex:
                this.playlistCycleStartIndex,
            }
          )

          this.startClockResync()

          return

        } catch (error) {
          console.error(
            `FAILED TO GET COMMON TIMELINE (attempt ${attempt}/${MAX_RETRIES}):`,
            error
          )

          // Try saved timeline after all server retries fail.
          if (
            attempt ===
            MAX_RETRIES
          ) {
            const savedTimeline =
              localStorage.getItem(
                'commonTimelineStart'
              )

            const savedPlaylist =
              localStorage.getItem(
                'playlist'
              )

            if (
              savedTimeline &&
              savedPlaylist
            ) {
              const savedTimelineStart =
                Number(
                  savedTimeline
                )

              let parsedPlaylist =
                []

              try {
                parsedPlaylist =
                  JSON.parse(
                    savedPlaylist
                  )
              } catch (error) {
                console.error(
                  'FAILED TO PARSE SAVED PLAYLIST:',
                  error
                )
              }

              if (
                Number.isFinite(
                  savedTimelineStart
                ) &&
                Array.isArray(
                  parsedPlaylist
                ) &&
                parsedPlaylist.length >
                  0
              ) {
                this.commonTimelineStart =
                  savedTimelineStart

                const savedServerOffset =
                  localStorage.getItem(
                    'serverClockOffset'
                  )

                this.serverClockOffset =
                  savedServerOffset
                    ? Number(
                        savedServerOffset
                      )
                    : 0

                this.playlist =
                  parsedPlaylist

                const savedPlaylistVersion =
                  localStorage.getItem(
                    'playlistVersion'
                  )

                this.playlistVersion =
                  savedPlaylistVersion
                    ? Number(
                        savedPlaylistVersion
                      )
                    : 1

                const savedCycleStart =
                  localStorage.getItem(
                    'playlistCycleStartCommonPosition'
                  )

                this.playlistCycleStartCommonPosition =
                  savedCycleStart
                    ? Number(
                        savedCycleStart
                      )
                    : 0

                const savedCycleIndex =
                  localStorage.getItem(
                    'playlistCycleStartIndex'
                  )

                this.playlistCycleStartIndex =
                  savedCycleIndex
                    ? Number(
                        savedCycleIndex
                      )
                    : 0

                this.pendingVideos =
                  []

                this.streamStopped =
                  false

                this.commonTimelineRunning =
                  true

                console.log(
                  'POC: USING SAVED SYNC DATA:',
                  {
                    commonTimelineStart:
                      savedTimelineStart,

                    playlistLength:
                      this.playlist.length,

                    playlist:
                      this.playlist,

                    playlistVersion:
                      this.playlistVersion,

                    playlistCycleStartCommonPosition:
                      this.playlistCycleStartCommonPosition,

                    playlistCycleStartIndex:
                      this.playlistCycleStartIndex,
                  }
                )

                return
              }
            }
          }

          this.statusText =
            attempt <
            MAX_RETRIES
              ? `Unable to connect to sync server, retrying (${attempt}/${MAX_RETRIES})...`
              : 'Unable to connect to sync server'

          if (
            attempt <
            MAX_RETRIES
          ) {
            await this.delay(
              1000 *
              attempt
            )
          }
        }
      }
    },

    async resyncServerClock() {
      if (
        !this.commonTimelineRunning
      ) {
        return
      }

      try {
        const {
          serverNow,
          streaming,
        } =
          await this.fetchSyncSession()

        const localNow =
          Date.now()

        this.serverClockOffset =
          serverNow -
          localNow

        localStorage.setItem(
          'serverClockOffset',
          String(
            this.serverClockOffset
          )
        )

        this.streamStopped =
          !streaming

        console.log(
          'POC: SERVER CLOCK RESYNCED',
          this.serverClockOffset
        )
      } catch (error) {
        console.error(
          'POC: SERVER CLOCK RESYNC FAILED:',
          error
        )
      }
    },

    startClockResync() {
      this.stopClockResync()

      this.clockResyncInterval =
        setInterval(() => {
          this.resyncServerClock()
        }, 60000)
    },

    stopClockResync() {
      if (
        this.clockResyncInterval
      ) {
        clearInterval(
          this.clockResyncInterval
        )

        this.clockResyncInterval =
          null
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
        !Number.isFinite(
          duration
        ) ||
        duration <= 0
      ) {
        return 0
      }

      return (
        commonPosition %
        duration
      )
    },

    // ============================================================
    // PLAYLIST SERVER POLLING
    // ============================================================

    startPlaylistPolling() {
      this.stopPlaylistPolling()

      this.playlistPollInterval =
        setInterval(() => {
          this.refreshPlaylistFromServer()
        }, 2000)
    },

    stopPlaylistPolling() {
      if (
        this.playlistPollInterval
      ) {
        clearInterval(
          this.playlistPollInterval
        )

        this.playlistPollInterval =
          null
      }
    },
applyStreamingState(streaming, reason) {
  const shouldBeStopped =
    streaming === false

  const wasStopped =
    this.streamStopped

  this.streamStopped =
    shouldBeStopped

  // Server STOP
  if (
    shouldBeStopped &&
    !wasStopped
  ) {
    console.log(
      'POC: SERVER STOP - PAUSING VIDEO'
    )

    this.resetPlaybackRate()

    if (
      this.video &&
      !this.video.paused
    ) {
      this.video.pause()
    }

    this.statusText =
      'Streaming stopped'

    this.updateTimelineDisplay()

    return
  }

  // Server START
  if (
    !shouldBeStopped &&
    wasStopped
  ) {
    console.log(
      'POC: SERVER START - SYNCING TO COMMON TIMELINE'
    )

    this.statusText =
      'Syncing...'

    this.syncToPlaylistTimeline(
      reason || 'STREAMING_STARTED'
    )

    this.updateTimelineDisplay()
  }
},
    async refreshPlaylistFromServer() {
      if (
        !this.commonTimelineRunning
      ) {
        return
      }

      try {
        const {
          playlist,
          playlistVersion,
          pendingVideos,
          playlistCycleStartCommonPosition,
          playlistCycleStartIndex,
          streaming,
        } =
          await this.fetchSyncSession()

        this.pendingVideos =
  pendingVideos

this.applyStreamingState(
  streaming,
  'STREAMING_STARTED'
)

        /*
         * Nothing changed.
         */
        if (
          Number(
            playlistVersion
          ) ===
          Number(
            this.playlistVersion
          )
        ) {
          return
        }

        /*
         * Playlist changed.
         *
         * IMPORTANT:
         * We update ALL playlist timeline metadata before
         * calculating the target position.
         */
        console.log(
          'POC: PLAYLIST VERSION CHANGED:',
          {
            oldVersion:
              this.playlistVersion,

            newVersion:
              playlistVersion,

            playlist,

            playlistCycleStartCommonPosition,

            playlistCycleStartIndex,
          }
        )

        this.playlist =
          playlist

        this.playlistVersion =
          playlistVersion

        this.playlistCycleStartCommonPosition =
          playlistCycleStartCommonPosition

        this.playlistCycleStartIndex =
          playlistCycleStartIndex

        localStorage.setItem(
          'playlist',
          JSON.stringify(
            this.playlist
          )
        )

        localStorage.setItem(
          'playlistVersion',
          String(
            this.playlistVersion
          )
        )

        localStorage.setItem(
          'playlistCycleStartCommonPosition',
          String(
            this.playlistCycleStartCommonPosition
          )
        )

        localStorage.setItem(
          'playlistCycleStartIndex',
          String(
            this.playlistCycleStartIndex
          )
        )

        /*
         * Video 4 has a different playlist duration.
         * Reload durations before calculating the target.
         */
        await this.loadPlaylistDurations()

        /*
         * Now every TV calculates its position from
         * the same server-provided playlist activation point.
         */
        await this.syncToPlaylistTimeline(
          'PLAYLIST_VERSION_CHANGED'
        )

      } catch (error) {
        console.error(
          'POC: PLAYLIST POLLING FAILED:',
          error
        )
      }
    },

    // ============================================================
    // PLAYBACK STATE REPORTING
    // ============================================================

    async reportPlaybackState() {
      if (
        !this.video ||
        !this.playlistLoaded ||
        !this.playlist[
          this.currentVideoIndex
        ]
      ) {
        return
      }

      try {
        const endpoint =
          getSyncServerUrl().replace(
            /\/session$/,
            '/playback-state'
          )

        await fetch(
          endpoint,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              videoId:
                this.playlist[
                  this.currentVideoIndex
                ].id,

              position:
                Number(
                  this.video.currentTime
                ) || 0,

              duration:
                Number(
                  this.video.duration
                ) || 0,

              commonPosition:
                this.getCommonPosition(),

              playlistTotalDuration:
                this.playlistTotalDuration,
            }),
          }
        )
      } catch (error) {
        console.error(
          'POC: PLAYBACK STATE REPORT FAILED:',
          error
        )
      }
    },

    // ============================================================
    // PLAYLIST DURATIONS
    // ============================================================

    async loadPlaylistDurations() {
      if (
        !this.playlist ||
        this.playlist.length === 0
      ) {
        return
      }

      console.log(
        'POC: LOADING PLAYLIST DURATIONS'
      )

      const durations =
        []

      for (
        const item of this.playlist
      ) {
        try {
          const duration =
            await this.getVideoDuration(
              item.url
            )

          console.log(
            `POC: VIDEO DURATION - ${item.title}:`,
            duration
          )

          durations.push(
            duration
          )

        } catch (error) {
          console.error(
            `POC: FAILED TO GET DURATION - ${item.title}:`,
            error
          )

          durations.push(
            0
          )
        }
      }

      this.playlistDurations =
        durations

      this.playlistTotalDuration =
        durations.reduce(
          (
            total,
            duration
          ) =>
            total +
            duration,
          0
        )

      this.playlistLoaded =
        true

      console.log(
        'POC: PLAYLIST DURATIONS:',
        durations
      )

      console.log(
        'POC: PLAYLIST TOTAL DURATION:',
        this.playlistTotalDuration
      )
    },

    // ============================================================
    // SWITCH PLAYLIST VIDEO
    // ============================================================

    switchToPlaylistVideo(
      videoIndex,
      position
    ) {
      if (
        !this.playlist ||
        !this.playlist[
          videoIndex
        ] ||
        !this.video
      ) {
        return
      }

      const videoItem =
        this.playlist[
          videoIndex
        ]

      console.log(
        'POC: SWITCHING PLAYLIST VIDEO:',
        videoItem.title,
        'POSITION:',
        position
      )

      this.currentVideoIndex =
        videoIndex

      /*
       * Destroy the current HLS instance.
       */
      if (
        this.hls
      ) {
        this.hls.destroy()

        this.hls =
          null
      }

      this.video.pause()

      const videoUrl =
        videoItem.url

      if (
        Hls.isSupported()
      ) {
        const hls =
          new Hls({
            enableWorker:
              true,

            lowLatencyMode:
              false,

            backBufferLength:
              90,

            maxBufferLength:
              30,

            maxMaxBufferLength:
              60,
          })

        this.hls =
          hls

        hls.loadSource(
          videoUrl
        )

        hls.attachMedia(
          this.video
        )

        hls.on(
          Hls.Events.MANIFEST_PARSED,
          () => {
            console.log(
              'POC: PLAYLIST VIDEO READY:',
              videoItem.title
            )

            if (
              this.video
            ) {
              this.video.currentTime =
                position

              this.video.play()
                .catch(
                  (error) => {
                    console.error(
                      'POC: PLAY FAILED AFTER PLAYLIST SWITCH:',
                      error
                    )
                  }
                )
            }
          }
        )

        hls.on(
          Hls.Events.ERROR,
          (
            event,
            data
          ) => {
            console.error(
              'POC: PLAYLIST HLS ERROR:',
              JSON.stringify(
                data
              )
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
              hls.startLoad()

              return
            }

            if (
              data.type ===
              Hls.ErrorTypes.MEDIA_ERROR
            ) {
              hls.recoverMediaError()
            }
          }
        )

        return
      }

      if (
        this.video.canPlayType(
          'application/vnd.apple.mpegurl'
        )
      ) {
        this.video.src =
          videoUrl

        this.video.currentTime =
          position

        this.video.play()
          .catch(
            (error) => {
              console.error(
                'POC: NATIVE PLAY FAILED:',
                error
              )
            }
          )
      }
    },

    // ============================================================
    // SINGLE PLAYLIST SYNCHRONIZATION METHOD
    // ============================================================

    syncToPlaylistTimeline(
      reason
    ) {
      if (
        !this.video ||
        !this.playlistLoaded ||
        this.streamStopped ||
        !this.commonTimelineRunning
      ) {
        return
      }

      if (
        this.syncInProgress
      ) {
        return
      }

      const {
        videoIndex,
        position:
          targetPosition,
      } =
        this.getPlaylistPosition()
        console.log('========== SYNC DEBUG ==========')
console.log('COMMON POSITION:', this.getCommonPosition())
console.log('PLAYLIST:', this.playlist)
console.log('PLAYLIST VERSION:', this.playlistVersion)
console.log('CYCLE START POSITION:', this.playlistCycleStartCommonPosition)
console.log('CYCLE START INDEX:', this.playlistCycleStartIndex)
console.log('CALCULATED VIDEO INDEX:', videoIndex)
console.log('CURRENT VIDEO INDEX:', this.currentVideoIndex)
console.log('TARGET POSITION:', targetPosition)
console.log('================================')

      /*
       * If the common timeline says another video
       * should be playing, switch first.
       */
      if (
        videoIndex !==
        this.currentVideoIndex
      ) {
        console.log(
          'POC: PLAYLIST VIDEO CHANGE:',
          {
            from:
              this.currentVideoIndex,

            to:
              videoIndex,

            reason,
          }
        )

        this.initialSyncDone =
          false

        this.switchToPlaylistVideo(
          videoIndex,
          targetPosition
        )

        return
      }

      if (
        this.video.readyState <
        1
      ) {
        return
      }

      const currentPosition =
        this.video.currentTime

      const drift =
        currentPosition -
        targetPosition

      const absDrift =
        Math.abs(
          drift
        )

      const SYNC_THRESHOLD =
        0.2

      const RATE_CORRECT_THRESHOLD =
        2

      const RATE_FAST =
        1.05

      const RATE_SLOW =
        0.95

      console.log(
        'POC: PLAYLIST SYNC:',
        {
          reason,

          videoIndex,

          currentPosition,

          targetPosition,

          drift,
        }
      )

      /*
       * 1.
       * Drift <= 0.2 sec
       *
       * Normal playback.
       */
      if (
        absDrift <=
        SYNC_THRESHOLD
      ) {
        this.resetPlaybackRate()

        this.resumeIfDue()

        return
      }

      /*
       * 2.
       * Drift between 0.2 and 2 sec
       *
       * Behind -> 1.05x
       * Ahead  -> 0.95x
       */
      if (
        absDrift <=
        RATE_CORRECT_THRESHOLD
      ) {
        this.video.playbackRate =
          drift > 0
            ? RATE_SLOW
            : RATE_FAST

        this.resumeIfDue()

        return
      }

      /*
       * 3.
       * Drift greater than 2 sec
       *
       * Hard seek.
       */
      this.resetPlaybackRate()

      this.syncInProgress =
        true

      try {
        console.log(
          'POC: PLAYLIST SEEKING TO:',
          targetPosition
        )

        this.video.currentTime =
          targetPosition

      } catch (error) {
        console.error(
          'FAILED TO SET PLAYLIST CURRENT TIME:',
          error
        )
      }

      this.syncInProgress =
        false

      this.resumeIfDue()

      this.updateTimelineDisplay()
    },

    resetPlaybackRate() {
      if (
        this.video &&
        this.video.playbackRate !==
          1
      ) {
        this.video.playbackRate =
          1
      }
    },

    resumeIfDue() {
      if (
        this.video &&
        this.video.paused &&
        !this.buffering &&
        !this.userPaused &&
        !this.streamStopped
      ) {
        this.video.play()
          .catch(
            (error) => {
              console.error(
                'PLAY FAILED:',
                error
              )
            }
          )
      }
    },

    // ============================================================
    // GET PLAYLIST POSITION
    // ============================================================

    getPlaylistPosition() {
      const commonPosition =
        this.getCommonPosition()

      if (
        !this.playlist ||
        this.playlist.length === 0 ||
        !this.playlistDurations ||
        this.playlistDurations.length !==
          this.playlist.length
      ) {
        return {
          videoIndex: 0,
          position: 0,
        }
      }

      const totalDuration =
        this.playlistTotalDuration

      if (
        !Number.isFinite(
          totalDuration
        ) ||
        totalDuration <= 0
      ) {
        return {
          videoIndex: 0,
          position: 0,
        }
      }

      /*
       * IMPORTANT:
       *
       * DO NOT use:
       *
       * commonPosition % totalDuration
       *
       * here.
       *
       * That would remap the entire common timeline whenever
       * Video 4 is added.
       *
       * Instead, the server tells us:
       *
       * playlistCycleStartCommonPosition
       *
       * which is the exact common-timeline point at which
       * this playlist version became active.
       *
       * It also tells us:
       *
       * playlistCycleStartIndex
       *
       * which video starts that playlist cycle.
       *
       * Therefore every TV, including a TV that logs in later,
       * calculates the same position.
       */

      const cycleStartPosition =
        Number.isFinite(
          this.playlistCycleStartCommonPosition
        )
          ? this.playlistCycleStartCommonPosition
          : 0

      let cycleStartIndex =
        Number.isInteger(
          this.playlistCycleStartIndex
        )
          ? this.playlistCycleStartIndex
          : 0

      /*
       * Protect against an invalid index.
       */
      cycleStartIndex =
        (
          cycleStartIndex %
          this.playlist.length +
          this.playlist.length
        ) %
        this.playlist.length

      /*
       * Time elapsed since this playlist version
       * became active.
       */
      let elapsed =
        commonPosition -
        cycleStartPosition

      /*
       * If the TV somehow calculates slightly before
       * the activation point, start at the activation point.
       */
      if (
        elapsed < 0
      ) {
        elapsed = 0
      }

      /*
       * Loop inside the CURRENT playlist version.
       */
      elapsed =
        elapsed %
        totalDuration

      /*
       * Walk through the playlist starting from
       * the server-defined cycle start index.
       */
      for (
        let offset = 0;
        offset <
          this.playlist.length;
        offset++
      ) {
        const videoIndex =
          (
            cycleStartIndex +
            offset
          ) %
          this.playlist.length

        const duration =
          Number(
            this.playlistDurations[
              videoIndex
            ]
          ) || 0

        if (
          duration <= 0
        ) {
          continue
        }

        if (
          elapsed <
          duration
        ) {
          return {
            videoIndex,

            position:
              elapsed,
          }
        }

        elapsed -=
          duration
      }

      /*
       * Safety fallback.
       */
      return {
        videoIndex:
          cycleStartIndex,

        position: 0,
      }
    },

    // ============================================================
    // TIME FORMAT
    // ============================================================

    formatTime(seconds) {
      if (
        !Number.isFinite(
          seconds
        ) ||
        seconds < 0
      ) {
        return '00:00'
      }

      const totalSeconds =
        Math.floor(
          seconds
        )

      const minutes =
        Math.floor(
          totalSeconds /
          60
        )

      const remainingSeconds =
        totalSeconds %
        60

      return (
        String(
          minutes
        ).padStart(
          2,
          '0'
        ) +
        ':' +
        String(
          remainingSeconds
        ).padStart(
          2,
          '0'
        )
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
        document.createElement(
          'video'
        )

      video.id =
        'hls-video-sync-poc'

      // ----------------------------------------------------------
      // VIDEO LAYOUT
      // ----------------------------------------------------------

      video.style.position =
        'fixed'

      video.style.left =
        '40px'

      video.style.top =
        '100px'

      video.style.width =
        'calc(100vw - 80px)'

      video.style.height =
        'auto'

      video.style.aspectRatio =
        '16 / 9'

      video.style.objectFit =
        'contain'

      video.style.aspectRatio =
        '16 / 9'

      video.style.backgroundColor =
        '#000000'

      video.style.zIndex =
        '10'

      // ----------------------------------------------------------
      // PLAYBACK
      // ----------------------------------------------------------

      video.autoplay =
        false

      video.muted =
        true

      video.controls =
        false

      video.playsInline =
        true

      video.preload =
        'auto'

      /*
       * We calculate looping ourselves
       * from the common timeline.
       */
      video.loop =
        false

      this.video =
        video

      document.body.appendChild(
        video
      )

      const timelineOverlay =
        document.createElement(
          'div'
        )

      timelineOverlay.id =
        'video-sync-timeline-overlay'

      timelineOverlay.style.position =
        'fixed'

      timelineOverlay.style.left =
        '40px'

      timelineOverlay.style.top =
        '40px'

      timelineOverlay.style.width =
        '420px'

      timelineOverlay.style.padding =
        '20px'

      timelineOverlay.style.boxSizing =
        'border-box'

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
      if (
        !this.video
      ) {
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

          // --------------------------------------------------------
          // INITIAL SYNCHRONIZATION
          // --------------------------------------------------------

          if (
            !this.initialSyncDone
          ) {
            console.log(
              'POC: INITIAL SYNC START'
            )

            this.syncToPlaylistTimeline(
              'INITIAL_CAN_PLAY'
            )

            /*
             * Give HLS/browser time to apply
             * the initial seek.
             */
            setTimeout(
              () => {
                if (
                  !this.video
                ) {
                  return
                }

                const target =
                  this.getPlaylistPosition()

                console.log(
                  'POC: INITIAL SYNC RESULT:',
                  {
                    currentPosition:
                      this.video.currentTime,

                    targetPosition:
                      target.position,

                    drift:
                      this.video.currentTime -
                      target.position,
                  }
                )

                this.initialSyncDone =
                  true

                this.updateTimelineDisplay()
              },
              500
            )

            return
          }

          // --------------------------------------------------------
          // BUFFER RECOVERY
          // --------------------------------------------------------

          if (
            this.buffering
          ) {
            console.log(
              'POC: VIDEO RECOVERED FROM BUFFERING'
            )

            this.syncToPlaylistTimeline(
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

          /*
           * Do not simply restart the video.
           *
           * Calculate where the common timeline says
           * playback should currently be.
           */
          this.syncToPlaylistTimeline(
            'VIDEO_ENDED'
          )

          if (
  this.video &&
  this.video.paused &&
  !this.streamStopped
) {
            this.video.play()
              .catch(
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
    // LOAD HLS VIDEO
    // ============================================================

    loadVideo() {
      if (
        !this.video
      ) {
        return
      }

      if (
        !this.playlist ||
        this.playlist.length ===
          0
      ) {
        console.error(
          'POC: PLAYLIST IS EMPTY'
        )

        this.statusText =
          'Playlist is empty'

        return
      }

      /*
       * Initially load Video 1.
       *
       * Initial synchronization will immediately
       * move the TV to the correct playlist video
       * and position.
       */
      const firstVideo =
        this.playlist[0]

      console.log(
        'POC: LOADING PLAYLIST VIDEO:',
        firstVideo
      )

      const videoUrl =
        firstVideo.url

      console.log(
        'POC: LOADING HLS VIDEO'
      )

      this.statusText =
        'Loading HLS video...'

      if (
        Hls.isSupported()
      ) {
        console.log(
          'POC: HLS.JS IS SUPPORTED'
        )

        const hls =
          new Hls({
            enableWorker:
              true,

            lowLatencyMode:
              false,

            backBufferLength:
              90,

            maxBufferLength:
              30,

            maxMaxBufferLength:
              60,
          })

        this.hls =
          hls

        hls.loadSource(
          videoUrl
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
          (
            event,
            data
          ) => {
            console.log(
              'POC: HLS LEVEL LOADED',
              data
            )
          }
        )

        hls.on(
          Hls.Events.ERROR,
          (
            event,
            data
          ) => {
            console.error(
              'POC: HLS ERROR:',
              JSON.stringify(
                data
              )
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
          videoUrl

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
    // GET HLS DURATION
    // ============================================================

    getVideoDuration(url) {
      return new Promise(
        (
          resolve,
          reject
        ) => {
          if (
            !Hls.isSupported()
          ) {
            reject(
              new Error(
                'HLS.js is not supported'
              )
            )

            return
          }

          const tempVideo =
            document.createElement(
              'video'
            )

          tempVideo.muted =
            true

          tempVideo.playsInline =
            true

          tempVideo.preload =
            'metadata'

          const tempHls =
            new Hls({
              enableWorker:
                true,

              lowLatencyMode:
                false,
            })

          let resolved =
            false

          const cleanup =
            () => {
              try {
                tempHls.destroy()
              } catch (
                error
              ) {
                console.error(
                  'TEMP HLS DESTROY ERROR:',
                  error
                )
              }

              tempVideo.removeAttribute(
                'src'
              )

              tempVideo.load()
            }

          tempHls.on(
            Hls.Events.LEVEL_LOADED,
            (
              event,
              data
            ) => {
              if (
                resolved
              ) {
                return
              }

              const duration =
                data.details.totalduration

              if (
                Number.isFinite(
                  duration
                ) &&
                duration > 0
              ) {
                resolved =
                  true

                console.log(
                  'POC: HLS DURATION FOUND:',
                  url,
                  duration
                )

                cleanup()

                resolve(
                  duration
                )
              }
            }
          )

          tempHls.on(
            Hls.Events.ERROR,
            (
              event,
              data
            ) => {
              if (
                resolved ||
                !data ||
                !data.fatal
              ) {
                return
              }

              resolved =
                true

              cleanup()

              reject(
                new Error(
                  `Failed to load HLS duration: ${url}`
                )
              )
            }
          )

          tempHls.loadSource(
            url
          )

          tempHls.attachMedia(
            tempVideo
          )
        }
      )
    },

    // ============================================================
    // PERIODIC SYNC
    // ============================================================

    startTimelineLogging() {
      this.stopTimelineLogging()

      this.timelineInterval =
        setInterval(
          () => {
            if (
              !this.video
            ) {
              return
            }

            if (
              this.playlistLoaded &&
              !this.buffering &&
              !this.streamStopped
            ) {
              /*
               * This is the ONLY playback drift correction method.
               */
              this.syncToPlaylistTimeline(
                'PERIODIC_SYNC'
              )

              /*
               * Tell the server where this TV currently is.
               *
               * This also allows the server to activate
               * pending playlist videos when their activation
               * point has been reached.
               */
              this.reportPlaybackState()
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
        Number.isFinite(
          this.video.duration
        )
          ? this.video.duration
          : 0

      const commonPosition =
        this.getCommonPosition()

      const {
        position:
          targetPosition,
      } =
        this.getPlaylistPosition()

      const drift =
        currentTime -
        targetPosition

      const progress =
        duration > 0
          ? Math.min(
              100,
              Math.max(
                0,
                (
                  currentTime /
                  duration
                ) *
                100
              )
            )
          : 0

      let status =
        'PLAYING'

      if (
        this.buffering
      ) {
        status =
          'BUFFERING'
      } else if (
        this.video.paused
      ) {
        status =
          'WAITING'
      }

      this.timelineOverlay.innerHTML = `
    <div style="font-size:30px;font-weight:bold;margin-bottom:8px;">
      VIDEO
    </div>

    <div style="font-size:32px;font-weight:bold;">
      ${this.formatTime(
        currentTime
      )}
      /
      ${this.formatTime(
        duration
      )}
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
      COMMON:
      ${this.formatTime(
        commonPosition
      )}
    </div>

    <div style="font-size:24px;">
      TARGET:
      ${this.formatTime(
        targetPosition
      )}
    </div>

    <div style="font-size:24px;">
      DRIFT:
      ${
        drift >= 0
          ? '+'
          : ''
      }
      ${drift.toFixed(
        2
      )} sec
    </div>

    <div style="
      font-size:22px;
      margin-top:8px;
    ">
      STATUS:
      ${status}
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
        if (
          this.hls
        ) {
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
        if (
          this.video
        ) {
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

      if (
        this.timelineOverlay
      ) {
        this.timelineOverlay.remove()

        this.timelineOverlay =
          null
      }

      this.video =
        null
    },
  },
})