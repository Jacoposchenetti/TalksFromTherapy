# Script di test per verificare la funzionalità Custom Topics
# Esegui questo in PowerShell dopo aver configurato il database

Write-Host "🧪 Test Suite per Custom Topic Analysis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 1: Verifica che il server sia attivo
Write-Host "📡 Test 1: Verifica server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method HEAD -ErrorAction SilentlyContinue
    Write-Host "✅ Server attivo" -ForegroundColor Green
} catch {
    Write-Host "❌ Server non attivo - avvia con npm run dev" -ForegroundColor Red
    exit 1
}

# Test 2: Verifica endpoint API
Write-Host "🔗 Test 2: Verifica endpoint API..." -ForegroundColor Yellow
try {
    $body = @{
        sessionIds = @()
        customTopics = @()
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/custom-topic-search" `
                                 -Method POST `
                                 -ContentType "application/json" `
                                 -Body $body `
                                 -ErrorAction SilentlyContinue
    
    if ($response.StatusCode -eq 401) {
        Write-Host "✅ Endpoint risponde (401 = non autorizzato, normale senza login)" -ForegroundColor Green
    } elseif ($response.StatusCode -eq 400) {
        Write-Host "✅ Endpoint risponde (400 = richiesta vuota, normale)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Endpoint risponde con codice: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401 -or $statusCode -eq 400) {
        Write-Host "✅ Endpoint risponde (codice $statusCode, normale)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Endpoint risponde con codice: $statusCode" -ForegroundColor Yellow
    }
}

# Test 3: Verifica componenti UI
Write-Host "🎨 Test 3: Verifica file componenti..." -ForegroundColor Yellow
$files = @(
    "src\components\ui\switch.tsx",
    "src\components\ui\textarea.tsx",
    "src\components\analysis\topic-modeling-gpt.tsx",
    "src\app\api\custom-topic-search\route.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file mancante" -ForegroundColor Red
    }
}

# Test 4: Verifica dipendenze
Write-Host "📦 Test 4: Verifica dipendenze..." -ForegroundColor Yellow
try {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    if ($packageJson.dependencies.'@radix-ui/react-switch') {
        Write-Host "✅ @radix-ui/react-switch installato" -ForegroundColor Green
    } else {
        Write-Host "⚠️  @radix-ui/react-switch potrebbe non essere installato" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Errore nel verificare le dipendenze" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 Prossimi passi:" -ForegroundColor Cyan
Write-Host "1. Aggiungi il campo customTopicAnalysisResults al database:" -ForegroundColor White
Write-Host "   ALTER TABLE `"analyses`" ADD COLUMN `"customTopicAnalysisResults`" TEXT;" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Testa l'interfaccia:" -ForegroundColor White
Write-Host "   - Vai su http://localhost:3000" -ForegroundColor Gray
Write-Host "   - Login e vai alla pagina di analisi" -ForegroundColor Gray
Write-Host "   - Attiva il toggle 'Custom Topics'" -ForegroundColor Gray
Write-Host "   - Inserisci un topic e testa la ricerca" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Monitora i log per verificare il funzionamento" -ForegroundColor White
