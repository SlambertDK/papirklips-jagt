# Deploy Papirklips Jagt to Production
param(
    [switch]$SkipGit  # Skip Git commit/push if specified
)

Write-Host '📎 Deploying Papirklips Jagt to Production...' -ForegroundColor Green

# Configuration
$stagingPath = "Z:\papirklips-slambert-com-staging"
$prodPath = "Z:\papirklips-jagt"
$nasPath = "/volume1/@appdata/ContainerManager/all_shares/web/papirklips_com_prod"
$sshHost = "nas-slambert"  # Uses SSH config with key authentication
$pm2Process = "papirklips-prod"
$prodPort = 8084

# Step 0: Git integration - Commit and push changes
if (!$SkipGit) {
    Write-Host "`n[0/6] Git integration - Checking for changes..." -ForegroundColor Yellow
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
        $commitMessage = "🚀 Production deployment $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`nAuto-commit from production deployment script"
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
    Write-Host "`n[0/6] Skipping Git integration (--SkipGit specified)" -ForegroundColor Yellow
}

# Create production directory if it doesn't exist
if (!(Test-Path $prodPath)) {
    Write-Host "[1/6] 📁 Creating production directory..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $prodPath -Force | Out-Null
}

# Create backup using timestamp
$backupName = "papirklips-jagt_backup_$(Get-Date -Format 'yyyy-MM-dd_HH-mm')"
$backupPath = "Z:\$backupName"
if (Test-Path $prodPath) {
    Write-Host "[2/6] 📦 Creating backup: $backupName" -ForegroundColor Cyan
    robocopy "$prodPath" "$backupPath" /MIR /XD node_modules .git /XF *.log
}

# Copy files to production using Robocopy (Phase 1 method)
Write-Host '[3/6] 📂 Syncing files to production using Robocopy...' -ForegroundColor Cyan

# Check if staging workspace exists, otherwise use current directory
if (!(Test-Path $stagingPath)) {
    Write-Host "⚠️  Staging workspace $stagingPath not found, using current directory instead" -ForegroundColor Yellow
    $stagingPath = Get-Location
}

robocopy "$stagingPath" "$prodPath" /MIR /XD node_modules .git test-* /XF *.log

# Copy node_modules separately for performance
Write-Host '[4/6] 📦 Copying node_modules...' -ForegroundColor Cyan
if (Test-Path "$stagingPath\node_modules") {
    robocopy "$stagingPath\node_modules" "$prodPath\node_modules" /MIR
}

Write-Host '[5/6] 🔄 Deploying to NAS via SSH...' -ForegroundColor Cyan

# Create directory on NAS
ssh $sshHost "mkdir -p $nasPath"

# Upload to NAS using SSH with tar
Write-Host '📤 Uploading files to NAS via SSH...' -ForegroundColor Cyan

# Create tar archive for efficient transfer
$tarFile = "production-files.tar.gz"
tar -czf $tarFile -C $prodPath *

# Transfer via SSH and extract
$transferCommand = @"
cat > /tmp/$tarFile && cd $nasPath && rm -rf * && tar -xzf /tmp/$tarFile && rm /tmp/$tarFile
"@

Get-Content $tarFile -AsByteStream | ssh $sshHost $transferCommand
$uploadExitCode = $LASTEXITCODE

# Clean up local files
Remove-Item $tarFile -Force -ErrorAction SilentlyContinue

if ($uploadExitCode -ne 0) {
    Write-Host "❌ Failed to upload files to NAS" -ForegroundColor Red
    exit 1
}

# Install dependencies on NAS
Write-Host '📦 Installing dependencies on NAS...' -ForegroundColor Cyan
ssh $sshHost "cd $nasPath && /usr/local/bin/node /usr/local/bin/npm install --production"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Setup PM2 process with correct port
Write-Host '🚀 Setting up PM2 with production settings...' -ForegroundColor Cyan
$pm2Config = @"
{
    "name": "$pm2Process",
    "script": "server.js",
    "cwd": "$nasPath",
    "env": {
        "NODE_ENV": "production",
        "PORT": "$prodPort"
    },
    "instances": 1,
    "exec_mode": "fork"
}
"@

# Write PM2 config and start process
ssh $sshHost "cd $nasPath && echo '$pm2Config' > ecosystem.config.js"
ssh $sshHost "PATH=/usr/local/bin:\$PATH /usr/local/bin/node /usr/local/bin/pm2 delete $pm2Process || true"
ssh $sshHost "PATH=/usr/local/bin:\$PATH /usr/local/bin/node /usr/local/bin/pm2 start ecosystem.config.js"
ssh $sshHost "PATH=/usr/local/bin:\$PATH /usr/local/bin/node /usr/local/bin/pm2 save"

Start-Sleep -Seconds 5

# Test production
Write-Host '[6/6] 🔍 Testing production...' -ForegroundColor Cyan
try {
    $result = Invoke-RestMethod -Uri "http://192.168.86.41:$prodPort/api/leaderboard"
    Write-Host '✅ Production deployment successful!' -ForegroundColor Green
    Write-Host "   Leaderboard has $($result.Count) entries" -ForegroundColor Gray
    Write-Host "   Production running on port $prodPort" -ForegroundColor Gray
} catch {
    Write-Host '❌ Production test failed!' -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host "   Check PM2 status: ssh $sshHost 'pm2 status'" -ForegroundColor Yellow
}

Write-Host ''
Write-Host "📎 Papirklips Jagt Production is now live at http://192.168.86.41:$prodPort" -ForegroundColor Green
Write-Host "   Staging: http://192.168.86.41:8082" -ForegroundColor Cyan
Write-Host "   Production: http://192.168.86.41:$prodPort" -ForegroundColor Cyan
