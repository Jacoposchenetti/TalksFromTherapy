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
            print(f"Error generating flower plot: {e}", file=sys.stderr)
            return None

    def analyze_semantic_frame(self, text: str, target_word: str, session_id: str = None) -> dict:
        """
        Extract and analyze semantic frame of a target word using EmoAtlas
        
        Args:
            text: Input text to analyze
            target_word: The word to extract semantic frame for
            session_id: Optional session ID for tracking
            
        Returns:
            dict: Semantic frame analysis results including network visualization
        """
        try:
            # Generate forma mentis network
            print(f"Generating forma mentis network for text length: {len(text)}", file=sys.stderr)
            fmnt = self.emo.formamentis_network(text)
            print(f"Network generated with {len(fmnt.vertices)} vertices", file=sys.stderr)
            
            # Check if target word exists in the network (case insensitive)
            target_word_lower = target_word.lower()
            available_words = [v.lower() for v in fmnt.vertices]
            
            if target_word_lower not in available_words:
                return {
                    "success": False,
                    "error": f"Target word '{target_word}' not found in text network",
                    "available_words": list(fmnt.vertices)[:20],  # First 20 words as suggestions
                    "session_id": session_id
                }
            
            # Find the exact case-sensitive word from the network
            exact_word = None
            for v in fmnt.vertices:
                if v.lower() == target_word_lower:
                    exact_word = v
                    break
            
            # Extract semantic frame for target word
            print(f"Extracting semantic frame for word: {exact_word}", file=sys.stderr)
            frame_network = self.emo.extract_word_from_formamentis(fmnt, exact_word)
            print(f"Frame network extracted with {len(frame_network.vertices)} vertices", file=sys.stderr)
            
            # Generate semantic frame visualization and save as base64
            frame_plot_base64 = None
            try:
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
                    # Draw the semantic frame network with highlighting
                    self.emo.draw_formamentis(
                        fmn=frame_network,
                        highlight=exact_word,
                        alpha_syntactic=0.4,
                        alpha_hypernyms=0,
                        alpha_synonyms=0,
                        thickness=2,
                        save_path=tmp_file.name
                    )
                    
                    # Convert to base64
                    with open(tmp_file.name, 'rb') as img_file:
                        frame_plot_base64 = base64.b64encode(img_file.read()).decode('utf-8')
                    
                    # Clean up temp file
                    os.unlink(tmp_file.name)
                    print("Semantic frame visualization generated successfully", file=sys.stderr)
                    
            except Exception as e:
                print(f"Warning: Could not generate semantic frame visualization: {e}", file=sys.stderr)
            
            # Get words in semantic frame (excluding the target word itself)
            frame_words = [w for w in frame_network.vertices if w.lower() != target_word_lower]
            
            if frame_words:
                # Analyze emotions of the frame words
                frame_text = " ".join(frame_words)
                frame_emotions = self.emo.emotions(frame_text)
                frame_zscores = self.emo.zscores(frame_text)
                
                # Calculate frame statistics
                significant_emotions = {k: v for k, v in frame_zscores.items() if abs(v) >= 1.96}
                
                # Calculate emotional valence
                positive_emotions = ['joy', 'trust', 'anticipation']
                negative_emotions = ['fear', 'sadness', 'disgust', 'anger']
                
                positive_score = sum(frame_emotions.get(e, 0) for e in positive_emotions)
                negative_score = sum(frame_emotions.get(e, 0) for e in negative_emotions)
                emotional_valence = positive_score - negative_score
                
                # Get network edges for visualization
                network_edges = []
                for edge in frame_network.edges:
                    try:
                        # Handle different edge formats
                        if hasattr(edge, 'v1') and hasattr(edge, 'v2'):
                            # Object with v1, v2 attributes
                            source = edge.v1
                            target = edge.v2
                            weight = getattr(edge, 'weight', 1.0) if hasattr(edge, 'weight') else 1.0
                        elif isinstance(edge, tuple) and len(edge) >= 2:
                            # Tuple format (source, target, [weight])
                            source = edge[0]
                            target = edge[1]
                            weight = edge[2] if len(edge) > 2 else 1.0
                        else:
                            # Try to convert to string and parse
                            print(f"Warning: Unknown edge format: {type(edge)}, value: {edge}", file=sys.stderr)
                            continue
                            
                        network_edges.append({
                            "source": str(source),
                            "target": str(target),
                            "weight": float(weight)
                        })
                    except Exception as edge_error:
                        print(f"Warning: Error processing edge {edge}: {edge_error}", file=sys.stderr)
                        continue
                
            else:
                # Handle case where target word has no connections
                frame_emotions = {}
                frame_zscores = {}
                significant_emotions = {}
                positive_score = 0
                negative_score = 0
                emotional_valence = 0
                network_edges = []
            
            result = {
                "success": True,
                "target_word": exact_word,
                "semantic_frame": {
                    "connected_words": frame_words,
                    "network_edges": network_edges,
                    "emotions": frame_emotions,
                    "z_scores": frame_zscores,
                    "significant_emotions": significant_emotions,
                    "emotional_valence": emotional_valence,
                    "positive_score": positive_score,
                    "negative_score": negative_score,
                    "frame_size": len(frame_words),
                    "total_connections": len(network_edges)
                },
                "visualization": {
                    "frame_plot": frame_plot_base64
                },
                "session_id": session_id,
                "word_count": len(text.split()),
                "analysis_method": "EmoAtlas Semantic Frame Analysis"
            }
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Semantic frame analysis failed: {str(e)}",
                "target_word": target_word,
                "session_id": session_id
            }

def main():
    parser = argparse.ArgumentParser(description='Analyze text emotions with EmoAtlas')
    parser.add_argument('--sessions-file', type=str, help='JSON file containing sessions data')
    parser.add_argument('--text', type=str, help='Single text to analyze')
    parser.add_argument('--language', type=str, default='italian', help='Language (italian/english)')
    parser.add_argument('--output', type=str, help='Output file for JSON results')
    parser.add_argument('--generate-flower', action='store_true', help='Generate emotional flower plot')
    parser.add_argument('--flower-output', type=str, help='Output path for flower plot image')
    parser.add_argument('--semantic-frame', type=str, help='JSON file containing semantic frame analysis parameters')
    
    args = parser.parse_args()
    
    if not args.sessions_file and not args.text and not args.semantic_frame:
        print("Error: Must provide either --sessions-file, --text, or --semantic-frame", file=sys.stderr)
        sys.exit(1)
    
    # Initialize processor
    processor = EmotionProcessor(language=args.language)
    
    # Handle semantic frame analysis
    if args.semantic_frame:
        with open(args.semantic_frame, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        result = processor.analyze_semantic_frame(
            text=data['text'],
            target_word=data['target_word'],
            session_id=data.get('session_id')
        )
        
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return
    
    # Generate flower plot if requested
    if args.generate_flower and args.text:
        flower_path = processor.generate_flower_plot(args.text, args.flower_output)
        if flower_path:
            print(f"Flower plot saved to: {flower_path}", file=sys.stderr)
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
