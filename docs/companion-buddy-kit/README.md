# Companion Buddy kit

A small animated assistant character you can drop into any web app. It floats in a
corner, blinks, follows the cursor with its eyes, glides over to whatever the user
pauses on to explain it, flies to the page heading when the page changes, and shows a
thinking face while your AI is working.

No dependencies, about 12 KB unminified. Works with plain HTML, React, Vue, Svelte and other frameworks.

| File | What it is |
|---|---|
| `companion-buddy.js` | The engine (ES module) — `createCompanionBuddy(options)` |
| `companion-buddy.css` | The character, animations and speech bubble (theme via CSS variables) |
| `CompanionBuddy.react.jsx` | Optional React wrapper |
| `demo.html` | Neutral demo page |

## Try the demo

ES modules don't load from `file://`, so serve the folder with any static server:

```bash
npx serve docs/companion-buddy-kit
```

Then open `/demo.html`.

## Use it

```js
import { createCompanionBuddy } from './companion-buddy.js';
import './companion-buddy.css';

const buddy = createCompanionBuddy({
  label: 'Ask AI',
  onClick: () => toggleMyChat(),          // omit → click explains the current page
  routes: [{ path: '/billing', label: 'Billing', hint: 'Invoices and plans.' }],
  homePath: '/',
  bottomOffset: (w) => (w < 1024 ? 88 : 24),   // sit above a mobile bottom nav
  hello: { title: "Hi! I'm your buddy", text: "Hover anything and I'll explain it." },
});

// In an SPA, on every route change:
buddy.arrived(location.pathname);

// With your own chat panel:
buddy.setOpen(true);       // buddy goes home, pokes, smiles
buddy.setThinking(true);   // thinking face while the AI works
buddy.setThinking(false);  // hop + happy face when the answer lands
```

### Hover tips — just HTML attributes

```html
<div class="card" data-buddy-tip="Revenue|$12.4k this month, 82% of target.">…</div>
<a href="/billing" data-buddy-tip="Billing|Invoices and plans." data-buddy-kind="below">Billing</a>
```

`data-buddy-kind` sets where the buddy perches:

| Kind | Where the buddy sits |
|---|---|
| `card` (default) | On the top-right corner |
| `icon` | Above |
| `row` | To the right |
| `below` | Underneath, for top-bar links |

There's a ~0.5 s intent delay so it doesn't chase every mouse flick. Tips only run on
mouse/trackpad devices.

### API

| Method | Does |
|---|---|
| `arrived(path)` | Fly to the page heading and say "Here's {label}" (uses `routes`, falls back to the `h1` text) |
| `guide(path?)` | Explain the current page in a bubble (the default click) |
| `say(title, text)` | Show any message above the buddy |
| `hush()` | Hide the bubble |
| `cheer()` | Hop + happy face |
| `setOpen(bool)` | Tell it your chat panel opened/closed |
| `setThinking(bool)` | Thinking face on/off (cheers when switched off) |
| `goHome()` | Return to the corner |
| `destroy()` | Remove everything and unbind listeners |
| `element` | The `<button>` itself |

### Options

| Option | Default | |
|---|---|---|
| `mount` | `document.body` | Where to append the buddy |
| `label` | `'Assistant'` | Accessible name/tooltip |
| `onClick` | explain page | Click handler |
| `routes` | `[]` | `{ path, label, hint? }` — prefix-matched, longest wins |
| `homePath` | — | Arriving here says "Back on your dashboard" |
| `getPath` | `location.pathname` | For hash routers etc. |
| `headingSelector` | `'main h1, h1'` | Where it flies on arrival |
| `bottomOffset` / `rightOffset` | 24 / 24 (16 on phones) | Functions of viewport width |
| `size` | `56` | Keep in sync with `--cb-size` |
| `hoverDelay` | `480` | ms before it moves to a hovered tip |
| `hello` | `null` | First-visit greeting, once per session |
| `text` | built-in phrases | Override any phrase (see `DEFAULT_TEXT` in the JS) |

### Theme

Override on `:root` (or any ancestor):

```css
:root {
  --cb-size: 56px;
  --cb-body-light: #3E66BF;
  --cb-body-mid: #254A9A;
  --cb-body-dark: #1B2A4E;
  --cb-accent: #F5B332;         /* antenna, sparkles, mouth */
  --cb-bubble-bg: #fff;
  --cb-bubble-text: #1B2A4E;
  --cb-bubble-muted: #55607A;
  --cb-bubble-border: #E8E2D6;
  --cb-z: 40;
}
```

### Accessibility

- The buddy is a real `<button>`, so it works with the keyboard and screen readers.
- Speech bubbles are announced through `aria-live="polite"`.
- With `prefers-reduced-motion` on, travel, hops and the sparkle trail turn off, but the bubbles still show.
