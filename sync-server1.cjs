const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 3001

const STATE_FILE = path.join(__dirname, 'sync-state.json')

let commonTimelineStart = null

// Load existing timeline from disk when the server starts
if (fs.existsSync(STATE_FILE)) {
  try {
    const state = JSON.parse(
      fs.readFileSync(STATE_FILE, 'utf8')
    )

    commonTimelineStart = state.commonTimelineStart

    console.log(
      'COMMON TIMELINE RESTORED:',
      new Date(commonTimelineStart).toISOString()
    )
  } catch (error) {
    console.error(
      'FAILED TO LOAD SYNC STATE:',
      error
    )
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')

  if (req.url === '/session' && req.method === 'GET') {

    // Create the timeline only if one does not already exist
    if (!commonTimelineStart) {

      commonTimelineStart = Date.now()

      fs.writeFileSync(
        STATE_FILE,
        JSON.stringify({
          commonTimelineStart
        }, null, 2)
      )

      console.log(
        'COMMON TIMELINE CREATED:',
        new Date(commonTimelineStart).toISOString()
      )
    }

    const serverNow = Date.now()

    console.log(
      'COMMON TIMELINE SENT:',
      {
        commonTimelineStart,
        serverNow,
      }
    )

    res.end(
      JSON.stringify({
        commonTimelineStart,
        serverNow,
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(
    `SYNC SERVER RUNNING ON PORT ${PORT}`
  )
})