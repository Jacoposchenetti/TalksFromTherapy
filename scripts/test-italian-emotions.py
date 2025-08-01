#!/usr/bin/env python3
"""
Test script per verificare che EmoAtlas funzioni correttamente con l'italiano
"""

import sys
import json
from emoatlas import EmoScores

def test_italian_emotions():
    """Test EmoAtlas con frasi italiane tipiche delle terapie"""
    
    test_phrases = [
        "Mi sento molto triste e depresso oggi",
        "Sono felice e pieno di speranza per il futuro", 
        "Ho molta paura di quello che potrebbe succedere",
        "Sono arrabbiato per quello che è successo",
        "Mi sento confuso e non so cosa fare",
        "Provo un grande senso di pace e tranquillità",
        "Sono ansioso per il colloquio di domani",
        "Mi sento grato per tutto quello che ho nella vita"
    ]
    
    print("🇮🇹 Testing EmoAtlas with Italian phrases...")
    print("=" * 50)
    
    try:
        # Initialize EmoAtlas for Italian
        emo = EmoScores(language='italian')
        print("✅ EmoAtlas initialized successfully for Italian")
        
        for i, phrase in enumerate(test_phrases, 1):
            print(f"\n{i}. Testing: '{phrase}'")
            
            try:
                # Get emotions and z-scores
                emotions = emo.emotions(phrase)
                z_scores = emo.zscores(phrase)
                
                # Find dominant emotion
                dominant = max(z_scores.items(), key=lambda x: abs(x[1]))
                
                print(f"   Dominant emotion: {dominant[0]} (z-score: {dominant[1]:.2f})")
                
                # Show significant emotions (|z| > 1.96)
                significant = {k: v for k, v in z_scores.items() if abs(v) > 1.96}
                if significant:
                    print(f"   Significant emotions: {significant}")
                else:
                    print("   No statistically significant emotions detected")
                    
            except Exception as e:
                print(f"   ❌ Error analyzing phrase: {e}")
                return False
                
        print("\n" + "=" * 50)
        print("✅ All Italian emotion analysis tests passed!")
        
        # Test with a longer therapeutic text
        print("\n🧠 Testing with therapeutic dialogue...")
        therapeutic_text = """
        Oggi mi sento davvero giù. Ho avuto una brbrutta giornata al lavoro e 
        non riesco a smettere di pensare a tutti gli errori che ho fatto. 
        Mi sento un fallimento e ho paura che le cose non miglioreranno mai. 
        Però devo ammettere che parlare qui mi fa sentire un po' meglio, 
        come se ci fosse ancora un po' di speranza.
        """
        
        emotions = emo.emotions(therapeutic_text)
        z_scores = emo.zscores(therapeutic_text)
        
        # Calculate emotional valence
        positive_emotions = ['joy', 'trust', 'anticipation']
        negative_emotions = ['sadness', 'fear', 'anger', 'disgust']
        
        positive_score = sum(z_scores.get(e, 0) for e in positive_emotions)
        negative_score = sum(abs(z_scores.get(e, 0)) for e in negative_emotions)
        valence = positive_score - negative_score
        
        print(f"   Emotional valence: {valence:.2f}")
        print(f"   Top 3 emotions: {sorted(z_scores.items(), key=lambda x: abs(x[1]), reverse=True)[:3]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to initialize or use EmoAtlas: {e}")
        return False

def check_dependencies():
    """Check that all required dependencies are available"""
    print("🔍 Checking dependencies...")
    
    try:
        import pandas as pd
        print("✅ pandas available")
    except ImportError:
        print("❌ pandas not available")
        return False
        
    try:
        from emoatlas import EmoScores
        print("✅ EmoAtlas available")
    except ImportError:
        print("❌ EmoAtlas not available")
        return False
        
    return True

if __name__ == "__main__":
    print("🧪 EmoAtlas Italian Language Test")
    print("=" * 40)
    
    if not check_dependencies():
        print("\n❌ Dependencies check failed!")
        sys.exit(1)
    
    if test_italian_emotions():
        print("\n🎉 All tests passed! EmoAtlas is ready for Italian emotion analysis.")
        sys.exit(0)
    else:
        print("\n❌ Tests failed!")
        sys.exit(1)
