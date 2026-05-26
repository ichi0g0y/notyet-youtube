# fadee

Hide watched videos on YouTube channel pages.

## Development

```sh
bun install
bun run build
```

Load the generated `dist` directory from `chrome://extensions` with Developer mode enabled.

## Packaging

```sh
bun run pack
```

Produces `fadee-<version>.zip` at repo root, ready to upload to the Chrome Web Store Developer Dashboard.

## Scope

- Runs only on `https://www.youtube.com/*`
- Stores only local extension settings with `chrome.storage`
- Makes no external network requests
