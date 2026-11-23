# SwipeDeck

The review inbox as a stack of cards. Right approves, left marks "not mine", up opens the voice note.

- Two tinted cards peek behind the top one, rotated −4° and 3°.
- The top card nudges right every 3 s until the first swipe, then never again in that session.
- Always pair with ✕ / edit / ✓ buttons below for people who don't swipe.
- On approve: the card leaves with `ease-in` and an 18° tilt; the next card scales up from 0.96.
