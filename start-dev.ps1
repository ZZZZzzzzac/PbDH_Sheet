$ErrorActionPreference = "Stop"

$HostName = "127.0.0.1"
$StartPort = 5173
$EndPort = 5199

function Test-PortFree {
  param([int]$Port)

  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse($HostName), $Port)
  try {
    $listener.Start()
    return $true
  }
  catch {
    return $false
  }
  finally {
    $listener.Stop()
  }
}

function Find-FreePort {
  for ($port = $StartPort; $port -le $EndPort; $port++) {
    if (Test-PortFree -Port $port) {
      return $port
    }
  }

  throw "No free port found from $StartPort to $EndPort."
}

if (-not (Test-Path -LiteralPath "package.json")) {
  throw "Run this script from the repository root."
}

if (-not (Test-Path -LiteralPath "node_modules")) {
  throw "node_modules not found. Run 'npm install' first."
}

$viteBin = Join-Path $PSScriptRoot "node_modules\.bin\vite.cmd"
if (-not (Test-Path -LiteralPath $viteBin)) {
  throw "Vite launcher not found. Run 'npm install' first."
}

$port = Find-FreePort
$url = "http://${HostName}:$port"

Write-Host "Starting dev server at $url"

$openBrowserJob = Start-Job -ScriptBlock {
  param($HostName, $Port, $Url)

  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
      $connect = $client.BeginConnect($HostName, $Port, $null, $null)
      if ($connect.AsyncWaitHandle.WaitOne(300)) {
        $client.EndConnect($connect)
        Start-Process $Url
        return
      }
    }
    catch {
    }
    finally {
      $client.Close()
    }

    Start-Sleep -Milliseconds 300
  }
} -ArgumentList $HostName, $port, $url

Write-Host "Browser will open when server is ready. Press Ctrl+C to stop."
& $viteBin --host $HostName --port $port
$devExitCode = $LASTEXITCODE

Receive-Job -Job $openBrowserJob -ErrorAction SilentlyContinue | Out-Null
Remove-Job -Job $openBrowserJob -Force -ErrorAction SilentlyContinue

exit $devExitCode
