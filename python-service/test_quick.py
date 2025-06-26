import requests
import json

# Test con un testo breve ma con diversi topic
test_data = {
    'text': 'Oggi ho parlato con il mio terapeuta di ansia e depressione. Mi sento molto triste e preoccupato per il futuro. Il lavoro mi stressa enormemente e non riesco a dormire bene. La mia famiglia non capisce i miei problemi emotivi. Vorrei trovare strategie per gestire lo stress quotidiano e migliorare le relazioni interpersonali.',
    'max_words': 50
}

try:
    response = requests.post('http://localhost:8000/analyze', json=test_data, timeout=10)
    print('Status:', response.status_code)
    if response.status_code == 200:
        result = response.json()
        print('Topics found:', len(result.get('topics', [])))
        print('Total available words:', result.get('total_available_words', 'N/A'))
        print('Network nodes:', len(result.get('network_data', {}).get('nodes', [])))
        for i, topic in enumerate(result.get('topics', [])):
            keywords = [kw["keyword"] for kw in topic["keywords"][:5]]
            print(f'Topic {i+1}: {keywords}')
    else:
        print('Error response:', response.text)
except Exception as e:
    print('Request failed:', e)
