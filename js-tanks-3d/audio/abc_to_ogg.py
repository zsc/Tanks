#!/usr/bin/env python3
"""
Convert multi-track ABC notation to OGG format for tank game.
Supports multiple voices including melody, chords, bass, and timpani.
"""

import numpy as np
from scipy.io import wavfile
import subprocess
import os
import re

# Musical notes frequencies (Hz) - Extended range
NOTES = {
    # Sub-bass octave
    'A,,': 55.00, 'B,,': 61.74, 'C,,': 65.41, 'D,,': 73.42, 
    'E,,': 82.41, 'F,,': 87.31, 'G,,': 98.00,
    # Octave 1 (lower bass)
    'C,': 130.81, 'D,': 146.83, 'E,': 164.81, 'F,': 174.61,
    'G,': 196.00, 'A,': 220.00, 'B,': 246.94,
    # Octave 2 (bass/tenor)
    'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23,
    'G': 392.00, 'A': 440.00, 'B': 493.88,
    # Octave 3 (treble)
    'c': 523.25, 'd': 587.33, 'e': 659.25, 'f': 698.46,
    'g': 783.99, 'a': 880.00, 'b': 987.77,
    # Octave 4 (high)
    "c'": 1046.50, "d'": 1174.66, "e'": 1318.51, "f'": 1396.91,
    "g'": 1567.98, "a'": 1760.00, "b'": 1975.53,
    # Rest
    'z': 0.0,
    # Percussion (x for snare hit)
    'x': 200.0  # Snare fundamental frequency
}

def parse_chord(chord_str):
    """Parse ABC chord notation like [CEG] into individual notes."""
    # Remove brackets
    chord_str = chord_str.strip('[]')
    notes = []
    i = 0
    while i < len(chord_str):
        # Handle notes with modifiers (,')
        if i < len(chord_str) - 1 and chord_str[i+1] in ',\'':
            notes.append(chord_str[i:i+2])
            i += 2
        else:
            notes.append(chord_str[i])
            i += 1
    return notes

def parse_abc_file(filename):
    """Parse multi-voice ABC notation file."""
    with open(filename, 'r') as f:
        content = f.read()
    
    # Extract tempo
    tempo_match = re.search(r'Q:1/4=(\d+)', content)
    tempo = int(tempo_match.group(1)) if tempo_match else 120
    
    # Extract note length
    length_match = re.search(r'L:1/(\d+)', content)
    base_length = int(length_match.group(1)) if length_match else 8
    
    voices = {}
    
    # Look for voice definitions with V: markers
    voice_pattern = r'V:(\d+)\s+name="([^"]+)"[^\n]*\n((?:(?!V:\d+).*\n)*)'
    voice_matches = re.findall(voice_pattern, content)
    
    if voice_matches:
        # Multi-voice file
        for voice_num_str, voice_name, voice_content in voice_matches:
            voice_num = int(voice_num_str)
            voices[voice_num] = {
                'name': voice_name,
                'notes': parse_voice_content(voice_content, base_length)
            }
    else:
        # Single voice file - look for melody after K: field
        voices[1] = {'name': 'Melody', 'notes': []}
        melody_match = re.search(r'K:.*?\n(.*)', content, re.DOTALL)
        if melody_match:
            melody_text = melody_match.group(1)
            # Remove voice markers if any
            melody_text = re.sub(r'V:\d+[^\n]*\n', '', melody_text)
            voices[1]['notes'] = parse_voice_content(melody_text, base_length)
    
    return voices, tempo

def parse_voice_content(content, base_length):
    """Parse the notation content of a single voice."""
    # Remove comments but keep brackets for chords
    content = re.sub(r'%.*', '', content)
    # Remove bar lines but keep chord brackets
    content = re.sub(r'[\|:]', ' ', content)
    
    notes = []
    # Pattern for notes and chords - includes x for percussion
    pattern = r'(\[[^\]]+\]|[A-Ga-gx][,\']*|z)(\d*)'
    
    for match in re.finditer(pattern, content):
        note_or_chord = match.group(1)
        duration = match.group(2)
        
        if duration:
            dur = int(duration)
        else:
            dur = 1
        
        # Convert to beats
        beat_duration = dur * (4.0 / base_length)
        
        if note_or_chord.startswith('['):
            # It's a chord
            chord_notes = parse_chord(note_or_chord)
            notes.append(('chord', chord_notes, beat_duration))
        elif note_or_chord in NOTES:
            # It's a single note
            notes.append(('note', note_or_chord, beat_duration))
        elif note_or_chord == 'z':
            # It's a rest
            notes.append(('rest', 'z', beat_duration))
    
    return notes

def generate_tone(frequency, duration, sample_rate=44100, amplitude=0.3, waveform='mixed'):
    """Generate a tone with specified waveform."""
    if frequency == 0:
        return np.zeros(int(sample_rate * duration))
    
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    
    # Envelope to reduce clicks
    envelope = np.ones_like(t)
    fade_samples = int(0.01 * sample_rate)
    if fade_samples < len(envelope):
        envelope[:fade_samples] = np.linspace(0, 1, fade_samples)
        envelope[-fade_samples:] = np.linspace(1, 0, fade_samples)
    
    if waveform == 'square':
        # Square wave
        wave = np.sign(np.sin(2 * np.pi * frequency * t))
    elif waveform == 'triangle':
        # Triangle wave
        wave = 2 * np.abs(2 * (t * frequency % 1) - 1) - 1
    elif waveform == 'sawtooth':
        # Sawtooth wave
        wave = 2 * (t * frequency % 1) - 1
    elif waveform == 'sine':
        # Pure sine wave
        wave = np.sin(2 * np.pi * frequency * t)
    else:  # 'mixed' - default 8-bit style
        # Mix of square and triangle for 8-bit sound
        square = np.sign(np.sin(2 * np.pi * frequency * t))
        triangle = 2 * np.abs(2 * (t * frequency % 1) - 1) - 1
        wave = 0.7 * square + 0.3 * triangle
    
    return amplitude * envelope * wave

def generate_chord_tone(chord_notes, duration, sample_rate=44100, amplitude=0.25):
    """Generate a chord by combining multiple notes."""
    chord_sound = np.zeros(int(sample_rate * duration))
    
    for note in chord_notes:
        if note in NOTES:
            frequency = NOTES[note]
            tone = generate_tone(frequency, duration, sample_rate, 
                               amplitude/len(chord_notes), 'sine')
            chord_sound += tone
    
    return chord_sound

def generate_timpani_tone(frequency, duration, sample_rate=44100, amplitude=0.5):
    """Generate timpani/drum sound."""
    if frequency == 0:
        return np.zeros(int(sample_rate * duration))
    
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    
    # Timpani has pitch bend and quick decay
    pitch_envelope = frequency * (1 + 0.2 * np.exp(-8 * t))
    amp_envelope = amplitude * np.exp(-3 * t)
    
    # Mix of fundamental and overtones
    timpani = (
        0.6 * np.sin(2 * np.pi * pitch_envelope * t) +  # Fundamental
        0.3 * np.sin(2 * np.pi * pitch_envelope * 1.5 * t) +  # Overtone
        0.1 * np.random.normal(0, 0.05, len(t)) * np.exp(-10 * t)  # Attack noise
    )
    
    return amp_envelope * timpani

def generate_explosion_tone(frequency, duration, sample_rate=44100, amplitude=0.9):
    """Generate spectacular explosion/impact sound with multiple layers."""
    if frequency == 0:
        return np.zeros(int(sample_rate * duration))
    
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    
    # Multi-stage pitch envelope - initial high pitch drop to deep rumble
    pitch_envelope = frequency * (1 + 2 * np.exp(-50 * t)) * np.exp(-8 * t)
    
    # Complex amplitude envelope with initial spike
    amp_envelope = amplitude * (0.5 + 0.5 * np.exp(-100 * t)) * np.exp(-5 * t)
    
    # Layer 1: Main explosion with pitch sweep
    main_explosion = 0.4 * np.sin(2 * np.pi * pitch_envelope * t)
    
    # Layer 2: Sub-bass rumble
    sub_bass = 0.3 * np.sin(2 * np.pi * pitch_envelope * 0.5 * t)
    
    # Layer 3: Mid-range harmonics for body
    harmonics = (
        0.15 * np.sin(2 * np.pi * pitch_envelope * 2 * t) +
        0.1 * np.sin(2 * np.pi * pitch_envelope * 3 * t)
    )
    
    # Layer 4: Initial crack/burst noise
    crack_envelope = np.exp(-30 * t)
    crack_noise = 0.4 * np.random.normal(0, 1, len(t)) * crack_envelope
    
    # Layer 5: Debris/shrapnel (filtered white noise)
    debris_noise = 0.2 * np.random.normal(0, 1, len(t)) * np.exp(-12 * t)
    # Apply band-pass filter effect for metallic sound
    for i in range(2, len(debris_noise)):
        debris_noise[i] = debris_noise[i] - 0.5 * debris_noise[i-1] + 0.3 * debris_noise[i-2]
    
    # Layer 6: Aftershock thump
    aftershock_delay = int(0.05 * sample_rate)  # 50ms delay
    aftershock = np.zeros(len(t))
    if aftershock_delay < len(t) - int(0.1 * sample_rate):
        aftershock_t = t[:int(0.1 * sample_rate)]
        aftershock_wave = 0.3 * np.sin(2 * np.pi * 30 * aftershock_t) * np.exp(-20 * aftershock_t)
        aftershock[aftershock_delay:aftershock_delay + len(aftershock_wave)] = aftershock_wave
    
    # Combine all layers
    explosion = main_explosion + sub_bass + harmonics + crack_noise + debris_noise + aftershock
    
    # Add initial transient pop for impact
    pop_samples = int(0.002 * sample_rate)
    if pop_samples < len(explosion):
        explosion[:pop_samples] *= np.linspace(0.5, 2, pop_samples)
    
    # Apply soft clipping to prevent harsh distortion
    explosion = np.tanh(explosion * 0.8) * 1.25
    
    return amp_envelope * explosion

def generate_gunshot_tone(frequency, duration, sample_rate=44100, amplitude=1.2):
    """Generate crisp cannon firing sound with heavy, powerful characteristics."""
    if frequency == 0:
        return np.zeros(int(sample_rate * duration))
    
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    
    # Cannon-style envelope - sharp initial blast with longer resonance
    amp_envelope = amplitude * (0.8 * np.exp(-35 * t) + 0.2 * np.exp(-8 * t))
    
    # Layer 1: Main cannon blast - deeper and more powerful
    blast_freq = frequency * 0.5  # Lower frequency for cannon
    cannon_blast = (
        0.4 * np.sin(2 * np.pi * blast_freq * t) +
        0.25 * np.sin(2 * np.pi * blast_freq * 1.5 * t) +
        0.15 * np.sin(2 * np.pi * blast_freq * 2 * t) +
        0.1 * np.sin(2 * np.pi * blast_freq * 3 * t)
    ) * np.exp(-30 * t)
    
    # Layer 2: Deep boom - very low frequency for cannon thump
    boom_freq = frequency * 0.15  # Very deep boom
    deep_boom = 0.5 * np.sin(2 * np.pi * boom_freq * t) * np.exp(-12 * t)
    
    # Layer 3: Barrel resonance - metallic ring unique to cannons
    resonance_envelope = np.exp(-25 * t)
    barrel_resonance = 0.3 * np.sin(2 * np.pi * frequency * 2.5 * t) * resonance_envelope
    # Add metallic overtones
    for harmonic in [3.7, 5.2, 7.1]:  # Non-harmonic overtones for metallic sound
        barrel_resonance += 0.1 * np.sin(2 * np.pi * frequency * harmonic * t) * resonance_envelope
    
    # Layer 4: Crisp crack - sharp attack for clarity
    crack_envelope = np.exp(-50 * t)
    crisp_crack = 0.3 * np.random.normal(0, 1, len(t)) * crack_envelope
    # Band-pass filter for crisp cannon crack
    for i in range(2, len(crisp_crack)):
        crisp_crack[i] = crisp_crack[i] - 0.6 * crisp_crack[i-1] + 0.2 * crisp_crack[i-2]
    
    # Layer 5: Mechanism clunk - heavier mechanical sound for cannon
    mechanism_samples = int(0.002 * sample_rate)  # 2ms mechanism sound
    mechanism_sound = np.zeros(len(t))
    if mechanism_samples < len(t):
        mechanism_t = t[:mechanism_samples]
        # Heavy metallic clunk
        mechanism_sound[:mechanism_samples] = (
            0.35 * np.sin(2 * np.pi * 800 * mechanism_t) * 
            np.exp(-80 * mechanism_t)
        )
        # Add click transient
        mechanism_sound[:int(0.0002 * sample_rate)] *= 2
    
    # Layer 6: Smoke/pressure release - cannon-specific
    pressure_delay = int(0.01 * sample_rate)  # 10ms delay
    pressure_release = np.zeros(len(t))
    if pressure_delay < len(t):
        pressure_length = min(int(0.05 * sample_rate), len(t) - pressure_delay)
        pressure_t = t[:pressure_length]
        # Hissing pressure release
        pressure_release[pressure_delay:pressure_delay + pressure_length] = (
            0.2 * np.random.normal(0, 1, pressure_length) * np.exp(-15 * pressure_t)
        )
    
    # Layer 7: Shell ejection ring (for tank cannon effect)
    shell_delay = int(0.03 * sample_rate)  # 30ms delay
    shell_ring = np.zeros(len(t))
    if shell_delay < len(t):
        shell_length = min(int(0.02 * sample_rate), len(t) - shell_delay)
        shell_t = t[:shell_length]
        shell_ring[shell_delay:shell_delay + shell_length] = (
            0.15 * np.sin(2 * np.pi * 1200 * shell_t) * np.exp(-40 * shell_t)
        )
    
    # Combine all layers for cannon sound
    cannon_shot = (cannon_blast + deep_boom + barrel_resonance + 
                   crisp_crack + mechanism_sound + pressure_release + shell_ring)
    
    # Add powerful initial transient for cannon punch
    punch_samples = int(0.0005 * sample_rate)  # 0.5ms punch
    if punch_samples < len(cannon_shot):
        cannon_shot[:punch_samples] *= np.linspace(1, 2.5, punch_samples)
    
    # Apply soft clipping with more headroom for cannon dynamics
    cannon_shot = np.tanh(cannon_shot * 0.6) * 1.6
    
    return amp_envelope * cannon_shot

def generate_snare_tone(duration, sample_rate=44100, amplitude=0.7):
    """Generate snare drum sound with crisp attack and enhanced punch."""
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    
    # Snare has sharp attack and quick decay
    amp_envelope = amplitude * np.exp(-25 * t)  # Faster decay for crispness
    
    # Mix of tonal component and noise
    tone_freq = 200  # Snare fundamental
    tonal = 0.25 * np.sin(2 * np.pi * tone_freq * t)
    
    # Add harmonic for body
    tonal += 0.1 * np.sin(2 * np.pi * tone_freq * 1.5 * t)
    
    # High frequency noise for snare rattle
    noise = 0.75 * np.random.normal(0, 1, len(t))
    
    # Apply high-pass filter effect (crude but effective)
    # Emphasize high frequencies for crispness
    for i in range(1, len(noise)):
        noise[i] = noise[i] - 0.92 * noise[i-1]  # Less filtering = more high freq
    
    snare = amp_envelope * (tonal + noise)
    
    # Add initial attack transient for punch
    attack_samples = int(0.001 * sample_rate)  # 1ms sharp attack
    if attack_samples < len(snare):
        snare[:attack_samples] *= np.linspace(0, 3, attack_samples)  # Stronger attack
    
    return snare

def generate_voice_track(voice_data, tempo, sample_rate=44100, voice_type='melody'):
    """Generate audio track for a single voice."""
    beat_duration = 60.0 / tempo
    track = np.array([])
    
    for item in voice_data['notes']:
        note_type = item[0]
        duration = item[2] * beat_duration
        
        if note_type == 'chord':
            # Generate chord
            chord_notes = item[1]
            if voice_type == 'chords':
                tone = generate_chord_tone(chord_notes, duration, sample_rate, amplitude=0.3)
            else:
                tone = generate_chord_tone(chord_notes, duration, sample_rate, amplitude=0.25)
        elif note_type == 'note':
            # Generate single note
            note = item[1]
            frequency = NOTES.get(note, 0)
            
            if note == 'x':  # Snare drum hit
                tone = generate_snare_tone(duration, sample_rate, amplitude=0.5)
            elif voice_type == 'melody':
                tone = generate_tone(frequency, duration, sample_rate, amplitude=0.4, waveform='mixed')
            elif voice_type == 'bass':
                tone = generate_tone(frequency, duration, sample_rate, amplitude=0.35, waveform='sawtooth')
            elif voice_type == 'timpani':
                tone = generate_timpani_tone(frequency, duration, sample_rate, amplitude=0.4)
            elif voice_type == 'snare':
                # Snare drum track
                if note == 'x':
                    tone = generate_snare_tone(duration, sample_rate, amplitude=0.5)
                else:
                    tone = np.zeros(int(sample_rate * duration))
            elif voice_type == 'gunshot':
                tone = generate_gunshot_tone(frequency, duration, sample_rate, amplitude=0.9)
            elif voice_type == 'explosion':
                tone = generate_explosion_tone(frequency, duration, sample_rate, amplitude=0.8)
            else:
                tone = generate_tone(frequency, duration, sample_rate, amplitude=0.3, waveform='sine')
        else:  # rest
            tone = np.zeros(int(sample_rate * duration))
        
        track = np.concatenate([track, tone])
    
    return track

def convert_abc_to_ogg(abc_file, output_name=None):
    """Convert multi-voice ABC file to OGG format."""
    if output_name is None:
        output_name = os.path.splitext(abc_file)[0]
    
    print(f"Processing {abc_file}...")
    
    # Parse ABC file
    voices, tempo = parse_abc_file(abc_file)
    if not voices:
        print(f"No voices found in {abc_file}")
        return None
    
    print(f"  Found {len(voices)} voices at tempo {tempo}")
    for v_num, v_data in voices.items():
        print(f"    Voice {v_num}: {v_data['name']} - {len(v_data['notes'])} items")
    
    sample_rate = 44100
    
    # Generate tracks for each voice
    tracks = []
    for voice_num in sorted(voices.keys()):
        voice_data = voices[voice_num]
        voice_name = voice_data['name'].lower()
        
        # Determine voice type based on name
        if 'melody' in voice_name:
            voice_type = 'melody'
        elif 'chord' in voice_name:
            voice_type = 'chords'
        elif 'bass' in voice_name:
            voice_type = 'bass'
        elif 'timpani' in voice_name or 'percussion' in voice_name:
            voice_type = 'timpani'
        elif 'snare' in voice_name:
            voice_type = 'snare'
        elif 'fire' in voice_name:
            voice_type = 'gunshot'
        elif 'impact' in voice_name or 'metal' in voice_name:
            voice_type = 'explosion'
        else:
            voice_type = 'melody'
        
        print(f"  Generating {voice_name} track ({voice_type})...")
        track = generate_voice_track(voice_data, tempo, sample_rate, voice_type)
        tracks.append(track)
    
    # Ensure all tracks are same length
    max_len = max(len(track) for track in tracks)
    for i in range(len(tracks)):
        if len(tracks[i]) < max_len:
            tracks[i] = np.pad(tracks[i], (0, max_len - len(tracks[i])))
    
    # Mix tracks with appropriate levels
    mixed = np.zeros(max_len)
    
    # Dynamic mix levels - boost if snare track exists
    has_snare = len(tracks) >= 5 and np.max(np.abs(tracks[4])) > 0.01
    
    if has_snare:
        # Increased intensity when snare drums are present
        mix_levels = [1.1, 0.7, 0.8, 0.6, 0.9]  # Melody, Chords, Bass, Timpani, Snare
    else:
        # Normal levels for tracks without snare
        mix_levels = [1.0, 0.6, 0.7, 0.5, 0.5]  # Melody, Chords, Bass, Timpani, (no snare)
    
    for i, track in enumerate(tracks):
        level = mix_levels[i] if i < len(mix_levels) else 0.5
        mixed += track * level
    
    # Add subtle reverb for depth
    reverb_delay = int(0.03 * sample_rate)
    reverb_decay = 0.15
    if len(mixed) > reverb_delay:
        reverb = np.zeros_like(mixed)
        reverb[reverb_delay:] = mixed[:-reverb_delay] * reverb_decay
        mixed += reverb
    
    # Normalize
    max_val = np.max(np.abs(mixed))
    if max_val > 0:
        # Lower volume for game over theme
        if 'game_over' in abc_file.lower():
            mixed = mixed / max_val * 0.6  # Lower volume for game over
        else:
            mixed = mixed / max_val * 0.85
    
    # Save as WAV
    wav_file = f"{output_name}.wav"
    audio_16bit = np.int16(mixed * 32767)
    wavfile.write(wav_file, sample_rate, audio_16bit)
    print(f"  Saved WAV: {wav_file}")
    
    # Convert to OGG
    ogg_file = f"{output_name}.ogg"
    try:
        cmd = ['ffmpeg', '-i', wav_file, '-c:a', 'libvorbis', '-q:a', '5', ogg_file, '-y']
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"  Converted to OGG: {ogg_file}")
            # Clean up WAV file
            os.remove(wav_file)
            return ogg_file
        else:
            print(f"  Error converting to OGG: {result.stderr}")
            return wav_file
    except Exception as e:
        print(f"  Error during conversion: {e}")
        return wav_file

def main():
    """Convert all ABC files in the current directory to OGG."""
    abc_files = [
        'title_theme.abc',
        'battle_theme.abc', 
        'victory_theme.abc',
        'game_over_theme.abc',
        'powerup_jingle.abc',
        'bullet_fire.abc',
        'bullet_hit.abc'
    ]
    
    print("Tank Battle Multi-Track Audio Converter")
    print("=" * 50)
    
    converted = []
    for abc_file in abc_files:
        if os.path.exists(abc_file):
            result = convert_abc_to_ogg(abc_file)
            if result:
                converted.append(result)
        else:
            print(f"File not found: {abc_file}")
    
    print("\n" + "=" * 50)
    print(f"Converted {len(converted)} files:")
    for file in converted:
        print(f"  - {file}")

if __name__ == "__main__":
    main()
