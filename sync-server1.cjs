const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 3001
const STATE_FILE = path.join(__dirname, 'sync-state.json')

let playlist = [
  {
    id: 1,
    title: 'Apple BipBop',
    url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
  },
  {
    id: 2,
    title: 'Big Buck Bunny',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 3,
    title: 'Tears of Steel',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
  },
]

let commonTimelineStart = null
let streaming = true
let playlistVersion = 1

// Active playlist timeline information
let playlistCycleStartCommonPosition = 0
let playlistCycleStartIndex = 0

// Videos waiting to be added at the end of the current cycle
let pendingVideos = []

// Latest playback information reported by a TV
let lastPlaybackState = null

if (fs.existsSync(STATE_FILE)) {
  try {
    const state = JSON.parse(
      fs.readFileSync(STATE_FILE, 'utf8')
    )

    commonTimelineStart =
      Number(state.commonTimelineStart) || null

      playlistVersion =
  Number(state.playlistVersion) || 1

    streaming =
      state.streaming !== false

    playlist =
      Array.isArray(state.playlist) &&
      state.playlist.length > 0
        ? state.playlist
        : playlist

    playlistCycleStartCommonPosition =
      Number(state.playlistCycleStartCommonPosition) || 0

    playlistCycleStartIndex =
      Number(state.playlistCycleStartIndex) || 0

    pendingVideos =
      Array.isArray(state.pendingVideos)
        ? state.pendingVideos
        : []

    lastPlaybackState =
      state.lastPlaybackState || null

    if (commonTimelineStart) {
      console.log(
        'COMMON TIMELINE RESTORED:',
        new Date(commonTimelineStart).toISOString()
      )
    }
  } catch (error) {
    console.error(
      'FAILED TO LOAD SYNC STATE:',
      error
    )
  }
}

function saveState() {
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(
      {
        commonTimelineStart,
        streaming,
        playlist,
        playlistVersion,
        playlistCycleStartCommonPosition,
        playlistCycleStartIndex,
        pendingVideos,
        lastPlaybackState,
      },
      null,
      2
    )
  )
}

function getCommonPosition() {
  if (!commonTimelineStart) {
    return 0
  }

  return Math.max(
    0,
    (Date.now() - commonTimelineStart) / 1000
  )
}

function activatePendingVideosIfDue() {
  if (
    pendingVideos.length === 0 ||
    !lastPlaybackState
  ) {
    return
  }

  const commonPosition = getCommonPosition()

  const dueVideos = pendingVideos.filter(
    (item) =>
      commonPosition >= item.activationCommonPosition
  )

  if (dueVideos.length === 0) {
    return
  }

  console.log(
    'ACTIVATING PENDING VIDEOS:',
    dueVideos
  )

  const firstNewVideo = dueVideos[0].video

  // Add all pending videos to the active playlist.
  for (const item of dueVideos) {
    playlist.push(item.video)
  }
  
  playlistVersion += 1

  // The new cycle starts with the first newly added video.
  playlistCycleStartCommonPosition =
    dueVideos[0].activationCommonPosition

  playlistCycleStartIndex =
    playlist.findIndex(
      (item) => item.id === firstNewVideo.id
    )

  pendingVideos = pendingVideos.filter(
    (item) =>
      commonPosition < item.activationCommonPosition
  )

  saveState()

  console.log(
    'PLAYLIST UPDATED:',
    {
      playlist,
      playlistCycleStartCommonPosition,
      playlistCycleStartIndex,
    }
  )
}

const server = http.createServer((req, res) => {
  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  )

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  )

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,OPTIONS'
  )

  res.setHeader(
    'Content-Type',
    'application/json'
  )

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  // ------------------------------------------------------------
  // SESSION
  // ------------------------------------------------------------

  if (
    req.url === '/session' &&
    req.method === 'GET'
  ) {
    if (!commonTimelineStart) {
      commonTimelineStart = Date.now()

      saveState()

      console.log(
        'COMMON TIMELINE CREATED:',
        new Date(commonTimelineStart).toISOString()
      )
    }

    activatePendingVideosIfDue()

    const serverNow = Date.now()

    console.log(
      'SESSION SENT:',
      {
        commonTimelineStart,
        serverNow,
        streaming,
        playlistLength: playlist.length,
        pendingVideos: pendingVideos.length,
      }
    )

    res.end(
      JSON.stringify({
        commonTimelineStart,
        serverNow,
        streaming,

        playlist,
        playlistVersion,
        pendingVideos,

        playlistCycleStartCommonPosition,

        playlistCycleStartIndex,
      })
    )

    return
  }

  // ------------------------------------------------------------
  // PLAYBACK STATE
  // ------------------------------------------------------------

  if (
    req.url === '/playback-state' &&
    req.method === 'POST'
  ) {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk
    })

    req.on('end', () => {
      try {
        const state = JSON.parse(body)

        const videoId = Number(state.videoId)

        const position =
          Number(state.position)

        const duration =
          Number(state.duration)

        const commonPosition =
          Number(state.commonPosition)

        const playlistTotalDuration =
          Number(state.playlistTotalDuration)

        if (
          !Number.isFinite(videoId) ||
          !Number.isFinite(position) ||
          !Number.isFinite(duration) ||
          !Number.isFinite(commonPosition) ||
          !Number.isFinite(playlistTotalDuration) ||
          duration <= 0 ||
          playlistTotalDuration <= 0
        ) {
          res.statusCode = 400

          res.end(
            JSON.stringify({
              error:
                'Invalid playback state',
            })
          )

          return
        }

        lastPlaybackState = {
          videoId,
          position,
          duration,
          commonPosition,
          playlistTotalDuration,
          reportedAt: Date.now(),
        }

        activatePendingVideosIfDue()

        saveState()

        res.end(
          JSON.stringify({
            success: true,
          })
        )
      } catch (error) {
        res.statusCode = 400

        res.end(
          JSON.stringify({
            error: 'Invalid JSON',
          })
        )
      }
    })

    return
  }

  // ------------------------------------------------------------
  // ADD VIDEO
  // ------------------------------------------------------------

  if (
    req.url === '/playlist' &&
    req.method === 'POST'
  ) {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk
    })

    req.on('end', () => {
      try {
        const video = JSON.parse(body)

        if (!video.url) {
          res.statusCode = 400

          res.end(
            JSON.stringify({
              error:
                'Video URL is required',
            })
          )

          return
        }

        activatePendingVideosIfDue()

        if (!lastPlaybackState) {
          res.statusCode = 400

          res.end(
            JSON.stringify({
              error:
                'No playback state available yet',
            })
          )

          return
        }

        const nextId =
          Math.max(
            ...playlist.map(
              (item) => Number(item.id) || 0
            ),
            ...pendingVideos.map(
              (item) =>
                Number(item.video.id) || 0
            )
          ) + 1

        const newVideo = {
          id: nextId,
          title:
            video.title ||
            `Video ${nextId}`,
          url: video.url,
        }

        const currentCommonPosition =
          lastPlaybackState.commonPosition

        const currentPlaylistDuration =
          lastPlaybackState.playlistTotalDuration

        if (
          !Number.isFinite(
            currentPlaylistDuration
          ) ||
          currentPlaylistDuration <= 0
        ) {
          res.statusCode = 400

          res.end(
            JSON.stringify({
              error:
                'Invalid current playlist duration',
            })
          )

          return
        }

        // Add the new video after the CURRENT
        // playlist cycle finishes.
        const cyclesCompleted =
          Math.floor(
            currentCommonPosition /
              currentPlaylistDuration
          )

        const activationCommonPosition =
          (cyclesCompleted + 1) *
          currentPlaylistDuration

        pendingVideos.push({
          video: newVideo,
          activationCommonPosition,
          addedAtCommonPosition:
            currentCommonPosition,
        })

        saveState()

        console.log(
          'VIDEO SCHEDULED:',
          {
            video: newVideo,
            currentCommonPosition,
            currentPlaylistDuration,
            activationCommonPosition,
          }
        )

        res.end(
          JSON.stringify({
            success: true,

            activePlaylist: playlist,

            pendingVideos,

            video: newVideo,

            activationCommonPosition,
          })
        )
      } catch (error) {
        res.statusCode = 400

        res.end(
          JSON.stringify({
            error: 'Invalid JSON',
          })
        )
      }
    })

    return
  }

  // ------------------------------------------------------------
  // STOP STREAMING
  // ------------------------------------------------------------

  if (
    req.url === '/stream/stop' &&
    req.method === 'POST'
  ) {
    streaming = false

    saveState()

    console.log(
      'STREAMING STOPPED'
    )

    res.end(
      JSON.stringify({
        success: true,
        streaming: false,
      })
    )

    return
  }

  // ------------------------------------------------------------
  // START STREAMING
  // ------------------------------------------------------------

  if (
    req.url === '/stream/start' &&
    req.method === 'POST'
  ) {
    streaming = true

    saveState()

    console.log(
      'STREAMING STARTED'
    )

    res.end(
      JSON.stringify({
        success: true,
        streaming: true,
      })
    )

    return
  }

  // ------------------------------------------------------------
  // NOT FOUND
  // ------------------------------------------------------------

  res.statusCode = 404

  res.end(
    JSON.stringify({
      error: 'Not found',
    })
  )
})

server.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `SYNC SERVER RUNNING ON PORT ${PORT}`
    )
  }
)