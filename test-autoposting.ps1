# PowerShell Script to Test X and Redgifs Auto-Posting Systems
# This script will test the functionality of both auto-posting systems

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "           AURORA BOT - AUTO-POSTING SYSTEM TESTS" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# Function to test if bot is running
function Test-BotRunning {
    Write-Host "🔍 Checking if bot is running..." -ForegroundColor Yellow
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "✅ Bot is running (PID: $($nodeProcesses.Id -join ', '))" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Bot is not running" -ForegroundColor Red
        return $false
    }
}

# Function to check environment variables
function Test-EnvironmentVariables {
    Write-Host ""
    Write-Host "🔍 Checking environment variables..." -ForegroundColor Yellow
    
    # Check if .env file exists
    if (Test-Path ".env") {
        Write-Host "✅ .env file found" -ForegroundColor Green
        
        # Read .env file and check for required variables
        $envContent = Get-Content ".env"
        $requiredVars = @("ENABLE_REDGIFS", "ENABLE_X_TWITTER", "TOKEN")
        
        foreach ($var in $requiredVars) {
            $found = $envContent | Where-Object { $_ -like "$var=*" }
            if ($found) {
                $value = ($found -split "=", 2)[1]
                if ($var -eq "TOKEN") {
                    Write-Host "✅ $var = [HIDDEN]" -ForegroundColor Green
                } else {
                    Write-Host "✅ $var = $value" -ForegroundColor Green
                }
            } else {
                Write-Host "❌ $var not found in .env" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "❌ .env file not found" -ForegroundColor Red
    }
}

# Function to check if required files exist
function Test-RequiredFiles {
    Write-Host ""
    Write-Host "🔍 Checking required files..." -ForegroundColor Yellow
    
    $requiredFiles = @(
        "Functions\AutoWebScrapeSender.js",
        "Functions\others\redgifs_requester.js", 
        "Functions\others\x_twitter_requester.js",
        "commands\Configs\AutoRedgifs.js",
        "commands\Configs\AutoX.js"
    )
    
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-Host "✅ $file exists" -ForegroundColor Green
        } else {
            Write-Host "❌ $file missing" -ForegroundColor Red
        }
    }
}

# Function to test file syntax
function Test-FileSyntax {
    Write-Host ""
    Write-Host "🔍 Testing JavaScript file syntax..." -ForegroundColor Yellow
    
    $testFiles = @(
        "Functions\AutoWebScrapeSender.js",
        "commands\Configs\AutoRedgifs.js",
        "commands\Configs\AutoX.js"
    )
    
    foreach ($file in $testFiles) {
        if (Test-Path $file) {
            try {
                # Test syntax by running node --check
                $result = node --check $file 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ $file syntax OK" -ForegroundColor Green
                } else {
                    Write-Host "❌ $file syntax error: $result" -ForegroundColor Red
                }
            } catch {
                Write-Host "❌ Error checking $file" -ForegroundColor Red
            }
        }
    }
}

# Function to analyze bot logs
function Test-BotLogs {
    Write-Host ""
    Write-Host "🔍 Analyzing recent bot logs..." -ForegroundColor Yellow
    
    # Check for recent log file
    $logFiles = Get-ChildItem "logs\*.jsonl" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    
    if ($logFiles) {
        $latestLog = $logFiles[0]
        Write-Host "✅ Found log file: $($latestLog.Name)" -ForegroundColor Green
        
        # Check last 20 lines for auto-posting activity
        $recentLines = Get-Content $latestLog.FullName -Tail 20 -ErrorAction SilentlyContinue
        
        $autoWebScrapeCount = ($recentLines | Where-Object { $_ -like "*AutoWebScrape*" }).Count
        $redgifsCount = ($recentLines | Where-Object { $_ -like "*redgifs*" }).Count
        $xCount = ($recentLines | Where-Object { $_ -like "*x amateur*" -or $_ -like "*x twitter*" }).Count
        
        Write-Host "📊 Recent activity in logs:" -ForegroundColor Cyan
        Write-Host "   - AutoWebScrape messages: $autoWebScrapeCount" -ForegroundColor White
        Write-Host "   - Redgifs messages: $redgifsCount" -ForegroundColor White
        Write-Host "   - X/Twitter messages: $xCount" -ForegroundColor White
        
    } else {
        Write-Host "❌ No log files found" -ForegroundColor Red
    }
}

# Function to test memory usage
function Test-MemoryUsage {
    Write-Host ""
    Write-Host "🔍 Checking memory usage..." -ForegroundColor Yellow
    
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        foreach ($process in $nodeProcesses) {
            $memoryMB = [math]::Round($process.WorkingSet64 / 1MB, 2)
            Write-Host "📊 Node process PID $($process.Id): ${memoryMB}MB" -ForegroundColor Cyan
            
            if ($memoryMB -gt 500) {
                Write-Host "⚠️  High memory usage detected" -ForegroundColor Yellow
            } elseif ($memoryMB -gt 100) {
                Write-Host "✅ Normal memory usage" -ForegroundColor Green
            } else {
                Write-Host "✅ Low memory usage" -ForegroundColor Green
            }
        }
    }
}

# Function to simulate testing commands
function Test-CommandStructure {
    Write-Host ""
    Write-Host "🔍 Testing command structure..." -ForegroundColor Yellow
    
    # Test AutoRedgifs command structure
    if (Test-Path "commands\Configs\AutoRedgifs.js") {
        $redgifsContent = Get-Content "commands\Configs\AutoRedgifs.js" -Raw
        
        $hasStartAction = $redgifsContent -like "*start*"
        $hasStopAction = $redgifsContent -like "*stop*"
        $hasStatusAction = $redgifsContent -like "*status*"
        $hasNextPostTiming = $redgifsContent -like "*nextPost*"
        
        Write-Host "📊 AutoRedgifs command analysis:" -ForegroundColor Cyan
        Write-Host "   ✅ Start action: $hasStartAction" -ForegroundColor $(if($hasStartAction){"Green"}else{"Red"})
        Write-Host "   ✅ Stop action: $hasStopAction" -ForegroundColor $(if($hasStopAction){"Green"}else{"Red"})
        Write-Host "   ✅ Status action: $hasStatusAction" -ForegroundColor $(if($hasStatusAction){"Green"}else{"Red"})
        Write-Host "   ✅ Next post timing: $hasNextPostTiming" -ForegroundColor $(if($hasNextPostTiming){"Green"}else{"Red"})
    }
    
    # Test AutoX command structure
    if (Test-Path "commands\Configs\AutoX.js") {
        $xContent = Get-Content "commands\Configs\AutoX.js" -Raw
        
        $hasStartAction = $xContent -like "*start*"
        $hasStopAction = $xContent -like "*stop*"
        $hasStatusAction = $xContent -like "*status*"
        $hasNextPostTiming = $xContent -like "*nextPost*"
        
        Write-Host "📊 AutoX command analysis:" -ForegroundColor Cyan
        Write-Host "   ✅ Start action: $hasStartAction" -ForegroundColor $(if($hasStartAction){"Green"}else{"Red"})
        Write-Host "   ✅ Stop action: $hasStopAction" -ForegroundColor $(if($hasStopAction){"Green"}else{"Red"})
        Write-Host "   ✅ Status action: $hasStatusAction" -ForegroundColor $(if($hasStatusAction){"Green"}else{"Red"})
        Write-Host "   ✅ Next post timing: $hasNextPostTiming" -ForegroundColor $(if($hasNextPostTiming){"Green"}else{"Red"})
    }
}

# Function to test AutoWebScrapeSender functionality
function Test-AutoWebScrapeSender {
    Write-Host ""
    Write-Host "🔍 Testing AutoWebScrapeSender functionality..." -ForegroundColor Yellow
    
    if (Test-Path "Functions\AutoWebScrapeSender.js") {
        $senderContent = Get-Content "Functions\AutoWebScrapeSender.js" -Raw
        
        $hasRedgifsStatus = $senderContent -like "*getRedgifsStatus*"
        $hasXStatus = $senderContent -like "*getXStatus*"
        $hasStartRedgifs = $senderContent -like "*startRedgifsPosting*"
        $hasStartX = $senderContent -like "*startXPosting*"
        $hasEmergencyStop = $senderContent -like "*emergencyStop*"
        $hasLastPostTime = $senderContent -like "*lastPostTime*"
        
        Write-Host "📊 AutoWebScrapeSender analysis:" -ForegroundColor Cyan
        Write-Host "   ✅ Redgifs status method: $hasRedgifsStatus" -ForegroundColor $(if($hasRedgifsStatus){"Green"}else{"Red"})
        Write-Host "   ✅ X status method: $hasXStatus" -ForegroundColor $(if($hasXStatus){"Green"}else{"Red"})
        Write-Host "   ✅ Start Redgifs method: $hasStartRedgifs" -ForegroundColor $(if($hasStartRedgifs){"Green"}else{"Red"})
        Write-Host "   ✅ Start X method: $hasStartX" -ForegroundColor $(if($hasStartX){"Green"}else{"Red"})
        Write-Host "   ✅ Emergency stop method: $hasEmergencyStop" -ForegroundColor $(if($hasEmergencyStop){"Green"}else{"Red"})
        Write-Host "   ✅ Last post time tracking: $hasLastPostTime" -ForegroundColor $(if($hasLastPostTime){"Green"}else{"Red"})
    }
}

# Function to show current system status
function Show-SystemStatus {
    Write-Host ""
    Write-Host "🔍 Current system status..." -ForegroundColor Yellow
    
    # Check if any auto-posting is currently active (from logs)
    $logFiles = Get-ChildItem "logs\*.jsonl" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    
    if ($logFiles) {
        $latestLog = $logFiles[0]
        $recentLines = Get-Content $latestLog.FullName -Tail 50 -ErrorAction SilentlyContinue
        
        # Look for recent scheduling messages
        $recentScheduling = $recentLines | Where-Object { 
            $_ -like "*Next*post scheduled*" -or 
            $_ -like "*Started auto*" -or 
            $_ -like "*AutoWebScrape*"
        } | Select-Object -Last 10
        
        if ($recentScheduling) {
            Write-Host "📊 Recent auto-posting activity:" -ForegroundColor Cyan
            foreach ($line in $recentScheduling) {
                if ($line -like "*Next*post scheduled*") {
                    Write-Host "   ⏰ $line" -ForegroundColor Green
                } elseif ($line -like "*Started auto*") {
                    Write-Host "   🚀 $line" -ForegroundColor Blue
                } else {
                    Write-Host "   📡 $line" -ForegroundColor White
                }
            }
        } else {
            Write-Host "📊 No recent auto-posting activity found" -ForegroundColor Yellow
        }
    }
}

# Function to provide recommendations
function Show-Recommendations {
    Write-Host ""
    Write-Host "==================================================================" -ForegroundColor Cyan
    Write-Host "                           RECOMMENDATIONS" -ForegroundColor Cyan
    Write-Host "==================================================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "🔧 To test the auto-posting systems manually:" -ForegroundColor Yellow
    Write-Host "   1. Use Discord command: /auto-redgifs action:start category:amateur" -ForegroundColor White
    Write-Host "   2. Use Discord command: /auto-x action:start category:amateur" -ForegroundColor White
    Write-Host "   3. Check status with: /auto-redgifs action:status" -ForegroundColor White
    Write-Host "   4. Check status with: /auto-x action:status" -ForegroundColor White
    Write-Host ""
    
    Write-Host "🛠️  For debugging:" -ForegroundColor Yellow
    Write-Host "   - Monitor logs in real-time: Get-Content logs\logs_*.jsonl -Wait -Tail 10" -ForegroundColor White
    Write-Host "   - Check memory usage: /emergencystop action:status" -ForegroundColor White
    Write-Host "   - Clear cron jobs if high memory: /emergencystop action:clear-cron" -ForegroundColor White
    Write-Host ""
    
    Write-Host "⚠️  Emergency commands:" -ForegroundColor Yellow
    Write-Host "   - Stop all systems: /emergencystop action:execute" -ForegroundColor White
    Write-Host "   - Restart systems: /emergencystop action:reinitialize" -ForegroundColor White
    Write-Host ""
}

# Main execution
Write-Host "Starting comprehensive auto-posting system tests..." -ForegroundColor Green
Write-Host ""

# Run all tests
Test-BotRunning
Test-EnvironmentVariables
Test-RequiredFiles
Test-FileSyntax
Test-BotLogs
Test-MemoryUsage
Test-CommandStructure
Test-AutoWebScrapeSender
Show-SystemStatus
Show-Recommendations

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "                        TESTING COMPLETED" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
