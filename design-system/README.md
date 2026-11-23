# Sikka

Sikka (Hindi for "coin") is an offline-first money tracker. It reads payment SMS and app alerts on the phone, then asks one tiny question. This system is the v2 look: warm cream ground, bold pastel blocks, one lime brand colour, chunky rounded shapes, and a small coin mascot called Sikku.

## Principles

1. **Capture is automatic, review is a game.** The review inbox is a swipe deck, not a form. Every screen has one obvious next action.
2. **Colour means something.** Each category and account owns a colour pair (`cat-*-bg` + `cat-*-fg`) and keeps it on every screen. After a week, people read colour before text.
3. **One hero per screen.** One big pastel or lime block with the one number that matters (`amount-xl`). Everything else is white cards on `ground`.
4. **Offline and honest.** Sikka never moves money. Copy says "record", not "pay". Offline states are shown, not hidden.
5. **Delight in small doses.** Sikku and confetti appear only at moments that earn them: welcome, all caught up, a new streak, teaching a new SMS.

## Voice

- Plain, short, friendly English. Hinglish is welcome in examples ("Zomato pe dinner kiya").
- Talk to one person: "your", "you". Sikku speaks in first person only in its own bubbles.
- Numbers in Indian format: `₹1,00,000`, never `₹100,000`. Use `−₹240` (true minus) for money out, `+₹162` for money in.
- Buttons are verbs: "Approve & next", "Record ₹18,650", "Seal the vault". Never "OK" or "Submit".

| Say | Not |
| --- | --- |
| 5 waiting for you | You have 5 unreviewed transactions |
| Who was this? | Merchant name required |
| Sikka only records this | Payment processing |

## Colour

- `ground` is the page; `surface` is every card. In dark theme both swap; pastels stay the same and their text stays `on-pastel`.
- `lime` is the brand. Use it for the net-worth hero, the active tab, approve actions and Sikku. Text on lime is always ink.
- `night` is the primary button and dark heroes in both themes.
- `signal` (orange) means "look here now": the current stepper step, the review badge. It is never a text colour.
- Money in uses `lime-deep`. Money out stays `ink`: spending is normal, not an error.
- `danger` is only for destructive text.

| Category | Fill | Text / icon |
| --- | --- | --- |
| Dining | `cat-dining-bg` | `cat-dining-fg` |
| Groceries | `cat-groceries-bg` | `cat-groceries-fg` |
| Transport, bank accounts | `cat-transport-bg` | `cat-transport-fg` |
| Shopping, credit cards | `cat-shopping-bg` | `cat-shopping-fg` |
| Fun, streaks, voice | `cat-fun-bg` | `cat-fun-fg` |
| Bills, investments | `cat-bills-bg` | `cat-bills-fg` |
| Health, backup | `cat-health-bg` | `cat-health-fg` |

All `-fg` on `-bg` pairs are 7:1 or better.

## Type

- **Bricolage Grotesque** (Google Fonts, 500–800) for money and titles: `amount-xl`, `amount-md`, `title-xl`, `title-md`.
- **Urbanist** (Google Fonts, 400–800) for everything else: `body`, `label`, `caption`, `overline`.
- Load both from Google Fonts: `family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Urbanist:wght@400;500;600;700;800`.
- Amounts are always the display face, bold, with tight tracking.

## Shape and space

- Big radii everywhere: `radius-lg` for cards, `radius-xl` for heroes and sheets, `radius-pill` for buttons, chips and toggles.
- Side gutter `space-4`; gap between cards `space-3`; heroes pad `space-5`.
- Depth comes from `shadow-card` on white cards and `shadow-float` on the tab bar and deck. Pastel blocks have no shadow.
- Heroes carry one soft decorative circle in a corner (white at 35%). That is the only decoration.

## Iconography

- 41 line icons on a 24 px grid, 2 px stroke, round caps and joins. Files in **Icons** use ink `#1D1B16`.
- In code, recolour them with CSS `mask-image` or inline the path with `stroke="currentColor"`.
- Category icons sit inside a 48 px rounded tile filled with the category's `-bg` and drawn in its `-fg`.
- No filled icons, no emoji, no brand logos of banks or apps.

## Mascot: Sikku

A lime coin with a dashed inner ring, two dot eyes, a smile and peach cheeks. Five moods in **Mascot**: happy, wink, celebrate, thinking, sleepy.

- Use Sikku for welcome, unlock, empty states, "teach me this SMS", tips, and celebrations.
- Never on lists, forms, money values or errors about money.
- At most one Sikku per screen. Minimum size 26 px.

## Motion

See the **Motion** section. In short: things rise in, pop when chosen, and only celebrate once. Durations are `dur-fast`, `dur-base`, `dur-slow`, `dur-celebrate`; curves are `ease-out`, `ease-spring`, `ease-in`. Respect reduced motion.

## Accessibility

- Text is 4.5:1 or better on its ground in both themes. Category pairs are 7:1 or better.
- Touch targets are at least 44 px; primary buttons are 62 px tall.
- Toggles, segmented controls, tiles and mood faces are real buttons with `role="switch"` or `role="radio"` and `aria-checked`.
- Colour is never the only signal: tiles carry labels, the stepper carries words, the deck has ✕ / ✓ buttons as well as swipes.

## Using the components

Load `tokens.css`, then `components/bundle.css`. Every component is plain HTML with `sk-` classes. There is no JavaScript bundle, so it maps cleanly to React Native styles. Add a category with a class such as `sk-cat-dining` on the element or a parent.
