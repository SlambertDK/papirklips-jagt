# Backup and Rollback System for Papirklips Jagt
# Usage: .\backup-and-rollback.ps1 [backup|rollback] [staging|production]

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
$remoteHost = "192.168.86.41"
$remoteUser = "Familieadmin"

# Ensure backup directory exists
if (!(Test-Path $backupBasePath)) {
    New-Item -ItemType Directory -Path $backupBasePath -Force | Out-Null
    Write-Host "📁 Created backup directory: $backupBasePath" -ForegroundColor Cyan
}

function Create-Backup {
    param($SourcePath, $BackupLabel)
    
    $timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
    $backupName = "${BackupLabel}_${timestamp}"
    $backupPath = Join-Path $backupBasePath $backupName
    
    Write-Host "📦 Creating backup: $backupName" -ForegroundColor Cyan
    Write-Host "   Source: $SourcePath" -ForegroundColor Gray
    Write-Host "   Backup: $backupPath" -ForegroundColor Gray
    
    if (Test-Path $SourcePath) {
        robocopy "$SourcePath" "$backupPath" /MIR /XD node_modules .git /XF *.log /NJH /NJS
        
        # Create backup metadata
        $metadata = @{
            timestamp = $timestamp
            source = $SourcePath
            backup = $backupPath
            environment = $BackupLabel
            files_count = (Get-ChildItem -Recurse $backupPath | Measure-Object).Count
        }
        $metadata | ConvertTo-Json | Out-File "$backupPath\_backup_metadata.json"
        
        Write-Host "✅ Backup completed: $backupName" -ForegroundColor Green
        return $backupPath
    } else {
        Write-Host "❌ Source path not found: $SourcePath" -ForegroundColor Red
        return $null
    }
}

function List-Backups {
    Write-Host "`n📋 Available backups:" -ForegroundColor Cyan
    $backups = Get-ChildItem $backupBasePath -Directory | Sort-Object CreationTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Host "   No backups found" -ForegroundColor Yellow
        return
    }
    
    foreach ($backup in $backups) {
        $metadataPath = Join-Path $backup.FullName "_backup_metadata.json"
        if (Test-Path $metadataPath) {
            $metadata = Get-Content $metadataPath | ConvertFrom-Json
            $age = (Get-Date) - $backup.CreationTime
            $ageString = if ($age.Days -gt 0) { "$($age.Days)d $($age.Hours)h ago" } else { "$($age.Hours)h $($age.Minutes)m ago" }
            
            Write-Host "   $($backup.Name)" -ForegroundColor White
            Write-Host "     Created: $ageString" -ForegroundColor Gray
            Write-Host "     Environment: $($metadata.environment)" -ForegroundColor Gray
            Write-Host "     Files: $($metadata.files_count)" -ForegroundColor Gray
        } else {
            Write-Host "   $($backup.Name) (no metadata)" -ForegroundColor Yellow
        }
        Write-Host ""
    }
}

function Restore-Backup {
    param($TargetPath, $Environment)
    
    Write-Host "`n🔄 Available backups for $Environment restoration:" -ForegroundColor Cyan
    $backups = Get-ChildItem $backupBasePath -Directory | 
               Where-Object { $_.Name -like "*$Environment*" } | 
               Sort-Object CreationTime -Descending | 
               Select-Object -First 10
    
    if ($backups.Count -eq 0) {
        Write-Host "❌ No backups found for $Environment" -ForegroundColor Red
        return
    }
    
    for ($i = 0; $i -lt $backups.Count; $i++) {
        $backup = $backups[$i]
        $age = (Get-Date) - $backup.CreationTime
        $ageString = if ($age.Days -gt 0) { "$($age.Days)d $($age.Hours)h ago" } else { "$($age.Hours)h $($age.Minutes)m ago" }
        Write-Host "   $($i + 1). $($backup.Name) ($ageString)" -ForegroundColor White
    }
    
    $selection = Read-Host "`nSelect backup to restore (1-$($backups.Count)) or 'q' to quit"
    
    if ($selection -eq 'q') {
        Write-Host "Rollback cancelled" -ForegroundColor Yellow
        return
    }
    
    try {
        $selectedIndex = [int]$selection - 1
        if ($selectedIndex -lt 0 -or $selectedIndex -ge $backups.Count) {
            Write-Host "❌ Invalid selection" -ForegroundColor Red
            return
        }
        
        $selectedBackup = $backups[$selectedIndex]
        
        Write-Host "`n⚠️  WARNING: This will overwrite current $Environment files!" -ForegroundColor Yellow
        $confirm = Read-Host "Type 'RESTORE' to confirm rollback"
        
        if ($confirm -ne 'RESTORE') {
            Write-Host "Rollback cancelled" -ForegroundColor Yellow
            return
        }
        
        Write-Host "`n🔄 Rolling back to: $($selectedBackup.Name)" -ForegroundColor Cyan
        
        # Create a backup of current state before rollback
        $preRollbackBackup = Create-Backup $TargetPath "pre-rollback-$Environment"
        
        # Perform rollback
        robocopy "$($selectedBackup.FullName)" "$TargetPath" /MIR /XF "_backup_metadata.json" /NJH /NJS
        
        Write-Host "✅ Rollback completed!" -ForegroundColor Green
        Write-Host "   Restored from: $($selectedBackup.Name)" -ForegroundColor Gray
        Write-Host "   Pre-rollback backup: $preRollbackBackup" -ForegroundColor Gray
        
        # If production rollback, also need to deploy to NAS
        if ($Environment -eq "production") {
            Write-Host "`n🚀 Deploying rolled-back version to production server..." -ForegroundColor Cyan
            & "$PSScriptRoot\deploy-prod.ps1"
        }
        
    } catch {
        Write-Host "❌ Invalid selection: $selection" -ForegroundColor Red
    }
}

# Main execution
switch ($Action) {
    "backup" {
        Write-Host "🔄 Starting backup operation..." -ForegroundColor Cyan
        
        switch ($Environment) {
            "staging" {
                Create-Backup $stagingPath "staging"
            }
            "production" {
                Create-Backup $prodPath "production"
            }
            "both" {
                Create-Backup $stagingPath "staging"
                Create-Backup $prodPath "production"
            }
        }
    }
    
    "rollback" {
        Write-Host "🔄 Starting rollback operation..." -ForegroundColor Cyan
        
        switch ($Environment) {
            "staging" {
                Restore-Backup $stagingPath "staging"
            }
            "production" {
                Restore-Backup $prodPath "production"
            }
            "both" {
                Write-Host "❌ Cannot rollback both environments simultaneously. Please specify staging or production." -ForegroundColor Red
                exit 1
            }
        }
    }
    
    "list" {
        List-Backups
    }
}

Write-Host "`n📎 Backup & Rollback operation completed!" -ForegroundColor Green