# Deploy Papirklips Jagt to Production
Write-Host '📎 Deploying Papirklips Jagt to Production...' -ForegroundColor Green

# Create production directory if it doesn't exist
$prodPath = "z:\papirklips-jagt"
if (!(Test-Path $prodPath)) {
    Write-Host "📁 Creating production directory..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $prodPath -Force | Out-Null
}

# Create backup
$backupName = "papirklips-jagt_backup_$(Get-Date -Format 'yyyy-MM-dd_HH-mm')"
if (Test-Path $prodPath) {
    Write-Host "📦 Creating backup: $backupName" -ForegroundColor Cyan
    Copy-Item -Path $prodPath -Destination "z:\$backupName" -Recurse -Force -ErrorAction SilentlyContinue
}

# Copy files to production
Write-Host '📂 Copying files to production...' -ForegroundColor Cyan
Remove-Item -Path "$prodPath\*" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path "z:\papirklips-jagt-staging\*" -Destination "$prodPath\" -Recurse -Force -Exclude @('node_modules', '.git', 'test-*', '*.log')

# Copy node_modules separately (faster)
Write-Host '📦 Copying node_modules...' -ForegroundColor Cyan
if (!(Test-Path "$prodPath\node_modules")) {
    Copy-Item -Path "z:\papirklips-jagt-staging\node_modules" -Destination "$prodPath\node_modules" -Recurse -Force
}

Write-Host '🔄 Deploying to NAS via SSH...' -ForegroundColor Cyan
$nasPath = "/volume1/@appdata/ContainerManager/all_shares/web/papirklips_com"

# Create directory on NAS
ssh Familieadmin@192.168.86.41 "mkdir -p $nasPath"

# Rsync files to NAS
Write-Host '📤 Uploading files to NAS...' -ForegroundColor Cyan
& "C:\Program Files\Git\usr\bin\rsync.exe" -avz --delete `
    --exclude 'node_modules' `
    --exclude '.git' `
    --exclude 'test-*' `
    --exclude '*.log' `
    "$prodPath/" "Familieadmin@192.168.86.41:$nasPath/"

# Install dependencies on NAS
Write-Host '📦 Installing dependencies on NAS...' -ForegroundColor Cyan
ssh Familieadmin@192.168.86.41 "cd $nasPath; npm install --production"

# Setup PM2 process
Write-Host '🚀 Setting up PM2...' -ForegroundColor Cyan
ssh Familieadmin@192.168.86.41 "cd $nasPath; pm2 delete papirklips-website; pm2 start server.js --name papirklips-website; pm2 save"

Start-Sleep -Seconds 5

# Test production
Write-Host '🔍 Testing production...' -ForegroundColor Cyan
try {
    $result = Invoke-RestMethod -Uri 'http://slambert.com:8082/api/leaderboard'
    Write-Host '✅ Production deployment successful!' -ForegroundColor Green
    Write-Host "   Leaderboard has $($result.Count) entries" -ForegroundColor Gray
} catch {
    Write-Host '❌ Production test failed!' -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host ''
Write-Host '📎 Papirklips Jagt is now live at http://slambert.com:8082' -ForegroundColor Green
