# Button

The one primary action on a screen: a night pill with a lime dot holding the arrow or check.

- Use exactly one `sk-btn` per screen, pinned to the bottom (`sk-btn--block`).
- The label is a verb with the object: "Approve & next", "Record ₹18,650".
- `sk-btn--soft` (white) for the secondary choice beside it; `sk-btn--lime` for a positive action inside a dark sheet.
- Press: scales to 0.97 in `dur-fast`. Hover: the dot slides 3 px right.
- Consumer provides: the label, the icon inside `sk-btn__dot`, and the `href` or click handler.
