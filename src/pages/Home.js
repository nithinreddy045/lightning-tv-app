import Blits from '@lightningjs/blits'

export default Blits.Component('Home', {
  template: `
    <Element w="1920" h="1080" color="#141414">

      <!-- ================= HEADER ================= -->

      <Text
        x="80"
        y="45"
        content="LIGHTNING TV"
        size="42"
        color="#E50914"
        font="raleway"
      />

      <Text
        x="1600"
        y="55"
        content="Sign Out"
        size="24"
        color="#FFFFFF"
      />

      <!-- ================= HERO ================= -->

      <Element
        x="0"
        y="120"
        w="1920"
        h="480"
        color="#242424"
      />

      <Element
        x="80"
        y="180"
        w="800"
        h="350"
        color="#333333"
      />

      <Text
        x="920"
        y="210"
        content="THE LAST JOURNEY"
        size="54"
        color="#FFFFFF"
        font="raleway"
      />

      <Text
        x="920"
        y="290"
        content="A new adventure begins."
        size="30"
        color="#CCCCCC"
      />

      <Text
        x="920"
        y="350"
        content="2026   •   Action   •   2h 10m"
        size="24"
        color="#AAAAAA"
      />

      <Element
        x="920"
        y="420"
        w="220"
        h="65"
        color="#E50914"
      />

      <Text
        x="975"
        y="440"
        content="PLAY"
        size="28"
        color="#FFFFFF"
      />

      <!-- ================= CONTINUE WATCHING ================= -->

      <Text
        x="80"
        y="650"
        content="Continue Watching"
        size="34"
        color="#FFFFFF"
        font="raleway"
      />

      <!-- Card 1 -->
      <Element
        ref="card1"
        x="80"
        y="710"
        w="300"
        h="170"
        color="#333333"
      />

      <Text
        x="105"
        y="780"
        content="Movie One"
        size="28"
        color="#FFFFFF"
      />

      <!-- Card 2 -->
      <Element
        ref="card2"
        x="420"
        y="710"
        w="300"
        h="170"
        color="#444444"
      />

      <Text
        x="445"
        y="780"
        content="Movie Two"
        size="28"
        color="#FFFFFF"
      />

      <!-- Card 3 -->
      <Element
        ref="card3"
        x="760"
        y="710"
        w="300"
        h="170"
        color="#555555"
      />

      <Text
        x="785"
        y="780"
        content="Movie Three"
        size="28"
        color="#FFFFFF"
      />

      <!-- Card 4 -->
      <Element
        ref="card4"
        x="1100"
        y="710"
        w="300"
        h="170"
        color="#444444"
      />

      <Text
        x="1125"
        y="780"
        content="Movie Four"
        size="28"
        color="#FFFFFF"
      />

    </Element>
  `,

  hooks: {
    ready() {
      this.$select('card1').$focus()
    },
  },

  input: {
    right() {
      // We'll implement card navigation next
      console.log('RIGHT')
    },

    left() {
      console.log('LEFT')
    },

    enter() {
      console.log('ENTER')
    },
  },
})