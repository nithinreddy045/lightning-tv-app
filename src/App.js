import Blits from '@lightningjs/blits'
 
import Login from './pages/Login.js'

import Home from './pages/Home.js'

import Video from './components/Video.js'

import VideoSyncTimelinePoc from './poc/VideoSyncTimelinePoc.js'
 
import PusherService from './services/PusherService.js'
 
export default Blits.Application({

  template: `
<Element w="1920" h="1080" color="#141414">
<RouterView />
</Element>

  `,
 
  hooks: {

    init() {

      console.log('Starting Pusher connection...')
 
      // Connect to Pusher

      PusherService.connect()
 
      // Subscribe to channel + event

      PusherService.subscribe(

        'tv-channel',

        'tv-event',

        (data) => {

          console.log('Pusher event received:', data)
 
          if (data.action === 'stop_stream') {

            console.log('STOP STREAM EVENT RECEIVED')
 
            // Move user to idle/home/login screen

            this.$router.to('/home')

          }

        }

      )

    },
 
    destroy() {

      console.log('Disconnecting Pusher...')
 
      PusherService.disconnect()

    },

  },
 
  routes: [

    {

      path: '/',

      component: Login,

    },
 
    {

      path: '/home',

      component: Home,

    },
 
    {

      path: '/video',

      component: Video,

    },

    {
      path: '/poc',
      component: VideoSyncTimelinePoc,
    },

  ],

})
