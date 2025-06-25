import sys
import json
import pandas as pd
from emoatlas import EmoScores
import argparse
from pathlib import Path
import tempfile
import base64
import io
import os

class EmotionProcessor:
    def __init__(self, language="italian"):
        """Initialize EmoAtlas for emotion processing"""
        # Ensure language is supported
        supported_languages = ['italian', 'english']
        if language not in supported_languages:
            raise ValueError(f"Language '{language}' not supported. Use: {supported_languages}")
        
        try:
            self.emo = EmoScores(language=language)
            self.language = language
            
            # Test initialization with a simple Italian phrase
            if language == 'italian':
                test_result = self.emo.emotions("Sono molto felice oggi")
                if not test_result:
                    raise ValueError("EmoAtlas failed to process Italian text")
                    
        except Exception as e:
            raise RuntimeError(f"Failed to initialize EmoAtlas for {language}: {str(e)}")
    
    def analyze_text(self, text: str) -> dict:
        """
        Analyze text and return comprehensive emotion data
        
        Args:
            text: Input text to analyze
            
        Returns:
            dict: Complete emotion analysis results
        """
        try:
            # Basic emotion analysis
            emotions = self.emo.emotions(text)
            z_scores = self.emo.zscores(text)
            
            # Generate the emotional flower visualization and save as base64
            flower_plot_base64 = None
            try:
                flower_plot = self.emo.draw_statistically_significant_emotions(text)
                if flower_plot:
                    # Save to temporary file and encode as base64
                    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                        flower_plot.savefig(tmp.name, dpi=300, bbox_inches='tight')
                        
                        # Read and encode as base64
                        with open(tmp.name, 'rb') as f:
                            img_data = base64.b64encode(f.read()).decode()
                        
                        flower_plot_base64 = f"data:image/png;base64,{img_data}"
                        
                        # Clean up temp file
                        os.unlink(tmp.name)
            except Exception as flower_error:
                print(f"Warning: Could not generate flower plot: {flower_error}", file=sys.stderr)
            
            # Statistical significance (|z| > 1.96 = p < 0.05)
            significant_emotions = {
                emotion: score for emotion, score in z_scores.items() 
                if abs(score) > 1.96
            }
            
            # Dominant emotions (top 3 by z-score)
            dominant_emotions = sorted(
                z_scores.items(), 
                key=lambda x: abs(x[1]), 
                reverse=True
            )[:3]
            
            # Emotional valence (positive vs negative)
            positive_emotions = ['joy', 'trust', 'anticipation', 'surprise']
            negative_emotions = ['sadness', 'fear', 'anger', 'disgust']
            
            positive_score = sum(z_scores.get(e, 0) for e in positive_emotions)
            negative_score = sum(abs(z_scores.get(e, 0)) for e in negative_emotions)
            
            valence = positive_score - negative_score
            
            result = {
                'success': True,
                'analysis': {
                    'emotions': emotions,
                    'z_scores': z_scores,
                    'significant_emotions': significant_emotions,
                    'dominant_emotions': dominant_emotions,
                    'emotional_valence': valence,
                    'positive_score': positive_score,
                    'negative_score': negative_score,
                    'language': self.language,
                    'text_length': len(text.split()),
                    'analysis_timestamp': str(pd.Timestamp.now()),
                    'emoatlas_initialized_for': self.language,
                    'flower_plot_available': flower_plot_base64 is not None
                }
            }
            
            # Add flower plot if available
            if flower_plot_base64:
                result['flower_plot'] = flower_plot_base64
                
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'analysis': None            }
    
    def analyze_multiple_sessions(self, sessions_data: list) -> dict:
        """Analyze multiple sessions and return combined analysis"""
        try:
            session_analyses = []
            combined_text = ""
            
            for session in sessions_data:
                session_id = session.get('id', '')
                session_title = session.get('title', '')
                session_date = session.get('sessionDate', '')
                transcript = session.get('transcript', '')
                
                if not transcript.strip():
                    continue
                    
                # Analyze individual session
                session_result = self.analyze_text(transcript)
                if session_result['success']:
                    session_result['session_id'] = session_id
                    session_result['session_title'] = session_title
                    session_result['session_date'] = session_date
                    session_analyses.append(session_result)
                
                combined_text += f"\n\n{transcript}"
            
            # Analyze combined text
            combined_analysis = None
            if combined_text.strip():
                combined_analysis = self.analyze_text(combined_text.strip())
            
            return {
                'success': True,
                'individual_sessions': session_analyses,
                'combined_analysis': combined_analysis,
                'total_sessions': len(session_analyses)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'individual_sessions': [],
                'combined_analysis': None
            }
    
    def generate_flower_plot(self, text: str, output_path: str = None) -> str:
        """
        Generate emotional flower plot using EmoAtlas native method
        
        Args:
            text: Input text to analyze
            output_path: Optional path to save the plot
            
        Returns:
            str: Path to the saved plot or base64 encoded image
        """
        try:
            # Generate the flower plot using EmoAtlas
            plot = self.emo.draw_statistically_significant_emotions(text)
            
            if output_path:
                # Save to specified path
                plot.savefig(output_path, dpi=300, bbox_inches='tight')
                return output_path
            else:
                # Save to temporary file and return base64
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                    plot.savefig(tmp.name, dpi=300, bbox_inches='tight')
                    
                    # Read and encode as base64
                    with open(tmp.name, 'rb') as f:
                        img_data = base64.b64encode(f.read()).decode()
                    
                    return f"data:image/png;base64,{img_data}"
                    
        except Exception as e:
            print(f"Error generating flower plot: {e}")
            return None

def main():
    parser = argparse.ArgumentParser(description='Analyze text emotions with EmoAtlas')
    parser.add_argument('--sessions-file', type=str, help='JSON file containing sessions data')
    parser.add_argument('--text', type=str, help='Single text to analyze')
    parser.add_argument('--language', type=str, default='italian', help='Language (italian/english)')
    parser.add_argument('--output', type=str, help='Output file for JSON results')
    parser.add_argument('--generate-flower', action='store_true', help='Generate emotional flower plot')
    parser.add_argument('--flower-output', type=str, help='Output path for flower plot image')
    
    args = parser.parse_args()
    
    if not args.sessions_file and not args.text:
        print("Error: Must provide either --sessions-file or --text")
        sys.exit(1)
    
    # Initialize processor
    processor = EmotionProcessor(language=args.language)
    
    # Generate flower plot if requested
    if args.generate_flower and args.text:
        flower_path = processor.generate_flower_plot(args.text, args.flower_output)
        if flower_path:
            print(f"Flower plot saved to: {flower_path}")
        return
    
    # Analyze
    if args.sessions_file:
        with open(args.sessions_file, 'r', encoding='utf-8') as f:
            sessions_data = json.load(f)
        result = processor.analyze_multiple_sessions(sessions_data)
    else:
        result = processor.analyze_text(args.text)
    
    # Output
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
    else:
        print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
