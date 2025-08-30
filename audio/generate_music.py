#!/usr/bin/env python3
"""
Music sheet generator that creates a simple melody and converts it to OGG format.
"""

import numpy as np
from scipy.io import wavfile
import subprocess
import os

# Musical notes frequencies (Hz) - Extended range C2 to B5
NOTES = {
    # Bass octaves
    'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31,
    'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61,
    'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    # Mid octaves
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
    'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
    'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
    'rest': 0.0
}

def generate_tone(frequency, duration, sample_rate=44100, amplitude=0.3):
    """Generate a sine wave tone for a given frequency and duration."""
    if frequency == 0:  # Rest note
        return np.zeros(int(sample_rate * duration))
    
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    # Add slight envelope to avoid clicks
    envelope = np.ones_like(t)
    fade_samples = int(0.01 * sample_rate)  # 10ms fade
    envelope[:fade_samples] = np.linspace(0, 1, fade_samples)
    envelope[-fade_samples:] = np.linspace(1, 0, fade_samples)
    
    # Generate tone with harmonics for richer sound
    tone = amplitude * envelope * (
        np.sin(2 * np.pi * frequency * t) +  # Fundamental
        0.3 * np.sin(4 * np.pi * frequency * t) +  # 2nd harmonic
        0.1 * np.sin(6 * np.pi * frequency * t)  # 3rd harmonic
    )
    return tone

def generate_bass_tone(frequency, duration, sample_rate=44100, amplitude=0.4):
    """Generate a bass tone with deeper, rounder sound."""
    if frequency == 0:
        return np.zeros(int(sample_rate * duration))
    
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    
    # ADSR envelope for bass
    attack = int(0.02 * sample_rate)
    decay = int(0.05 * sample_rate)
    sustain_level = 0.7
    release = int(0.1 * sample_rate)
    
    envelope = np.ones_like(t) * sustain_level
    envelope[:attack] = np.linspace(0, 1, attack)
    envelope[attack:attack+decay] = np.linspace(1, sustain_level, decay)
    if release < len(envelope):
        envelope[-release:] = np.linspace(sustain_level, 0, release)
    
    # Bass sound with fundamental and light harmonics
    tone = amplitude * envelope * (
        np.sin(2 * np.pi * frequency * t) +  # Strong fundamental
        0.2 * np.sin(np.pi * frequency * t) +  # Sub-harmonic
        0.1 * np.sin(4 * np.pi * frequency * t)  # Light 2nd harmonic
    )
    return tone

def generate_kick_drum(duration, sample_rate=44100, amplitude=0.8):
    """Generate a kick drum sound using synthesis."""
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    
    # Pitch envelope - starts high and drops quickly
    pitch_envelope = 60 * np.exp(-35 * t) + 40
    
    # Amplitude envelope - sharp attack, quick decay
    amp_envelope = np.exp(-10 * t)
    
    # Synthesize kick with sine wave and noise
    kick = amplitude * amp_envelope * (
        0.7 * np.sin(2 * np.pi * pitch_envelope * t) +  # Pitched component
        0.3 * np.random.normal(0, 0.1, len(t)) * np.exp(-50 * t)  # Click/noise
    )
    return kick

def generate_snare_drum(duration, sample_rate=44100, amplitude=0.6):
    """Generate a snare drum sound using noise and tone."""
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    
    # Amplitude envelope
    amp_envelope = np.exp(-15 * t)
    
    # Mix of tone and noise
    tone_freq = 200
    snare = amplitude * amp_envelope * (
        0.3 * np.sin(2 * np.pi * tone_freq * t) +  # Tonal component
        0.7 * np.random.normal(0, 1, len(t))  # Noise (snare rattle)
    )
    
    # High-pass filter effect (crude but effective)
    snare = snare - np.mean(snare)
    return snare

def generate_hihat(duration, sample_rate=44100, amplitude=0.3, closed=True):
    """Generate a hi-hat sound (closed or open)."""
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    
    # Different decay for closed vs open hi-hat
    decay_rate = 50 if closed else 10
    amp_envelope = np.exp(-decay_rate * t)
    
    # High-frequency noise
    hihat = amplitude * amp_envelope * np.random.normal(0, 1, len(t))
    
    # Simple high-pass filter simulation
    hihat = hihat - np.mean(hihat)
    return hihat

def generate_string_tone(frequency, duration, sample_rate=44100, amplitude=0.3, instrument='violin'):
    """Generate string instrument sound using sawtooth waves."""
    if frequency == 0:
        return np.zeros(int(sample_rate * duration))
    
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    
    # ADSR envelope for strings
    attack = int(0.05 * sample_rate) if instrument == 'violin' else int(0.08 * sample_rate)
    decay = int(0.1 * sample_rate)
    sustain_level = 0.8
    release = int(0.15 * sample_rate)
    
    envelope = np.ones_like(t) * sustain_level
    envelope[:attack] = np.linspace(0, 1, attack)
    envelope[attack:attack+decay] = np.linspace(1, sustain_level, decay)
    if release < len(envelope):
        envelope[-release:] = np.linspace(sustain_level, 0, release)
    
    # Sawtooth wave synthesis for string-like sound
    sawtooth = 2 * (t * frequency % 1) - 1
    
    # Add vibrato for realism
    vibrato_freq = 5.0  # Hz
    vibrato_depth = 0.01 if instrument == 'violin' else 0.005
    vibrato = 1 + vibrato_depth * np.sin(2 * np.pi * vibrato_freq * t)
    
    # Combine sawtooth with harmonics
    tone = amplitude * envelope * (
        0.6 * sawtooth +  # Main sawtooth
        0.2 * np.sin(2 * np.pi * frequency * t * vibrato) +  # Fundamental with vibrato
        0.1 * np.sin(4 * np.pi * frequency * t) +  # 2nd harmonic
        0.1 * np.sin(3 * np.pi * frequency * t)  # 3rd harmonic
    )
    
    return tone

def generate_piano_tone(frequency, duration, sample_rate=44100, amplitude=0.35):
    """Generate piano-like sound with quick attack and gradual decay."""
    if frequency == 0:
        return np.zeros(int(sample_rate * duration))
    
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    
    # Piano-like ADSR envelope
    attack = int(0.005 * sample_rate)  # Very quick attack
    decay = int(0.1 * sample_rate)
    sustain_level = 0.6
    release = int(0.3 * sample_rate)
    
    # Create envelope
    envelope = np.ones_like(t) * sustain_level
    envelope[:attack] = np.linspace(0, 1, attack)
    envelope[attack:attack+decay] = np.linspace(1, sustain_level, decay)
    
    # Exponential decay for piano
    decay_rate = 2.0  # Decay speed
    exp_decay = np.exp(-decay_rate * t)
    envelope = envelope * exp_decay
    
    # Piano harmonics (fundamental + overtones)
    tone = amplitude * envelope * (
        1.0 * np.sin(2 * np.pi * frequency * t) +  # Fundamental
        0.4 * np.sin(4 * np.pi * frequency * t) +  # 2nd harmonic
        0.2 * np.sin(6 * np.pi * frequency * t) +  # 3rd harmonic
        0.1 * np.sin(8 * np.pi * frequency * t) +  # 4th harmonic
        0.05 * np.sin(10 * np.pi * frequency * t)  # 5th harmonic
    )
    
    return tone

def create_melody():
    """Create a simple melody - 'Ode to Joy' theme."""
    # Note, Duration (in beats)
    melody = [
        ('E4', 0.5), ('E4', 0.5), ('F4', 0.5), ('G4', 0.5),
        ('G4', 0.5), ('F4', 0.5), ('E4', 0.5), ('D4', 0.5),
        ('C4', 0.5), ('C4', 0.5), ('D4', 0.5), ('E4', 0.5),
        ('E4', 0.75), ('D4', 0.25), ('D4', 1.0),
        
        ('E4', 0.5), ('E4', 0.5), ('F4', 0.5), ('G4', 0.5),
        ('G4', 0.5), ('F4', 0.5), ('E4', 0.5), ('D4', 0.5),
        ('C4', 0.5), ('C4', 0.5), ('D4', 0.5), ('E4', 0.5),
        ('D4', 0.75), ('C4', 0.25), ('C4', 1.0),
    ]
    return melody

def create_bass_line():
    """Create a walking bass line that complements the melody."""
    # Bass pattern with walking bass and chord roots
    bass = [
        # Bar 1-2: C major progression
        ('C2', 0.5), ('E2', 0.5), ('G2', 0.5), ('E2', 0.5),
        ('C3', 0.5), ('G2', 0.5), ('E2', 0.5), ('C2', 0.5),
        
        # Bar 3-4: F and G progression  
        ('F2', 0.5), ('A2', 0.5), ('C3', 0.5), ('A2', 0.5),
        ('G2', 0.75), ('F2', 0.25), ('G2', 1.0),
        
        # Bar 5-6: Repeat with variation
        ('C2', 0.5), ('G2', 0.5), ('C3', 0.5), ('B2', 0.5),
        ('A2', 0.5), ('G2', 0.5), ('F2', 0.5), ('E2', 0.5),
        
        # Bar 7-8: Resolution
        ('F2', 0.5), ('G2', 0.5), ('A2', 0.5), ('B2', 0.5),
        ('G2', 0.75), ('G2', 0.25), ('C2', 1.0),
    ]
    return bass

def create_drum_pattern():
    """Create a drum pattern with kick, snare, and hi-hat."""
    # Drum pattern: (type, duration)
    # Types: 'kick', 'snare', 'hihat', 'rest'
    drums = [
        # Bar 1: Basic rock beat
        ('kick', 0.5), ('hihat', 0.5), ('snare', 0.5), ('hihat', 0.5),
        ('kick', 0.5), ('hihat', 0.5), ('snare', 0.5), ('hihat', 0.5),
        
        # Bar 2: Variation
        ('kick', 0.5), ('hihat', 0.25), ('hihat', 0.25), ('snare', 0.5), ('hihat', 0.5),
        ('kick', 0.25), ('kick', 0.25), ('hihat', 0.25), ('snare', 0.75), ('rest', 0.5),
        
        # Bar 3: Driving beat
        ('kick', 0.5), ('hihat', 0.5), ('snare', 0.5), ('hihat', 0.5),
        ('kick', 0.25), ('kick', 0.25), ('hihat', 0.5), ('snare', 0.5), ('hihat', 0.5),
        
        # Bar 4: Fill and resolution
        ('kick', 0.5), ('snare', 0.25), ('snare', 0.25), ('hihat', 0.5), ('snare', 0.25), ('snare', 0.25),
        ('kick', 1.0), ('rest', 1.0),
    ]
    return drums

def create_string_harmony():
    """Create string harmony parts (chords) to support the melody."""
    # String chords: [(notes), duration]
    # Using chord progressions that match the melody
    strings = [
        # Bar 1: C major chord (whole notes)
        ([('C3', 'E3', 'G3')], 2.0),  # C major
        ([('C3', 'E3', 'G3')], 2.0),  # C major hold
        
        # Bar 2: F major to G major
        ([('F3', 'A3', 'C4')], 2.0),  # F major
        ([('G3', 'B3', 'D4')], 2.0),  # G major
        
        # Bar 3: Am to F
        ([('A3', 'C4', 'E4')], 2.0),  # A minor
        ([('F3', 'A3', 'C4')], 2.0),  # F major
        
        # Bar 4: G to C resolution
        ([('G3', 'B3', 'D4')], 2.0),  # G major
        ([('C3', 'E3', 'G3')], 2.0),  # C major resolution
    ]
    return strings

def create_piano_arpeggios():
    """Create piano arpeggios that complement the harmony."""
    # Piano arpeggios: (note, duration)
    arpeggios = [
        # Bar 1: C major arpeggio up and down
        ('C4', 0.25), ('E4', 0.25), ('G4', 0.25), ('C5', 0.25),
        ('G4', 0.25), ('E4', 0.25), ('C4', 0.25), ('E4', 0.25),
        ('G4', 0.25), ('C5', 0.25), ('E5', 0.25), ('C5', 0.25),
        ('G4', 0.25), ('E4', 0.25), ('C4', 0.25), ('G3', 0.25),
        
        # Bar 2: F major to G major transition
        ('F4', 0.25), ('A4', 0.25), ('C5', 0.25), ('A4', 0.25),
        ('F4', 0.25), ('C4', 0.25), ('F4', 0.25), ('A4', 0.25),
        ('G4', 0.25), ('B4', 0.25), ('D5', 0.25), ('B4', 0.25),
        ('G4', 0.25), ('D4', 0.25), ('B3', 0.25), ('G3', 0.25),
        
        # Bar 3: Am arpeggio with movement
        ('A4', 0.25), ('C5', 0.25), ('E5', 0.25), ('C5', 0.25),
        ('A4', 0.25), ('E4', 0.25), ('C4', 0.25), ('A3', 0.25),
        ('F4', 0.25), ('A4', 0.25), ('C5', 0.25), ('F5', 0.25),
        ('C5', 0.25), ('A4', 0.25), ('F4', 0.25), ('C4', 0.25),
        
        # Bar 4: G to C resolution
        ('G4', 0.25), ('B4', 0.25), ('D5', 0.25), ('G5', 0.25),
        ('D5', 0.25), ('B4', 0.25), ('G4', 0.25), ('D4', 0.25),
        ('C4', 0.5), ('E4', 0.5), ('G4', 0.5), ('C5', 0.5),
    ]
    return arpeggios

def generate_audio(melody, tempo=120, sample_rate=44100):
    """Generate audio from melody."""
    beat_duration = 60.0 / tempo  # Duration of one beat in seconds
    audio = np.array([])
    
    for note, duration in melody:
        frequency = NOTES[note]
        tone = generate_tone(frequency, duration * beat_duration, sample_rate)
        audio = np.concatenate([audio, tone])
    
    # Normalize to prevent clipping
    audio = audio / np.max(np.abs(audio))
    return audio

def save_as_wav(audio, filename='output.wav', sample_rate=44100):
    """Save audio as WAV file."""
    # Convert to 16-bit PCM
    audio_16bit = np.int16(audio * 32767)
    wavfile.write(filename, sample_rate, audio_16bit)
    print(f"Saved WAV file: {filename}")
    return filename

def convert_to_ogg(wav_filename, ogg_filename='output.ogg'):
    """Convert WAV to OGG using ffmpeg."""
    try:
        # Check if ffmpeg is available
        result = subprocess.run(['which', 'ffmpeg'], capture_output=True, text=True)
        if result.returncode != 0:
            print("ffmpeg not found. Attempting to use Python library fallback...")
            return convert_to_ogg_with_python(wav_filename, ogg_filename)
        
        # Convert using ffmpeg
        cmd = ['ffmpeg', '-i', wav_filename, '-c:a', 'libvorbis', '-q:a', '4', ogg_filename, '-y']
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"Successfully converted to OGG: {ogg_filename}")
            return ogg_filename
        else:
            print(f"Error converting to OGG: {result.stderr}")
            return None
    except Exception as e:
        print(f"Error during conversion: {e}")
        return None

def convert_to_ogg_with_python(wav_filename, ogg_filename='output.ogg'):
    """Fallback: Instructions for manual conversion."""
    print("\n" + "="*50)
    print("Manual OGG conversion required:")
    print("="*50)
    print(f"WAV file created: {wav_filename}")
    print("\nTo convert to OGG, you can:")
    print("1. Install ffmpeg: brew install ffmpeg (on macOS)")
    print("2. Run: ffmpeg -i output.wav -c:a libvorbis output.ogg")
    print("\nOr use an online converter like:")
    print("- https://cloudconvert.com/wav-to-ogg")
    print("- https://convertio.co/wav-ogg/")
    return None

def apply_reverb(audio, sample_rate=44100, room_size=0.3, decay=0.5):
    """Apply simple reverb effect to audio."""
    # Simple reverb using delays and decay
    delays = [int(0.029 * sample_rate), int(0.037 * sample_rate), 
              int(0.043 * sample_rate), int(0.053 * sample_rate)]
    
    reverb_signal = np.copy(audio)
    
    for delay_samples in delays:
        delayed = np.zeros(len(audio) + delay_samples)
        delayed[delay_samples:delay_samples + len(audio)] = audio * decay
        
        # Pad reverb_signal if needed
        if len(delayed) > len(reverb_signal):
            reverb_signal = np.pad(reverb_signal, (0, len(delayed) - len(reverb_signal)))
        
        reverb_signal[:len(delayed)] += delayed * room_size
    
    return reverb_signal

def pan_stereo(audio, pan_position):
    """Pan audio in stereo field. pan_position: -1 (left) to 1 (right)."""
    # Convert mono to stereo with panning
    left_gain = np.sqrt(0.5 * (1.0 - pan_position))
    right_gain = np.sqrt(0.5 * (1.0 + pan_position))
    
    stereo = np.zeros((len(audio), 2))
    stereo[:, 0] = audio * left_gain  # Left channel
    stereo[:, 1] = audio * right_gain  # Right channel
    
    return stereo

def mix_tracks_stereo(tracks_with_panning, sample_rate=44100):
    """Mix multiple audio tracks with stereo panning and reverb."""
    # tracks_with_panning: list of (track, pan_position, reverb_amount) tuples
    
    # Find the longest track
    max_length = max(len(track) for track, _, _ in tracks_with_panning)
    
    # Initialize stereo mix
    stereo_mix = np.zeros((max_length, 2))
    
    for track, pan, reverb_amt in tracks_with_panning:
        # Pad track if shorter
        if len(track) < max_length:
            track = np.pad(track, (0, max_length - len(track)))
        
        # Apply reverb if specified
        if reverb_amt > 0:
            track = apply_reverb(track, sample_rate, room_size=reverb_amt)
            if len(track) > max_length:
                track = track[:max_length]
        
        # Pan and add to mix
        stereo_track = pan_stereo(track, pan)
        stereo_mix += stereo_track[:max_length]
    
    # Normalize to prevent clipping
    max_val = np.max(np.abs(stereo_mix))
    if max_val > 0:
        stereo_mix = stereo_mix / max_val * 0.9
    
    # Convert back to mono for compatibility (can be removed for stereo output)
    mixed_mono = np.mean(stereo_mix, axis=1)
    
    return mixed_mono

def main():
    print("Orchestral Music Generator")
    print("=" * 50)
    
    tempo = 120
    sample_rate = 44100
    beat_duration = 60.0 / tempo
    
    # Create the melody
    print("Creating melody...")
    melody = create_melody()
    
    # Create bass line
    print("Creating bass line...")
    bass = create_bass_line()
    
    # Create drum pattern
    print("Creating drum pattern...")
    drums = create_drum_pattern()
    
    # Create string harmony
    print("Creating string arrangements...")
    strings = create_string_harmony()
    
    # Create piano arpeggios
    print("Creating piano arpeggios...")
    piano = create_piano_arpeggios()
    
    # Generate melody track
    print("Generating melody track...")
    melody_track = np.array([])
    for note, duration in melody:
        frequency = NOTES[note]
        tone = generate_tone(frequency, duration * beat_duration, sample_rate, amplitude=0.4)
        melody_track = np.concatenate([melody_track, tone])
    
    # Generate bass track
    print("Generating bass track...")
    bass_track = np.array([])
    for note, duration in bass:
        frequency = NOTES[note]
        tone = generate_bass_tone(frequency, duration * beat_duration, sample_rate, amplitude=0.5)
        bass_track = np.concatenate([bass_track, tone])
    
    # Generate drum track
    print("Generating drum track...")
    drum_track = np.array([])
    for drum_type, duration in drums:
        drum_duration = duration * beat_duration
        if drum_type == 'kick':
            sound = generate_kick_drum(drum_duration, sample_rate, amplitude=0.7)
        elif drum_type == 'snare':
            sound = generate_snare_drum(drum_duration, sample_rate, amplitude=0.5)
        elif drum_type == 'hihat':
            sound = generate_hihat(drum_duration, sample_rate, amplitude=0.3, closed=True)
        else:  # rest
            sound = np.zeros(int(sample_rate * drum_duration))
        drum_track = np.concatenate([drum_track, sound])
    
    # Generate string tracks
    print("Generating string sections...")
    string_track = np.array([])
    for chord_notes, duration in strings:
        chord_duration = duration * beat_duration
        chord_sound = np.zeros(int(sample_rate * chord_duration))
        
        # Generate each note in the chord
        for notes_tuple in chord_notes:
            for note in notes_tuple:
                frequency = NOTES[note]
                tone = generate_string_tone(frequency, chord_duration, sample_rate, 
                                           amplitude=0.2, instrument='violin')
                chord_sound += tone
        
        # Normalize chord to prevent clipping
        if np.max(np.abs(chord_sound)) > 0:
            chord_sound = chord_sound / np.max(np.abs(chord_sound)) * 0.4
        string_track = np.concatenate([string_track, chord_sound])
    
    # Generate piano track
    print("Generating piano arpeggios...")
    piano_track = np.array([])
    for note, duration in piano:
        frequency = NOTES[note]
        tone = generate_piano_tone(frequency, duration * beat_duration, sample_rate, amplitude=0.3)
        piano_track = np.concatenate([piano_track, tone])
    
    # Mix all tracks with stereo panning and reverb
    print("Mixing all tracks with panning and reverb...")
    
    # Define panning positions and reverb amounts for each track
    # Pan: -1 (left) to 1 (right), Reverb: 0 (dry) to 1 (wet)
    tracks_to_mix = [
        (melody_track, 0.0, 0.2),     # Melody: center, light reverb
        (bass_track, 0.0, 0.1),        # Bass: center, minimal reverb
        (drum_track, -0.1, 0.05),      # Drums: slightly left, very dry
        (string_track, 0.3, 0.4),      # Strings: slightly right, moderate reverb
        (piano_track, -0.3, 0.3),      # Piano: slightly left, light reverb
    ]
    
    mixed_audio = mix_tracks_stereo(tracks_to_mix, sample_rate)
    
    # Save as WAV
    wav_file = save_as_wav(mixed_audio, 'orchestral_output.wav', sample_rate)
    
    # Convert to OGG
    print("\nConverting to OGG format...")
    ogg_file = convert_to_ogg(wav_file, 'orchestral_output.ogg')
    
    if ogg_file:
        print(f"\n✓ Success! Generated files:")
        print(f"  - {wav_file}")
        print(f"  - {ogg_file}")
    else:
        print(f"\n✓ WAV file generated: {wav_file}")
        print("  (OGG conversion requires ffmpeg)")
    
    # Display the sheet music representation
    print("\n" + "="*50)
    print("Orchestral Arrangement:")
    print("="*50)
    print("Tempo: 120 BPM")
    print("Time Signature: 4/4")
    print("\n[MELODY] - Lead Voice:")
    for i, (note, duration) in enumerate(melody):
        if i % 8 == 0:
            print(f"\nBar {i//8 + 1}: ", end="")
        print(f"{note}({duration}) ", end="")
    
    print("\n\n[BASS] - Bass Line:")
    for i, (note, duration) in enumerate(bass):
        if i % 8 == 0:
            print(f"\nBar {i//8 + 1}: ", end="")
        print(f"{note}({duration}) ", end="")
    
    print("\n\n[DRUMS] - Drum Pattern:")
    for i, (drum_type, duration) in enumerate(drums):
        if i % 8 == 0:
            print(f"\nBar {i//8 + 1}: ", end="")
        print(f"{drum_type}({duration}) ", end="")
    
    print("\n\n[STRINGS] - String Harmony:")
    for i, (chord_notes, duration) in enumerate(strings):
        print(f"\nBar {i + 1}: ", end="")
        for notes_tuple in chord_notes:
            print(f"{notes_tuple}({duration}) ", end="")
    
    print("\n\n[PIANO] - Piano Arpeggios:")
    for i, (note, duration) in enumerate(piano):
        if i % 16 == 0:
            print(f"\nBar {i//16 + 1}: ", end="")
        print(f"{note}({duration}) ", end="")
    print("\n")

if __name__ == "__main__":
    main()
