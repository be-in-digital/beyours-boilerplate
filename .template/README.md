# `.template/`

Dormant snapshots used by `scripts/add-mobile.js`. **Do not edit manually.**

When the post-clone CLI (`scripts/init.js`) is run with mobile=No, the
`apps/mobile/` directory is archived here for later re-activation. Running
`pnpm add-mobile` restores `.template/mobile/` back into `apps/mobile/`.

Treat this directory as versioned, not living. If you need to update the
mobile baseline (Expo SDK upgrade, new dependency, etc.), edit `apps/mobile/`
in a clone where mobile is enabled, then copy the result here in a separate
PR titled `chore(template): refresh mobile baseline`.
