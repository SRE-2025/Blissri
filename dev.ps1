# Blissri — local dev launcher
# Run this ONCE, then leave the window open. It pulls the latest changes
# and starts the local server. Stop it with Ctrl+C.

Set-Location $PSScriptRoot
$branch = "claude/hopeful-darwin-nxcpyo"

Write-Host "Pulling latest from $branch ..." -ForegroundColor Cyan
git fetch origin
git checkout $branch 2>$null
git pull origin $branch

Write-Host ""
Write-Host "Server starting at http://localhost:3000   (Ctrl+C to stop)" -ForegroundColor Magenta
Write-Host "To get new changes later: open a 2nd terminal and run  .\update.ps1" -ForegroundColor DarkGray
Write-Host ""
node server/server.js
