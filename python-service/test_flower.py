#!/usr/bin/env python3

from emoatlas import EmoScores

try:
    # Initialize EmoAtlas
    emo = EmoScores(language='italian')
    print("✅ EmoAtlas initialized successfully")
    
    # Check available methods
    methods = [method for method in dir(emo) if 'flower' in method.lower() or 'draw' in method.lower()]
    print(f"🌸 Available flower/draw methods: {methods}")
    
    # Check for specific methods
    has_draw_formamentis = hasattr(emo, 'draw_formamentis_flower')
    has_draw_significant = hasattr(emo, 'draw_statistically_significant_emotions')
    
    print(f"🌸 Has draw_formamentis_flower: {has_draw_formamentis}")
    print(f"🌸 Has draw_statistically_significant_emotions: {has_draw_significant}")
    
    # Test with sample text
    test_text = "Oggi è stata una giornata molto difficile. Mi sento triste e arrabbiato."
    
    if has_draw_formamentis:
        print("🧪 Testing draw_formamentis_flower...")
        try:
            emo.draw_formamentis_flower(text=test_text, title="Test", show=False)
            print("✅ draw_formamentis_flower works")
        except Exception as e:
            print(f"❌ draw_formamentis_flower error: {e}")
    
    if has_draw_significant:
        print("🧪 Testing draw_statistically_significant_emotions...")
        try:
            emo.draw_statistically_significant_emotions(test_text)
            print("✅ draw_statistically_significant_emotions works")
        except Exception as e:
            print(f"❌ draw_statistically_significant_emotions error: {e}")
    
except Exception as e:
    print(f"❌ Error: {e}")
