$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = if (Test-Path 'C:\node\node.exe') { 'C:\node\node.exe' } else { (Get-Command node -ErrorAction Stop).Source }
$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$existing = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like "*$root*server.js*" }
foreach ($p in $existing) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
$out = Join-Path $logDir 'server.out.log'
$err = Join-Path $logDir 'server.err.log'
$env:PORT = if ($env:PORT) { $env:PORT } else { '3000' }
Start-Process -FilePath $node -ArgumentList (Join-Path $root 'server.js') -WorkingDirectory $root -RedirectStandardOutput $out -RedirectStandardError $err -WindowStyle Hidden
Start-Sleep -Seconds 2
$listener = Get-NetTCPConnection -LocalPort ([int]$env:PORT) -State Listen -ErrorAction SilentlyContinue
if (-not $listener) { Get-Content $err -Tail 40 -ErrorAction SilentlyContinue; throw "FC server did not listen on port $env:PORT" }
Write-Output "FC server running on port $env:PORT"
