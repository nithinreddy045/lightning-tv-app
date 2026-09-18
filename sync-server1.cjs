const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 3001
const STATE_FILE = path.join(__dirname, 'sync-state.json')

const playlist = [
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

// Load persistent timeline state
if (fs.existsSync(STATE_FILE)) {
  try {
    const state = JSON.parse(
      fs.readFileSync(STATE_FILE, 'utf8')
    )

    commonTimelineStart =
      Number(state.commonTimelineStart) || null

    streaming =
      state.streaming !== false

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

// Save persistent state
function saveState() {
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(
      {
        commonTimelineStart,
        streaming,
      },
      null,
      2
    )
  )
}

const server = http.createServer((req, res) => {
  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  )

  res.setHeader(
    'Content-Type',
    'application/json'
  )

  // Get complete sync session
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

    const serverNow = Date.now()

    console.log(
      'SESSION SENT:',
      {
        commonTimelineStart,
        serverNow,
        streaming,
        playlistLength: playlist.length,
      }
    )

    res.end(
      JSON.stringify({
        commonTimelineStart,
        serverNow,
        streaming,
        playlist,
      })
    )

    return
  }

  // Add a video to playlist
  if (
    req.url === '/playlist' &&
    req.method === 'POST'
  ) {
    let body = ''

    req.on('data', chunk => {
      body += chunk
    })

    req.on('end', () => {
      try {
        const video = JSON.parse(body)

        if (!video.url) {
          res.statusCode = 400

          res.end(
            JSON.stringify({
              error: 'Video URL is required',
            })
          )

          return
        }

        playlist.push({
          id: playlist.length + 1,
          title:
            video.title ||
            `Video ${playlist.length + 1}`,
          url: video.url,
        })

        console.log(
          'VIDEO ADDED TO PLAYLIST:',
          playlist[playlist.length - 1]
        )

        res.end(
          JSON.stringify({
            success: true,
            playlist,
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

  // Stop streaming
  if (
    req.url === '/stream/stop' &&
    req.method === 'POST'
  ) {
    streaming = false

    saveState()

    console.log('STREAMING STOPPED')

    res.end(
      JSON.stringify({
        success: true,
        streaming: false,
      })
    )

    return
  }

  // Start streaming
  if (
    req.url === '/stream/start' &&
    req.method === 'POST'
  ) {
    streaming = true

    saveState()

    console.log('STREAMING STARTED')

    res.end(
      JSON.stringify({
        success: true,
        streaming: true,
      })
    )

    return
  }

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