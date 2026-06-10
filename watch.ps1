# Blissri — auto-pull watcher (optional, most hands-off option).
# Leave this running in its own terminal. Every 10 seconds it checks the
# remote branch and pulls automatically when there are new changes, so my
# edits land on your disk with zero typing. Then just refresh the browser.
#
# Run the server separately (.\dev.ps1) and keep it running.
# Stop this watcher with Ctrl+C.

Set-Location $PSScriptRoot
$branch = "claude/hopeful-darwin-nxcpyo"

Write-Host "Watching $branch for changes (checks every 10s). Ctrl+C to stop." -ForegroundColor Magenta
git checkout $branch 2>$null

while ($true) {
    git fetch origin 2>$null
    $local  = git rev-parse HEAD
    $remote = git rev-parse "origin/$branch"
    if ($local -ne $remote) {
        Write-Host ("[{0}] New changes found - pulling..." -f (Get-Date -Format "HH:mm:ss")) -ForegroundColor Cyan
        git pull origin $branch
        Write-Host "Pulled. Hard-refresh the browser (Ctrl+F5)." -ForegroundColor Green
    }
    Start-Sleep -Seconds 10
}
