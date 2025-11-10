# Papirklips Jagt Copilot Instructions

## ⚠️ CRITICAL: Infrastructure Mapping

**Z:\ drive maps DIRECTLY to /volume1/web/ on Synology NAS (192.168.86.41)**

This means:
- `Z:\slambert_com_staging\` = `/volume1/web/slambert_com_staging/` on NAS
- `Z:\pepsimax-slambert-com-staging\` = `/volume1/web/pepsimax-slambert-com-staging/` on NAS  
- `Z:\papirklips-jagt-staging\` = `/volume1/web/papirklips-jagt-staging/` on NAS

**NEVER delete folders on Z:\ without explicit confirmation** - they are production/staging directories on the NAS, not local copies!

When deploying:
- Production releases go to: `/volume1/web/papirklips-jagt/releases/`
- Staging releases go to: `/volume1/web/papirklips-jagt/staging/releases/`
- Shared files (.env, logs) in: `/volume1/web/papirklips-jagt/shared/` or `/volume1/web/papirklips-jagt/staging/shared/`

## Project Overview

Papirklips Jagt is a simple survival game where players collect paperclips while avoiding obstacles.

## Port Allocation

- Production: 8084
- Staging: 8082

## Development Workflow

```powershell
npm install              # Install dependencies
npm start                # Start production server
npm run dev              # Start development server
npm test                 # Run tests
```

## Database Configuration

Requires `.env` file with PostgreSQL credentials:
- PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
