# Executa um cenario k6 e abre o relatorio HTML no navegador ao final.
# Uso (a partir da raiz do projeto):
#   .\k6\run.ps1                     -> roda io-heavy (padrao)
#   .\k6\run.ps1 -Scenario cpu-heavy -> roda cpu-heavy
#   .\k6\run.ps1 -NoBrowser          -> nao abre o navegador

param(
  [string]$Scenario  = "io-heavy",
  [switch]$NoBrowser
)

$scriptPath = "k6/scenarios/$Scenario.js"
$reportPath = "src/main/resources/META-INF/resources/k6-report.html"
$reportUrl  = "http://localhost:8080/k6-report.html"

if (-not (Test-Path $scriptPath)) {
  Write-Host "Cenario nao encontrado: $scriptPath" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== Quarkus Concurrency Lab — k6 ===" -ForegroundColor Cyan
Write-Host "Cenario : $Scenario"                   -ForegroundColor Cyan
Write-Host "Script  : $scriptPath"                 -ForegroundColor Cyan
Write-Host ""

k6 run $scriptPath

if ($LASTEXITCODE -ne 0) {
  Write-Host "`nk6 finalizou com erros (exit $LASTEXITCODE)." -ForegroundColor Yellow
}

if (-not $NoBrowser) {
  if (Test-Path $reportPath) {
    Write-Host "`nRelatorio gerado. Abrindo no navegador..." -ForegroundColor Green

    # Tenta via Quarkus HTTP; se nao responder, abre o arquivo diretamente
    try {
      $resp = Invoke-WebRequest -Uri $reportUrl -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
      Start-Process $reportUrl
    } catch {
      $fullPath = Resolve-Path $reportPath
      Write-Host "(Quarkus nao respondeu — abrindo arquivo local)" -ForegroundColor Yellow
      Start-Process $fullPath
    }
  } else {
    Write-Host "`nRelatorio nao foi gerado. Verifique se o k6 rodou com sucesso." -ForegroundColor Yellow
  }
}
