#!/bin/bash

# Script di test per verificare la funzionalità Custom Topics
# Esegui questo dopo aver configurato il database

echo "🧪 Test Suite per Custom Topic Analysis"
echo "========================================"

# Test 1: Verifica che il server sia attivo
echo "📡 Test 1: Verifica server..."
curl -s -I http://localhost:3000 > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Server attivo"
else
    echo "❌ Server non attivo - avvia con npm run dev"
    exit 1
fi

# Test 2: Verifica endpoint API
echo "🔗 Test 2: Verifica endpoint API..."
response=$(curl -s -w "%{http_code}" -X POST http://localhost:3000/api/custom-topic-search \
  -H "Content-Type: application/json" \
  -d '{"sessionIds":[],"customTopics":[]}' \
  -o /dev/null)

if [ "$response" = "401" ]; then
    echo "✅ Endpoint risponde (401 = non autorizzato, normale senza login)"
elif [ "$response" = "400" ]; then
    echo "✅ Endpoint risponde (400 = richiesta vuota, normale)"
else
    echo "⚠️  Endpoint risponde con codice: $response"
fi

# Test 3: Verifica componenti UI
echo "🎨 Test 3: Verifica file componenti..."
files=(
    "src/components/ui/switch.tsx"
    "src/components/ui/textarea.tsx" 
    "src/components/analysis/topic-modeling-gpt.tsx"
    "src/app/api/custom-topic-search/route.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file mancante"
    fi
done

# Test 4: Verifica dipendenze
echo "📦 Test 4: Verifica dipendenze..."
if npm list @radix-ui/react-switch > /dev/null 2>&1; then
    echo "✅ @radix-ui/react-switch installato"
else
    echo "⚠️  @radix-ui/react-switch potrebbe non essere installato"
fi

echo ""
echo "🎯 Prossimi passi:"
echo "1. Aggiungi il campo customTopicAnalysisResults al database:"
echo "   ALTER TABLE \"analyses\" ADD COLUMN \"customTopicAnalysisResults\" TEXT;"
echo ""
echo "2. Testa l'interfaccia:"
echo "   - Vai su http://localhost:3000"
echo "   - Login e vai alla pagina di analisi"
echo "   - Attiva il toggle 'Custom Topics'"
echo "   - Inserisci un topic e testa la ricerca"
echo ""
echo "3. Monitora i log per verificare il funzionamento"
