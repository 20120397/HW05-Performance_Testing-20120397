param(
  [Parameter(Mandatory=$true)]
  [ValidateSet("verify", "load", "stress", "spike", "endurance")]
  [string]$Scenario
)

$ErrorActionPreference = "Stop"
$HWRoot = "D:\KTPM\HW05\20120397"
$SutDir = "D:\KTPM\eshop-sut\backend"
$JMeterBat = "D:\KTPM\jmeter\apache-jmeter-5.6.3\apache-jmeter-5.6.3\bin\jmeter.bat"
$Log4jCfg = "file:///D:/KTPM/HW05/20120397/scripts/log4j2-cli.xml"

$JmxMap = @{
  "load"      = "$HWRoot\test-plans\20120397_Load_20261122.jmx"
  "stress"    = "$HWRoot\test-plans\20120397_Stress_20261122.jmx"
  "spike"     = "$HWRoot\test-plans\20120397_Spike_20261122.jmx"
  "endurance" = "$HWRoot\test-plans\20120397_Endurance_20261122.jmx"
}

$serverOutLog = "$HWRoot\evidence\sut-$Scenario-stdout.log"
$serverErrLog = "$HWRoot\evidence\sut-$Scenario-stderr.log"

Write-Host "[$Scenario] Starting SUT backend at $SutDir..."
$serverProc = Start-Process -FilePath "node" `
  -ArgumentList "server.js" `
  -WorkingDirectory $SutDir `
  -RedirectStandardOutput $serverOutLog `
  -RedirectStandardError $serverErrLog `
  -PassThru -NoNewWindow

$monitorProc = $null

try {
  # Wait for port 3000 /api/categories
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    if ($serverProc.HasExited) {
      throw "SUT backend exited prematurely with code $($serverProc.ExitCode). Check $serverErrLog"
    }
    try {
      $resp = Invoke-WebRequest -Uri "http://localhost:3000/api/categories" -UseBasicParsing -TimeoutSec 2
      if ($resp.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {}
  }
  if (-not $ready) {
    throw "SUT backend failed to respond on http://localhost:3000 within 15s"
  }
  Write-Host "[$Scenario] SUT backend ready (PID: $($serverProc.Id)). Seeding data..."
  & node "$HWRoot\scripts\seed-sut.js"

  if ($Scenario -eq "verify") {
    Write-Host "[verify] Running lockout & functional bug verification..."
    & node "$HWRoot\scripts\verify-lockout-and-bugs.js"
    return
  }

  $JtlNameMap = @{
    "load"      = "20120397_Load_20261122.jtl"
    "stress"    = "20120397_Stress_20261122.jtl"
    "spike"     = "20120397_Spike_20261122.jtl"
    "endurance" = "20120397_Endurance_20261122.jtl"
  }

  $outDir = "$HWRoot\results\$Scenario"
  $jtlPath = "$outDir\$($JtlNameMap[$Scenario])"
  $htmlDir = "$outDir\html-report"
  $jmeterLog = "$outDir\jmeter.log"
  $resCsv = "$HWRoot\evidence\resource-usage-$Scenario.csv"

  if (Test-Path $jtlPath) { Remove-Item -Force $jtlPath }
  if (Test-Path $htmlDir) { Remove-Item -Recurse -Force $htmlDir }
  if (Test-Path $jmeterLog) { Remove-Item -Force $jmeterLog }
  if (Test-Path $resCsv) { Remove-Item -Force $resCsv }

  # Start background PowerShell resource monitor polling the exact SUT PID every 2s
  $monScript = @"
`$targetPid = $($serverProc.Id)
`$outCsv = '$resCsv'
`$cores = [Environment]::ProcessorCount
'timestamp,elapsed_sec,cpu_total_sec,cpu_pct_1core,cpu_pct_allcores,working_set_mb,private_mem_mb,threads,handles' | Out-File -FilePath `$outCsv -Encoding UTF8
`$start = Get-Date
`$prevTime = `$start
`$p0 = Get-Process -Id `$targetPid -ErrorAction SilentlyContinue
if (`$null -eq `$p0) { exit 0 }
`$prevCpu = [double]`$p0.CPU
while (`$true) {
  Start-Sleep -Seconds 2
  `$p = Get-Process -Id `$targetPid -ErrorAction SilentlyContinue
  if (`$null -eq `$p) { break }
  `$now = Get-Date
  `$dt = (`$now - `$prevTime).TotalSeconds
  `$curCpu = [double]`$p.CPU
  `$dCpu = `$curCpu - `$prevCpu
  `$cpu1 = if (`$dt -gt 0) { [math]::Round((`$dCpu / `$dt) * 100, 2) } else { 0 }
  `$cpuAll = if (`$dt -gt 0) { [math]::Round((`$dCpu / (`$dt * `$cores)) * 100, 2) } else { 0 }
  `$ws = [math]::Round(`$p.WorkingSet64 / 1MB, 2)
  `$pm = [math]::Round(`$p.PrivateMemorySize64 / 1MB, 2)
  `$el = [math]::Round((`$now - `$start).TotalSeconds, 1)
  "`$(`$now.ToString('o')),`$el,`$([math]::Round(`$curCpu,3)),`$cpu1,`$cpuAll,`$ws,`$pm,`$(`$p.Threads.Count),`$(`$p.HandleCount)" | Out-File -FilePath `$outCsv -Append -Encoding UTF8
  `$prevTime = `$now
  `$prevCpu = `$curCpu
}
"@
  $monFile = "$HWRoot\scripts\_mon_$Scenario.ps1"
  $monScript | Out-File -FilePath $monFile -Encoding UTF8
  $monitorProc = Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$monFile`"" `
    -WindowStyle Hidden -PassThru

  Write-Host "[$Scenario] Running JMeter test plan: $($JmxMap[$Scenario])"
  $env:JVM_ARGS = "-Dlog4j.configurationFile=$Log4jCfg"
  $jmx = $JmxMap[$Scenario]
  "`r`n" | & $JMeterBat -n -t $jmx -l $jtlPath -e -o $htmlDir -j $jmeterLog "-JdataDir=D:/KTPM/HW05/20120397/data"
  if ($LASTEXITCODE -ne 0) {
    throw "JMeter exited with code $LASTEXITCODE"
  }
  Write-Host "[$Scenario] JMeter completed. Results: $jtlPath"
}
finally {
  if ($monitorProc -and -not $monitorProc.HasExited) {
    Stop-Process -Id $monitorProc.Id -Force -ErrorAction SilentlyContinue
  }
  if ($serverProc -and -not $serverProc.HasExited) {
    Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "[$Scenario] Stopped SUT backend (PID: $($serverProc.Id))."
  }
  $monTmp = "$HWRoot\scripts\_mon_$Scenario.ps1"
  if (Test-Path $monTmp) { Remove-Item -Force $monTmp -ErrorAction SilentlyContinue }
}
