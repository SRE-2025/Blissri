# Blissri — pull the latest changes WITHOUT restarting the server.
# Run this in a second terminal whenever you want my new edits.
# The running server serves files straight from disk, so after this
# you just HARD-REFRESH the browser (Ctrl+F5). No need to kill anything.

Set-Location $PSScriptRoot
$branch = "claude/hopeful-darwin-nxcpyo"

git fetch origin
git pull origin $branch

Write-Host ""
Write-Host "Up to date. Now hard-refresh the browser:  Ctrl + F5" -ForegroundColor Green
