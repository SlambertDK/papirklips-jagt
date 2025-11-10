# Deploy Papirklips Jagt to staging
param(
    [switch]$SkipGit  # Skip Git commit/push if specified
)

$ErrorActionPreference = "Stop"

Write-Host "=== Deploying Papirklips Jagt to Staging ===" -ForegroundColor Cyan

# Configuration
$localPath = "Z:\papirklips-slambert-com-staging"
$remotePath = "/volume1/@appdata/ContainerManager/all_shares/web/papirklips_com"
$sshHost = "nas-slambert"  # Uses SSH config with key authentication
$pm2Process = "papirklips-staging"

# Step 0: Git integration - Commit and push changes
if (!$SkipGit) {
    Write-Host "`n[0/4] Git integration - Checking for changes..." -ForegroundColor Yellow
    $gitStatus = & git status --porcelain
    if ($gitStatus) {
        Write-Host "📝 Found uncommitted changes. Committing to Git..." -ForegroundColor Gray
        
        # Add all changes
        & git add .
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to stage Git changes" -ForegroundColor Red
            exit 1
        }
        
        # Create commit with timestamp
        $commitMessage = "🚀 Staging deployment $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`nAuto-commit from staging deployment script"
        & git commit -m $commitMessage
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to commit changes" -ForegroundColor Red
            exit 1
        }
        
        # Push to GitHub
        & git push origin main
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to push to GitHub" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ Changes committed and pushed to GitHub" -ForegroundColor Green
    } else {
        Write-Host "✅ No uncommitted changes found" -ForegroundColor Green
    }
} else {
    Write-Host "`n[0/4] Skipping Git integration (--SkipGit specified)" -ForegroundColor Yellow
}

# Step 1: Check if source workspace exists (for now use current directory)
if (!(Test-Path $localPath)) {
    Write-Host "⚠️  Workspace $localPath not found, using current directory instead" -ForegroundColor Yellow
    $localPath = Get-Location
}

Write-Host "`n[1/4] Syncing files to NAS using Robocopy..." -ForegroundColor Yellow

# Create temporary staging area
$tempStaging = "Z:\temp-staging-$(Get-Date -Format 'HHmmss')"
Write-Host "Creating temporary staging area: $tempStaging" -ForegroundColor Gray

robocopy "$localPath" "$tempStaging" /MIR /XD node_modules .git /XF *.log .env
if ($LASTEXITCODE -gt 7) {
    Write-Host "Failed to prepare staging files" -ForegroundColor Red
    exit 1
}

# Use SSH with tar for file transfer (more reliable than SCP)
Write-Host "Uploading files to NAS via SSH..." -ForegroundColor Gray

# Create tar archive and transfer via SSH
$tarFile = "staging-files.tar.gz"
tar -czf $tarFile -C $tempStaging *

# Transfer via SSH and extract
$transferCommand = @"
cat > /tmp/$tarFile && cd $remotePath && rm -rf * && tar -xzf /tmp/$tarFile && rm /tmp/$tarFile
"@

$transferResult = Get-Content $tarFile -AsByteStream | ssh $sshHost $transferCommand
$scpExitCode = $LASTEXITCODE

# Clean up local files
Remove-Item $tarFile -Force -ErrorAction SilentlyContinue

# Clean up temp directory
Remove-Item $tempStaging -Recurse -Force -ErrorAction SilentlyContinue

if ($scpExitCode -ne 0) {
    Write-Host "Failed to sync files to NAS" -ForegroundColor Red
    exit 1
}

Write-Host "Files synced successfully!" -ForegroundColor Green

# Step 2: SSH to NAS and install dependencies
Write-Host "`n[2/4] Installing dependencies on NAS..." -ForegroundColor Yellow
$sshCommand = "cd $remotePath && /usr/local/bin/node /usr/local/bin/npm install --production"
& ssh $sshHost $sshCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "Dependencies installed!" -ForegroundColor Green

# Step 3: Setup PM2 process with staging configuration
Write-Host "`n[3/4] Setting up PM2 with staging settings..." -ForegroundColor Yellow

Write-Host "Managing PM2 process..." -ForegroundColor Gray  
# Delete existing process if it exists
& ssh $sshHost "PATH=/usr/local/bin:`$PATH /usr/local/bin/node /usr/local/bin/pm2 delete papirklips-staging 2>/dev/null || true"

# Start PM2 process directly with environment variables
$pm2StartCmd = "cd $remotePath && PATH=/usr/local/bin:`$PATH NODE_ENV=staging PORT=8082 /usr/local/bin/node /usr/local/bin/pm2 start server.js --name papirklips-staging"
& ssh $sshHost $pm2StartCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start PM2 process" -ForegroundColor Red
    Write-Host "Checking PM2 status..." -ForegroundColor Yellow
    & ssh $sshHost "PATH=/usr/local/bin:`$PATH /usr/local/bin/node /usr/local/bin/pm2 status"
    exit 1
}

# Save PM2 configuration
& ssh $sshHost "PATH=/usr/local/bin:`$PATH /usr/local/bin/node /usr/local/bin/pm2 save"

Write-Host "✅ PM2 process configured successfully" -ForegroundColor Green

# Step 4: Test staging endpoint
Write-Host "`n[4/4] Testing staging endpoint..." -ForegroundColor Yellow
Start-Sleep -Seconds 3  # Give PM2 time to start

try {
    $testResult = ssh $sshHost "curl -s http://localhost:8082/api/leaderboard"
    if ($testResult -match '"initials"') {
        Write-Host "✅ Staging API test passed!" -ForegroundColor Green
        $leaderboardData = $testResult | ConvertFrom-Json
        Write-Host "   Leaderboard has $($leaderboardData.Count) entries" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  API response unexpected: $testResult" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Staging API test failed: $_" -ForegroundColor Red
}

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "Papirklips Jagt is now running on http://192.168.86.41:8082 (staging)" -ForegroundColor Cyan
Write-Host "`nUseful commands:" -ForegroundColor Yellow
Write-Host "   Check status: ssh $sshHost 'pm2 status'" -ForegroundColor Yellow
Write-Host "   View logs: ssh $sshHost 'pm2 logs $pm2Process'" -ForegroundColor Yellow
