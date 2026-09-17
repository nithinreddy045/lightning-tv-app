import Blits from '@lightningjs/blits'
import Input from '../components/Input.js'

export default Blits.Component('Login', {
  components: {
    Input,
  },

  template: `
    <!-- ================================================= -->
    <!-- ROOT -->
    <!-- ================================================= -->

    <Element
      w="1920"
      h="1080"
      color="#030407"
    >

      <!-- ================================================= -->
      <!-- CINEMATIC BACKGROUND -->
      <!-- ================================================= -->

      <!-- Very dark blue center -->

      <Element
        x="0"
        y="0"
        w="1920"
        h="1080"
        color="#05080E"
      />


      <!-- ================================================= -->
      <!-- LEFT RED LIGHT -->
      <!-- ================================================= -->

      <Element
        x="-120"
        y="270"
        w="500"
        h="500"
        color="#26070D"
        alpha="0.75"
        :effects="[
          {
            type: 'radius',
            props: {
              radius: 250
            }
          }
        ]"
      />

      <Element
        x="-80"
        y="330"
        w="350"
        h="350"
        color="#4A080F"
        alpha="0.35"
        :effects="[
          {
            type: 'radius',
            props: {
              radius: 175
            }
          }
        ]"
      />


      <!-- ================================================= -->
      <!-- RIGHT RED LIGHT -->
      <!-- ================================================= -->

      <Element
        x="1540"
        y="270"
        w="500"
        h="500"
        color="#26070D"
        alpha="0.75"
        :effects="[
          {
            type: 'radius',
            props: {
              radius: 250
            }
          }
        ]"
      />

      <Element
        x="1650"
        y="330"
        w="350"
        h="350"
        color="#4A080F"
        alpha="0.35"
        :effects="[
          {
            type: 'radius',
            props: {
              radius: 175
            }
          }
        ]"
      />


      <!-- ================================================= -->
      <!-- RED HORIZON -->
      <!-- ================================================= -->

      <Element
        x="0"
        y="760"
        w="1920"
        h="2"
        color="#5A0B13"
        alpha="0.5"
      />

      <Element
        x="0"
        y="800"
        w="1920"
        h="1"
        color="#3D080E"
        alpha="0.6"
      />


      <!-- ================================================= -->
      <!-- FLOOR LIGHT STREAKS -->
      <!-- ================================================= -->

      <Element
        x="0"
        y="930"
        w="720"
        h="3"
        color="#E50914"
        alpha="0.65"
        rotation="-12"
      />

      <Element
        x="120"
        y="980"
        w="650"
        h="2"
        color="#8F0A12"
        alpha="0.55"
        rotation="-10"
      />

      <Element
        x="1150"
        y="930"
        w="720"
        h="3"
        color="#E50914"
        alpha="0.65"
        rotation="12"
      />

      <Element
        x="1150"
        y="980"
        w="650"
        h="2"
        color="#8F0A12"
        alpha="0.55"
        rotation="10"
      />


      <!-- ================================================= -->
      <!-- CENTER FLOOR LINES -->
      <!-- ================================================= -->

      <Element
        x="250"
        y="1010"
        w="500"
        h="2"
        color="#550910"
        alpha="0.5"
        rotation="-7"
      />

      <Element
        x="1170"
        y="1010"
        w="500"
        h="2"
        color="#550910"
        alpha="0.5"
        rotation="7"
      />


      <!-- ================================================= -->
      <!-- GLASS LOGIN CARD -->
      <!-- ================================================= -->

      <Element
        x="560"
        y="55"
        w="800"
        h="900"
        color="#0D1118"
        alpha="0.98"
        :effects="[
          {
            type: 'radius',
            props: {
              radius: 26
            }
          },
          {
            type: 'border',
            props: {
              width: 2,
              color: '#444A55'
            }
          }
        ]"
      />


      <!-- ================================================= -->
      <!-- CARD INNER HIGHLIGHT -->
      <!-- ================================================= -->

      <Element
        x="562"
        y="57"
        w="796"
        h="896"
        color="#FFFFFF"
        alpha="0.015"
        :effects="[
          {
            type: 'radius',
            props: {
              radius: 24
            }
          }
        ]"
      />


      <!-- ================================================= -->
      <!-- LIGHTNING ICON -->
      <!-- ================================================= -->

      <Text
        x="960"
        y="95"
        content="ϟ"
        size="70"
        color="#E50914"
        mount="{x: 0.5}"
      />


      <!-- ================================================= -->
      <!-- BRAND -->
      <!-- ================================================= -->


<Text
  x="785"
  y="185"
  content="LIGHTNING"
  size="48"
  color="#FFFFFF"
  font="raleway"
/>

<Text
  x="1065"
  y="185"
  content="TV"
  size="48"
  color="#E50914"
  font="raleway"
/>


      <!-- ================================================= -->
      <!-- TAGLINE -->
      <!-- ================================================= -->

      <Text
        x="960"
        y="250"
        content="Stream. Watch. Enjoy."
        size="21"
        color="#A1A6AF"
        mount="{x: 0.5}"
      />


      <!-- ================================================= -->
      <!-- WELCOME -->
      <!-- ================================================= -->

      <Text
        x="960"
        y="320"
        content="Welcome back"
        size="34"
        color="#FFFFFF"
        mount="{x: 0.5}"
      />

      <Text
        x="960"
        y="365"
        content="Sign in to continue to your account"
        size="19"
        color="#858B96"
        mount="{x: 0.5}"
      />


      <!-- ================================================= -->
      <!-- EMAIL LABEL -->
      <!-- ================================================= -->

      <Text
        x="660"
        y="425"
        content="EMAIL"
        size="17"
        color="#A8ADB5"
      />


      <!-- ================================================= -->
      <!-- EMAIL -->
      <!-- ================================================= -->

      <Input
        ref="emailInput"
        x="660"
        y="455"
        width="600"
        height="70"
        placeholderText="Enter your email"
        :inputText="$email"
      />


      <!-- ================================================= -->
      <!-- PASSWORD LABEL -->
      <!-- ================================================= -->

      <Text
        x="660"
        y="555"
        content="PASSWORD"
        size="17"
        color="#A8ADB5"
      />


      <!-- ================================================= -->
      <!-- PASSWORD -->
      <!-- ================================================= -->

      <Input
        ref="passwordInput"
        x="660"
        y="585"
        width="600"
        height="70"
        placeholderText="Enter your password"
        :inputText="$password"
        mask="true"
      />


      <!-- ================================================= -->
      <!-- LOGIN BUTTON -->
      <!-- ================================================= -->

      <Element
        x="660"
        y="690"
        w="600"
        h="70"
        color="#E50914"
        :effects="[
          {
            type: 'radius',
            props: {
              radius: 9
            }
          },
          {
            type: 'border',
            props: {
              width: $loginButtonFocused ? 3 : 0,
              color: '#FFFFFF'
            }
          }
        ]"
      >

        <!-- IMPORTANT:
             x=300 + mount=0.5 means exact center -->

        <Text
          x="300"
          y="21"
          content="LOGIN"
          size="24"
          color="#FFFFFF"
          font="raleway"
          mount="{x: 0.5}"
        />

      </Element>


      <!-- ================================================= -->
      <!-- ERROR -->
      <!-- ================================================= -->

      <Text
        x="960"
        y="785"
        content="$errorMessage"
        size="17"
        color="#FF4D4D"
        mount="{x: 0.5}"
      />


      <!-- ================================================= -->
      <!-- FOOTER -->
      <!-- ================================================= -->

      <Text
        x="960"
        y="900"
        content="© 2026 Lightning TV. All rights reserved."
        size="15"
        color="#626974"
        mount="{x: 0.5}"
      />

    </Element>
  `,


  // =====================================================
  // STATE
  // =====================================================

  state() {
    return {
      email: '',
      password: '',

      activeField: 'email',

      loginButtonFocused: false,

      errorMessage: '',
    }
  },


  // =====================================================
  // READY
  // =====================================================

  hooks: {
    ready() {
      this.$select('emailInput').$focus()
    },
  },


  // =====================================================
  // INPUT
  // =====================================================

  input: {

    // ---------------------------------------------------
    // UP
    // ---------------------------------------------------

    up() {

      if (this.activeField === 'password') {

        this.activeField = 'email'

        this.loginButtonFocused = false

        this.$select('emailInput').$focus()

        return
      }


      if (this.activeField === 'login') {

        this.activeField = 'password'

        this.loginButtonFocused = false

        this.$select('passwordInput').$focus()

        return
      }
    },


    // ---------------------------------------------------
    // DOWN
    // ---------------------------------------------------

    down() {

      if (this.activeField === 'email') {

        this.activeField = 'password'

        this.$select('passwordInput').$focus()

        return
      }


      if (this.activeField === 'password') {

        this.activeField = 'login'

        this.loginButtonFocused = true

        return
      }
    },


    // ---------------------------------------------------
    // ENTER
    // ---------------------------------------------------

    enter() {

      if (this.activeField === 'email') {

        this.activeField = 'password'

        this.$select('passwordInput').$focus()

        return
      }


      if (this.activeField === 'password') {

        this.activeField = 'login'

        this.loginButtonFocused = true

        return
      }


      if (this.activeField === 'login') {

        this.login()
      }
    },


    // ---------------------------------------------------
    // BACKSPACE
    // ---------------------------------------------------

    back() {

      if (this.activeField === 'email') {

        this.email = this.email.slice(0, -1)

        return
      }


      if (this.activeField === 'password') {

        this.password = this.password.slice(0, -1)
      }
    },


    // ---------------------------------------------------
    // SPACE
    // ---------------------------------------------------

    space() {

      if (this.activeField === 'email') {

        this.email += ' '

        return
      }


      if (this.activeField === 'password') {

        this.password += ' '
      }
    },


    // ---------------------------------------------------
    // NORMAL CHARACTERS
    // ---------------------------------------------------

    any(e) {

      const key = e.key

      console.log('Login received key:', key)


      if (
        key === 'ArrowUp' ||
        key === 'ArrowDown' ||
        key === 'ArrowLeft' ||
        key === 'ArrowRight' ||
        key === 'Enter' ||
        key === 'Backspace' ||
        key === 'Escape'
      ) {

        return
      }


      if (!key || key.length === 0) {

        return
      }


      if (key.length > 1) {

        return
      }


      if (this.activeField === 'email') {

        this.email += key

        return
      }


      if (this.activeField === 'password') {

        this.password += key
      }
    },
  },


  // =====================================================
  // METHODS
  // =====================================================

  methods: {

    async login() {

  console.log('LOGIN CLICKED')

  console.log('Email:', this.email)

  console.log('Password:', this.password)


  const validEmail = 'nithin@example.com'

  const validPassword = '123456'


  if (
    this.email === validEmail &&
    this.password === validPassword
  ) {

    this.errorMessage = ''

    console.log('Login successful')

    try {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, 5000)

  try {
    const response = await fetch(
      'http://192.168.29.250:3001/session',
      {
        signal: controller.signal,
      }
    )

    if (!response.ok) {
      throw new Error(
        `Sync server returned HTTP ${response.status}`
      )
    }

    const session = await response.json()

    localStorage.setItem(
      'commonTimelineStart',
      String(session.commonTimelineStart)
    )

    console.log(
      'COMMON TIMELINE FROM SYNC SERVER:',
      session.commonTimelineStart
    )

    clearTimeout(timeout)

    this.$router.to('/poc')

  } catch (error) {

    clearTimeout(timeout)

    console.error(
      'FAILED TO CONNECT TO SYNC SERVER:',
      error
    )

    const savedTimeline =
      localStorage.getItem('commonTimelineStart')

    if (savedTimeline) {

      console.log(
        'USING SAVED COMMON TIMELINE:',
        savedTimeline
      )

      this.$router.to('/poc')

    } else {

      this.errorMessage =
        'Unable to connect to sync server'

    }
  }

} catch (error) {

  console.error(
    'LOGIN NETWORK ERROR:',
    error
  )

  this.errorMessage =
    'Unable to connect to sync server'
}
  }
else {

    this.errorMessage = 'Invalid email or password'

  }

},
},
})