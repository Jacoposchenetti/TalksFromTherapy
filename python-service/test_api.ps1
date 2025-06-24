$headers = @{
    "Content-Type" = "application/json; charset=utf-8"
}

$body = @{
    session_id = "test123"
    transcript = "Oggi ho parlato molto con il mio terapeuta delle mie preoccupazioni e ansie quotidiane. Abbiamo discusso di come gestire lo stress quotidiano e delle tecniche di rilassamento profondo. Il terapeuta mi ha spiegato varie strategie cognitive per affrontare i momenti difficili della giornata. Abbiamo anche parlato della mia famiglia, del lavoro stressante, delle relazioni interpersonali e della gestione del tempo. E stata una sessione molto produttiva e ho imparato molte cose nuove su me stesso e sui miei comportamenti. Durante la seduta abbiamo esplorato le mie emozioni piu profonde e discusso di tecniche di mindfulness e meditazione per migliorare il mio benessere psicologico generale."
    max_words = 20
}| ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8001/single-document-analysis" -Method POST -Body $body -Headers $headers
    Write-Host "SUCCESS!"
    Write-Host "Network nodes: $($response.network_data.nodes.Count)"
    Write-Host "Total available words: $($response.total_available_words)"
    Write-Host "Keywords: $($response.keywords -join ', ')"
    Write-Host "Topics: $($response.topics.Count)"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response)"
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails.Message)"
    }
}
