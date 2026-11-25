# CloudDMS demo deployment

## Required dependency check before packaging

The November 23, 2026 deployment failed at `npm ci` with EUSAGE because
`package.json` and `package-lock.json` were out of sync. Missing entries included
Playwright, Testing Library, jsdom and Vitest. This also occurred on earlier deployments.

Future deployment guidance must check lockfile consistency before uploading source
or stopping services. Do not repeat an unconditional server-side `npm ci` against
this known inconsistent source snapshot.

Permanent correction: run `npm install --package-lock-only --no-audit --no-fund`
in the local frontend checkout, review the resulting lockfile, then validate with
`npm ci --no-audit --no-fund` and `npm run build` using the deployment Node environment.
Deliver package.json and package-lock.json together. Keep the repaired lockfile in
version control so the next source archive does not overwrite it with the stale copy.
The lockfile correction has not yet been performed by the agent.

## Temporary recovery for the current demo

In the existing VPS Node container build command, replace the failed install step
with `npm install --no-audit --no-fund && npm run build`. This updates the server
lockfile and can resolve newer versions allowed by package.json; it is a temporary
demo recovery, not a reproducible dependency install. Do not use --force or
--legacy-peer-deps to hide dependency conflicts. Stop on errors.

Keep the current public website and backend services running until the frontend
build succeeds. A failed build must not be copied to /var/www/clouddms.
Preserve server .env files, secrets, certificates and database volumes throughout
source synchronization. Never automatically run migrations based solely on a build.

## Shell locations

Windows PowerShell: create source archives and upload with scp.
VPS SSH terminal: extract, back up, synchronize, build and restart services.

Deployment target: /opt/clouddms/Cloud-DMS-FE; public static files:
/var/www/clouddms. Backend services: clouddms-auth and clouddms-dms.
