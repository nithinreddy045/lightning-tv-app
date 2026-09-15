const http = require('http')

let commonTimelineStart = null

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')

  if (req.url === '/session' && req.method === 'GET') {

    if (!commonTimelineStart) {
      commonTimelineStart = Date.now()

      console.log(
        'COMMON TIMELINE CREATED:',
        new Date(commonTimelineStart).toISOString()
      )
    }

    console.log(
      'COMMON TIMELINE SENT:',
      commonTimelineStart
    )

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

server.listen(3001, '0.0.0.0', () => {
  console.log(
    'SYNC SERVER RUNNING ON PORT 3001'
  )
})