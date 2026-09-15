import Blits from '@lightningjs/blits'

export default Blits.Component('LoginButton', {
  template: `
    <Element
      w="680"
      h="70"
      color="$color"
      :effects="[
        {
          type: 'radius',
          props: {
            radius: 6
          }
        },
        {
          type: 'border',
          props: {
            width: $hasFocus ? 4 : 0,
            color: '#FFFFFF'
          }
        }
      ]"
    >
      <Text
        w="680"
        y="18"
        content="LOGIN"
        size="28"
        color="#FFFFFF"
        align="center"
      />
    </Element>
  `,

  state() {
    return {
      color: '#E50914',
    }
  },

  input: {
    enter() {
      this.$parent.login()
    },
  },
})