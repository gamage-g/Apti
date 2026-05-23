# Apti — daily study reminder sender
# Called by Windows Task Scheduler. Sends a Web Push to all subscribers.
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/push/send-reminder" `
        -Method POST -UseBasicParsing -TimeoutSec 15
    Add-Content "$PSScriptRoot\reminder.log" "$(Get-Date -Format 'yyyy-MM-dd HH:mm') OK $($r.Content)"
} catch {
    Add-Content "$PSScriptRoot\reminder.log" "$(Get-Date -Format 'yyyy-MM-dd HH:mm') FAIL $_"
}
