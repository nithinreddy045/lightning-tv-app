import Blits from '@lightningjs/blits'

import Login from './pages/Login.js'

import Home from './pages/Home.js'

import VideoSyncTimelinePoc from './poc/VideoSyncTimelinePoc.js'


export default Blits.Application({

  template: `
<Element w="1920" h="1080" color="#141414">
<RouterView />
</Element>

  `,

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
      path: '/poc',
      component: VideoSyncTimelinePoc,
    },

  ],

})