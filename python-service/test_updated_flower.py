#!/usr/bin/env python3
"""
Test script for the updated EmoAtlas flower plot generation
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import EmoAtlasAnalysisService

def test_flower_generation():
    """Test the updated flower plot generation with actual text"""
    
    # Sample Italian text for testing
    test_text = """
    Oggi mi sento molto triste e arrabbiato. Non riesco a capire perché 
    tutto sembra andare storto. Ho paura del futuro e mi sento deluso 
    da tutto quello che sta succedendo. È una giornata terribile e 
    non vedo speranza da nessuna parte.
    """
    
    print("🧪 Testing updated EmoAtlas flower plot generation...")
    print(f"📝 Test text: {test_text.strip()}")
    
    # Initialize the service
    service = EmoAtlasAnalysisService()
    
    if not service.available:
        print("❌ EmoAtlas not available for testing")
        return False
    
    # Test the analysis with flower plot
    try:
        result = service.analyze_session(test_text, language='italian')
        
        print("\n🔍 Analysis results:")
        print(f"✅ Z-scores calculated: {len(result.get('z_scores', {}))}")
        print(f"✅ Emotional valence: {result.get('emotional_valence', 'N/A'):.2f}")
        print(f"✅ Positive score: {result.get('positive_score', 'N/A'):.2f}")
        print(f"✅ Negative score: {result.get('negative_score', 'N/A'):.2f}")
        
        # Check if flower plot was generated
        flower_plot = result.get('flower_plot')
        if flower_plot:
            print(f"🌸 Flower plot generated: {len(flower_plot)} characters (base64)")
            print("✅ SUCCESS: Flower plot generation working!")
            return True
        else:
            print("❌ FAILED: No flower plot generated")
            return False
            
    except Exception as e:
        print(f"❌ ERROR during analysis: {e}")
        return False

if __name__ == "__main__":
    success = test_flower_generation()
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Tests failed!")
        sys.exit(1)
