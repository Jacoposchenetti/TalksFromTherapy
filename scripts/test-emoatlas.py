from emoatlas import EmoScores
import json

def test_emoatlas():
    """Test basic EmoAtlas functionality"""
    try:
        print("🧪 Testing EmoAtlas installation...")
        
        # Initialize for Italian
        print("📚 Initializing EmoAtlas for Italian...")
        emo = EmoScores(language="italian")
        
        # Test text
        text = "Mi sento triste e arrabbiato per quello che è successo oggi."
        print(f"📝 Test text: {text}")
        
        # Get emotions
        print("🔍 Running emotion analysis...")
        emotions = emo.emotions(text)
        z_scores = emo.zscores(text)
        
        print("✅ EmoAtlas Test Successful!")
        print(f"📊 Emotions: {emotions}")
        print(f"📈 Z-scores: {z_scores}")
        
        # Test statistical significance
        significant_emotions = {
            emotion: score for emotion, score in z_scores.items() 
            if abs(score) > 1.96
        }
        print(f"⭐ Significant emotions (|z| > 1.96): {significant_emotions}")
        
        return True
    except Exception as e:
        print(f"❌ EmoAtlas Test Failed: {e}")
        return False

def test_multiple_sessions():
    """Test multiple sessions analysis"""
    try:
        print("\n🧪 Testing multiple sessions analysis...")
        
        emo = EmoScores(language="italian")
        
        sessions = [
            {
                "id": "test1",
                "title": "Prima sessione",
                "transcript": "Mi sento molto triste e senza speranza. Tutto sembra difficile."
            },
            {
                "id": "test2", 
                "title": "Seconda sessione",
                "transcript": "Oggi mi sento un po' meglio. C'è una piccola speranza nel futuro."
            }
        ]
        
        session_analyses = []
        combined_text = ""
        
        for session in sessions:
            transcript = session["transcript"]
            emotions = emo.emotions(transcript)
            z_scores = emo.zscores(transcript)
            
            analysis = {
                "session_id": session["id"],
                "session_title": session["title"],
                "analysis": {
                    "emotions": emotions,
                    "z_scores": z_scores,
                    "text_length": len(transcript.split())
                }
            }
            session_analyses.append(analysis)
            combined_text += f"\n\n{transcript}"
        
        # Combined analysis
        combined_emotions = emo.emotions(combined_text.strip())
        combined_z_scores = emo.zscores(combined_text.strip())
        
        result = {
            "success": True,
            "individual_sessions": session_analyses,
            "combined_analysis": {
                "analysis": {
                    "emotions": combined_emotions,
                    "z_scores": combined_z_scores,
                    "text_length": len(combined_text.split())
                }
            },
            "total_sessions": len(session_analyses)
        }
        
        print("✅ Multiple sessions test successful!")
        print(f"📊 Processed {len(session_analyses)} sessions")
        print(f"📈 Combined Z-scores: {combined_z_scores}")
        
        return True
        
    except Exception as e:
        print(f"❌ Multiple sessions test failed: {e}")
        return False

if __name__ == "__main__":
    print("🌸 EmoAtlas Test Suite")
    print("=" * 50)
    
    # Basic test
    test1_success = test_emoatlas()
    
    # Multiple sessions test
    test2_success = test_multiple_sessions()
    
    print("\n" + "=" * 50)
    if test1_success and test2_success:
        print("🎉 All tests passed! EmoAtlas is ready to use.")
    else:
        print("⚠️ Some tests failed. Check the error messages above.")
    print("=" * 50)
