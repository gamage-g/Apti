# Apti — daily study reminder sender
# Called by Windows Task Scheduler. Sends a Web Push to all subscribers.
# Set PUSH_SECRET as a Windows environment variable (System > Advanced > Environment Variables).
$secret = $env:PUSH_SECRET
if (-not $secret) {
    Add-Content "$PSScriptRoot\reminder.log" "$(Get-Date -Format 'yyyy-MM-dd HH:mm') SKIP PUSH_SECRET not set"
    exit 1
}
try {
    $r = Invoke-WebRequest -Uri "https://apti-api.onrender.com/api/push/send-reminder" `
        -Method POST -Headers @{ "X-Push-Secret" = $secret } -UseBasicParsing -TimeoutSec 15
    Add-Content "$PSScriptRoot\reminder.log" "$(Get-Date -Format 'yyyy-MM-dd HH:mm') OK $($r.Content)"
} catch {
    Add-Content "$PSScriptRoot\reminder.log" "$(Get-Date -Format 'yyyy-MM-dd HH:mm') FAIL $_"
}
