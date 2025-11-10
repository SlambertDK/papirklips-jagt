# Simple Backup and Rollback System for Papirklips Jagt
# Usage: .\backup-simple.ps1 [backup|rollback|list] [staging|production]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("backup", "rollback", "list")]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("staging", "production", "both")]
    [string]$Environment = "both"
)

# Configuration
$stagingPath = "Z:\papirklips-slambert-com-staging"
$prodPath = "Z:\papirklips-jagt"
$backupBasePath = "Z:\backups\papirklips-jagt"

# Ensure backup directory exists
if (!(Test-Path $backupBasePath)) {
    New-Item -ItemType Directory -Path $backupBasePath -Force | Out-Null
    Write-Host "📁 Created backup directory: $backupBasePath" -ForegroundColor Cyan
}

function New-Backup {
    param([string]$SourcePath, [string]$BackupLabel)
    
    $timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
    $backupName = "${BackupLabel}_${timestamp}"
    $backupPath = Join-Path $backupBasePath $backupName
    
    Write-Host "📦 Creating backup: $backupName" -ForegroundColor Cyan
    
    if (Test-Path $SourcePath) {
        robocopy "$SourcePath" "$backupPath" /MIR /XD node_modules .git /XF *.log /NJH /NJS
        Write-Host "✅ Backup completed: $backupName" -ForegroundColor Green
        return $backupPath
    } else {
        Write-Host "❌ Source path not found: $SourcePath" -ForegroundColor Red
        return $null
    }
}

function Get-BackupList {
    Write-Host "`n📋 Available backups:" -ForegroundColor Cyan
    $backups = Get-ChildItem $backupBasePath -Directory | Sort-Object CreationTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Host "   No backups found" -ForegroundColor Yellow
        return
    }
    
    foreach ($backup in $backups) {
        $age = (Get-Date) - $backup.CreationTime
        $ageString = if ($age.Days -gt 0) { "$($age.Days)d ago" } else { "$($age.Hours)h ago" }
        Write-Host "   $($backup.Name) ($ageString)" -ForegroundColor White
    }
}

# Main execution
switch ($Action) {
    "backup" {
        Write-Host "🔄 Starting backup operation..." -ForegroundColor Cyan
        
        if ($Environment -eq "staging" -or $Environment -eq "both") {
            New-Backup $stagingPath "staging"
        }
        if ($Environment -eq "production" -or $Environment -eq "both") {
            New-Backup $prodPath "production"
        }
    }
    
    "rollback" {
        Write-Host "🔄 Manual rollback required:" -ForegroundColor Cyan
        Get-BackupList
        Write-Host "`nTo rollback manually:" -ForegroundColor Yellow
        Write-Host "1. Stop the relevant PM2 process" -ForegroundColor Gray
        Write-Host "2. Copy backup files to target directory" -ForegroundColor Gray
        Write-Host "3. Restart PM2 process" -ForegroundColor Gray
    }
    
    "list" {
        Get-BackupList
    }
}

Write-Host "`n📎 Backup operation completed!" -ForegroundColor Green