# LootList+ Companion

Desktop app that syncs loot data between the LootList+ web app and the WoW addon.

Electron 43 + React 18, bundled with electron-vite and packaged with
electron-builder.

## Layout

```
src/main/       main process — window, tray, IPC, sync engine, WoW folder discovery
src/preload/    context bridge (exposes a narrow `window.companion` API)
src/renderer/   React UI
assets/         app + tray icons
out/            build output (gitignored)
release/        packaged installers (gitignored)
```

The preload script deliberately exposes individual `ipcRenderer.invoke` wrappers
rather than the `ipcRenderer` module — Electron 29 made passing the module over
`contextBridge` an error, and the narrow surface is the safer pattern regardless.

## Develop

```bash
cd companion
npm install
npm run dev
```

`npm run dev` starts electron-vite's dev server and opens the app against it.
The renderer URL is passed through `ELECTRON_RENDERER_URL`, so the port isn't
pinned.

Requires **Node 22.12+** — Electron 43's toolchain (`@electron/get`,
`@electron/rebuild`) declares that floor. The web app in the repo root still
builds on Node 20; these are independent.

## Build and run locally

```bash
npm run build        # emits out/{main,preload,renderer}
npx electron .       # run the built app
```

The first `npx electron .` downloads the ~100MB platform binary. Electron 42
stopped doing this at `postinstall`, so it happens on first run instead.

## Package installers

```bash
npm run package:mac      # dmg + zip
npm run package:win      # nsis installer + portable exe
npm run package:linux    # AppImage
```

Output lands in `release/`. electron-builder only builds for the platform you're
on — a full cross-platform set comes from CI.

## Cutting a release

Releases are built by `.github/workflows/release-companion.yml` on four runners
(macOS arm64, macOS x64, Windows, Linux) and land as a **draft** GitHub Release.

1. Bump the version in `companion/package.json`, then refresh the lockfile so
   they agree:
   ```bash
   cd companion && npm install --package-lock-only
   ```
2. Commit, merge to `main`.
3. Tag and push:
   ```bash
   git tag companion-v1.1.0
   git push origin companion-v1.1.0
   ```
4. Review the draft release on the Releases page, then publish it.

The tag version must match `package.json` — electron-builder names artifacts
from `package.json`, so the workflow fails fast on a mismatch rather than
shipping files that disagree with the tag.

You can also run the workflow manually (**Actions → Release Companion → Run
workflow**) to test packaging without tagging; it drafts a release at the
current `package.json` version.

Each Mac architecture builds on its own runner instead of cross-compiling.
`chokidar` pulls in `fsevents`, a native module, and cross-arch rebuilds of it
are a common packaging failure.

## Code signing

**Builds are currently unsigned.** They install and run, but:

- **macOS** — Gatekeeper refuses the app on first open. Right-click → **Open** →
  **Open**, once.
- **Windows** — SmartScreen shows "Windows protected your PC". **More info** →
  **Run anyway**.

The workflow already has the signing paths wired; adding these repo secrets
activates them with no workflow edit:

| Secret | Purpose |
| --- | --- |
| `CSC_LINK` | base64-encoded Apple Developer ID `.p12` |
| `CSC_KEY_PASSWORD` | password for that `.p12` |
| `APPLE_ID` | Apple ID used for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | app-specific password for that Apple ID |
| `APPLE_TEAM_ID` | Apple Developer team id |
| `WIN_CSC_LINK` | base64-encoded Windows code-signing `.pfx` |
| `WIN_CSC_KEY_PASSWORD` | password for that `.pfx` |

macOS notarization turns on only when both `APPLE_ID` and `CSC_LINK` are
present. Without `CSC_LINK`, `CSC_IDENTITY_AUTO_DISCOVERY` is forced to `false`
so electron-builder can't adopt an unrelated identity from the runner keychain.

## Auto-update

Not implemented. The `publish` block in `package.json` points at this repo and
the workflow uploads electron-builder's `latest*.yml` metadata alongside the
installers, so wiring `electron-updater` later is a small change rather than a
restructure.

Worth knowing: macOS auto-update requires a signed app, so signing is the real
prerequisite.

## Platform support

macOS 12+ (Electron 38 dropped macOS 11), Windows 10+, and mainstream Linux
desktops.

Linux ships as AppImage only. A `.deb` needs a `Name <email>` maintainer in the
package metadata, and there's no contact address to put there yet — adding
`build.linux.maintainer` and putting `"deb"` back in `build.linux.target` is all
it takes.
