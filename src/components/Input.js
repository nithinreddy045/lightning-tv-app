import Blits from '@lightningjs/blits'

export default Blits.Component('Input', {
  template: `
    <Element
      w="$width"
      h="$height"
      color="#121212"
      :effects="[
        {
          type: 'radius',
          props: { radius: $radius }
        },
        {
          type: 'border',
          props: {
            width: $borderWidth,
            color: $$hasFocus ? '#FFFFFF' : '#555555'
          }
        }
      ]"
    >
      <Text
        :content="$displayText"
        color="#FFFFFF"
        size="$fontSize"
        x="20"
        y="18"
      />

      <Element
        w="2"
        h="$fontSize"
        :x="$cursorX"
        y="$height/2"
        mount="{y: 0.5}"
        color="#FFFFFF"
        :alpha="$cursorAlpha"
      />
    </Element>
  `,

  props: {
    placeholderText: '',
    inputText: '',
    mask: false,
    width: 680,
    height: 60,
  },

  state() {
    return {
      fontSize: 22,
      radius: 4,
      borderWidth: 2,
      cursorAlpha: 0,
    }
  },

  computed: {
    displayText() {
      if (!this.inputText) {
        return this.$hasFocus
          ? ''
          : this.placeholderText
      }

      if (this.mask) {
        return '*'.repeat(this.inputText.length)
      }

      return this.inputText
    },

    cursorX() {
      return 20 + (this.inputText.length * 12)
    },
  },

  hooks: {
    ready() {
      this.$setInterval(() => {
        if (this.$hasFocus) {
          this.cursorAlpha =
            this.cursorAlpha === 1 ? 0 : 1
        } else {
          this.cursorAlpha = 0
        }
      }, 500)
    },
  },

  input: {
    /*
     * Send ENTER, UP and DOWN to Login.
     */
    enter(e) {
      this.$parent.$input(e)
    },

    up(e) {
      this.$parent.$input(e)
    },

    down(e) {
      this.$parent.$input(e)
    },

    /*
     * This is the important part.
     *
     * Any normal keyboard character that isn't handled
     * by enter/up/down comes here and is passed to Login.
     */
    any(e) {
      this.$parent.$input(e)
    },
  },
})