#!/usr/bin/env python3
"""
Test script per verificare la nuova legenda interpretativa degli z-score
"""

import requests
import json
import sys

def test_emotion_analysis_with_legend():
    """Test the new interpretative legend functionality"""
    
    # Test data
    test_sessions = [
        {
            "id": "test-1",
            "title": "Sessione Test",
            "transcript": "Oggi mi sento molto felice e pieno di speranza. La terapia mi sta aiutando tantissimo e ho molta fiducia nel futuro. Sono grato per tutto quello che sto imparando su me stesso.",
            "sessionDate": "2024-12-30"
        }
    ]
    
    payload = {
        "sessions": test_sessions,
        "language": "italian"
    }
    
    try:
        # Test the emotion analysis endpoint
        print("🧪 Testing emotion analysis with new interpretative legend...")
        response = requests.post(
            "http://localhost:8001/emotion-trends",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("success") and data.get("individual_sessions"):
                session_analysis = data["individual_sessions"][0]["analysis"]
                
                print("✅ Analysis successful!")
                print(f"📊 Z-scores: {session_analysis.get('z_scores', {})}")
                
                # Check if interpretative legend exists
                legend = session_analysis.get('interpretative_legend')
                if legend:
                    print("\n🎯 LEGENDA INTERPRETATIVA:")
                    print("=" * 50)
                    
                    # Print emotion interpretations
                    emotion_interp = legend.get('emotion_interpretations', {})
                    for emotion, data in emotion_interp.items():
                        name_it = data.get('name_it', emotion)
                        interp = data.get('interpretation', {})
                        intensity = interp.get('intensity', 'N/A')
                        score = interp.get('raw_score', 0)
                        clinical_note = interp.get('clinical_note', 'N/A')
                        
                        print(f"🔹 {name_it}: {intensity} (z={score}) - {clinical_note}")
                    
                    # Print clinical summary
                    clinical = legend.get('clinical_summary', {})
                    if clinical:
                        print("\n📋 RIEPILOGO CLINICO:")
                        print("-" * 30)
                        
                        richness = clinical.get('emotional_richness', {})
                        print(f"• Ricchezza emotiva: {richness.get('richness_level', 'N/A')}")
                        print(f"• Emozioni significative: {richness.get('significant_emotions', 0)}/8")
                        print(f"• Note: {richness.get('clinical_note', 'N/A')}")
                        
                        dominant = clinical.get('dominant_emotions', [])
                        if dominant:
                            print("\n🥇 Emozioni dominanti:")
                            for i, emotion in enumerate(dominant):
                                print(f"  {i+1}. {emotion.get('emotion', 'N/A')} (z={emotion.get('score', 0)})")
                    
                    # Print interpretation ranges
                    ranges = legend.get('interpretation_ranges', {})
                    if ranges:
                        print("\n📏 RANGE DI INTERPRETAZIONE:")
                        print("-" * 35)
                        
                        range_data = ranges.get('ranges', {})
                        for level, info in range_data.items():
                            min_val = info.get('min', 0)
                            desc = info.get('description', 'N/A')
                            print(f"• {level.replace('_', ' ').title()}: z ≥ {min_val} - {desc}")
                        
                        notes = ranges.get('clinical_notes', [])
                        if notes:
                            print("\n📝 Note cliniche:")
                            for note in notes:
                                print(f"  • {note}")
                    
                    print("\n✅ Legenda interpretativa generata con successo!")
                    
                else:
                    print("❌ Legenda interpretativa non trovata nella risposta")
                    
            else:
                print(f"❌ Analysis failed: {data.get('error', 'Unknown error')}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Errore di connessione. Assicurati che il server Python sia in esecuzione su localhost:8001")
        return False
    except Exception as e:
        print(f"❌ Errore durante il test: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🧪 Test della nuova legenda interpretativa EmoAtlas")
    print("=" * 60)
    
    success = test_emotion_analysis_with_legend()
    
    if success:
        print("\n🎉 Test completato con successo!")
    else:
        print("\n💥 Test fallito!")
        sys.exit(1)
