# Deploy Papirklips Jagt to production
$ErrorActionPreference = "Stop"

Write-Host "=== Deploying Papirklips Jagt ===" -ForegroundColor Cyan

# Configuration
$localPath = "Z:\papirklips-jagt-staging"
$remotePath = "/volume1/@appdata/ContainerManager/all_shares/web/papirklips_com"
$remoteHost = "192.168.86.41"
$remoteUser = "Familieadmin"
$pm2Process = "papirklips-website"

# Step 1: Sync files to NAS
Write-Host "`n[1/3] Syncing files to NAS..." -ForegroundColor Yellow
$rsyncArgs = @(
    "-avz",
    "--delete",
    "--exclude=node_modules",
    "--exclude=.git",
    "--exclude=.env",
    "$localPath/",
    "${remoteUser}@${remoteHost}:${remotePath}/"
)

& rsync $rsyncArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to sync files" -ForegroundColor Red
    exit 1
}

Write-Host "Files synced successfully!" -ForegroundColor Green

# Step 2: SSH to NAS and install dependencies
Write-Host "`n[2/3] Installing dependencies on NAS..." -ForegroundColor Yellow
$sshCommand = "cd $remotePath && npm install --production"
& ssh "${remoteUser}@${remoteHost}" $sshCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "Dependencies installed!" -ForegroundColor Green

# Step 3: Restart PM2 process
Write-Host "`n[3/3] Restarting PM2 process..." -ForegroundColor Yellow
$pm2Command = "pm2 restart $pm2Process || pm2 start $remotePath/server.js --name $pm2Process"
& ssh "${remoteUser}@${remoteHost}" $pm2Command

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to restart PM2" -ForegroundColor Red
    exit 1
}

Write-Host "`nDeployment complete!" -ForegroundColor Green
Write-Host "Papirklips Jagt is now running on http://slambert.com:8082" -ForegroundColor Cyan
