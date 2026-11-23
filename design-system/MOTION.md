# Motion

Motion in Sikka has one job: make capture and review feel quick and rewarding. It should never slow anyone down.

## Rules

1. **Arrive, don't perform.** Cards rise 16 px and fade in (`sk-rise`) in `dur-slow` with `ease-out`, 60 ms apart (`--i` index).
2. **Pop when picked.** Chips, tiles, mood faces and badges scale with `ease-spring` in `dur-base`.
3. **Celebrate once.** Confetti and the success check (`dur-celebrate`) play only when the inbox reaches zero or a streak grows.
4. **Loops are quiet.** Only three things loop: the listening wave, the current stepper step's pulse, and the deck's "swipe me" nudge every 3 s.
5. **Reduced motion wins.** With `prefers-reduced-motion`, all utilities and Lottie files stop on their last frame.

## CSS utilities (components/bundle.css)

| Class | Use |
| --- | --- |
| `sk-rise` | Cards and rows entering a screen. Set `style="--i:2"` to stagger. |
| `sk-pop` | Badges, chips, the check badge. |
| `sk-float` | Sikku or a hero illustration bobbing. |
| `sk-pulse` | A halo that breathes outward (mic, current step). |
| `sk-grow-y` | Chart bars growing from the baseline. |
| `sk-draw` | Sparklines and check marks drawing in (SVG strokes). |
| `sk-wiggle` | An occasional nudge on something waiting for you. |

## Lottie files (assets/Motion)

All 200 × 200, 60 fps, pure vector, no images, palette from the tokens. Play with lottie-web or `lottie-react-native`.

| File | Length | Loop | Where |
| --- | --- | --- | --- |
| `sikku-bounce.json` | 1.5 s | yes | Welcome, unlock, empty states |
| `listening-pulse.json` | 2 s | yes | Voice note while recording |
| `success-check.json` | 1 s | no | After approve, after backup |
| `confetti-burst.json` | 1.5 s | no | All caught up, new streak |
| `coin-drop.json` | 1.3 s | no | A payment was captured (notification, onboarding demo) |
| `card-swipe-approve.json` | 1.2 s | no | Review deck tutorial, first approve |
| `streak-flame.json` | 1 s | yes | Streak chip and card |
| `loading-coins.json` | 1 s | yes | Parsing SMS, restoring backup |

## Screen recipes

- **Home:** hero → bento → week card rise in order (`--i` 0–3); week bars `sk-grow-y`; sparkline `sk-draw`; review badge `sk-pop`.
- **Review deck:** top card nudges; on approve it leaves with `ease-in` to the right with 18° tilt while the next card scales up from 0.96.
- **Voice note:** sheet slides up `dur-base`; wave bars loop; stop button halo `sk-pulse`.
- **All caught up:** `confetti-burst` once, Sikku `sk-float`, streak number pops.
- **Unlock:** fingerprint halo `sk-pulse`; on success the screen scales 1.04 and fades.
