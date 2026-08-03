$ErrorActionPreference = "Stop"

$SYSTEMS_DIR = "Q:\alisa_project\alisa\World\Web\alisa-systems"
$OVERWORLD_DIR = "Q:\alisa_project\alisa\World\Web\overworld"
$PUBLIC_DIR = "$SYSTEMS_DIR\public"

Write-Host "[1/4] Limpiando carpeta public..." -ForegroundColor Cyan
if (Test-Path $PUBLIC_DIR) {
    Remove-Item -Recurse -Force $PUBLIC_DIR
}
New-Item -ItemType Directory -Force -Path $PUBLIC_DIR | Out-Null

Write-Host "[2/4] Copiando recursos del Overworld (labs, rooms, props, js con el Engine)..." -ForegroundColor Cyan
Copy-Item -Recurse -Force "$OVERWORLD_DIR\labs" "$PUBLIC_DIR\labs"
Copy-Item -Recurse -Force "$OVERWORLD_DIR\rooms" "$PUBLIC_DIR\rooms"
Copy-Item -Recurse -Force "$OVERWORLD_DIR\props" "$PUBLIC_DIR\props"
Copy-Item -Recurse -Force "$OVERWORLD_DIR\js" "$PUBLIC_DIR\js"
Copy-Item -Force "$SYSTEMS_DIR\terminal.html" "$PUBLIC_DIR\terminal.html"

Write-Host "[3/4] Instalando dependencias de la Landing Page..." -ForegroundColor Cyan
Set-Location $SYSTEMS_DIR
npm install

Write-Host "[4/4] Ejecutando Vite Build..." -ForegroundColor Cyan
npm run build

Write-Host "✅ ¡Build completada! Los archivos estáticos y el ALISA Engine están listos en 'dist'." -ForegroundColor Green
