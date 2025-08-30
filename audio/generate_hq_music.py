#!/usr/bin/env python3
"""
高品质游戏音乐生成器
从ABC记谱法生成高质量OGG音频文件
"""

import os
import re
import numpy as np
import subprocess
from typing import Dict, List, Tuple
import json

class HighQualityMusicGenerator:
    """高品质音乐生成器"""
    
    def __init__(self):
        self.sample_rate = 44100  # CD音质
        self.channels = 2         # 立体声
        self.bit_depth = 16
        
        # 音符到MIDI音高的映射
        self.note_to_midi = {
            'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
        }
        
        # MIDI音高到频率
        self.A4_freq = 440.0
        self.A4_midi = 69
        
    def parse_abc_file(self, filename: str) -> List[Dict]:
        """解析ABC文件"""
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 分割成单独的曲子
        tunes = re.split(r'\n(?=X:\d+)', content)
        parsed_tunes = []
        
        for tune in tunes:
            if not tune.strip() or not tune.startswith('X:'):
                continue
                
            tune_data = self.parse_single_tune(tune)
            if tune_data:
                parsed_tunes.append(tune_data)
        
        return parsed_tunes
    
    def parse_single_tune(self, abc_text: str) -> Dict:
        """解析单个ABC曲谱"""
        lines = abc_text.strip().split('\n')
        tune_data = {
            'notes': [],
            'tempo': 120,
            'time_sig': (4, 4),
            'key': 'C',
            'title': 'Untitled'
        }
        
        default_note_length = 1/8
        
        for line in lines:
            line = line.strip()
            
            # 解析头部信息
            if line.startswith('X:'):
                tune_data['index'] = int(line[2:].strip())
            elif line.startswith('T:'):
                tune_data['title'] = line[2:].strip()
            elif line.startswith('M:'):
                parts = line[2:].strip().split('/')
                if len(parts) == 2:
                    tune_data['time_sig'] = (int(parts[0]), int(parts[1]))
            elif line.startswith('L:'):
                parts = line[2:].strip().split('/')
                if len(parts) == 2:
                    default_note_length = int(parts[0]) / int(parts[1])
            elif line.startswith('Q:'):
                # Q:1/4=120 表示四分音符=120 BPM
                match = re.search(r'1/4=(\d+)', line)
                if match:
                    tune_data['tempo'] = int(match.group(1))
            elif line.startswith('K:'):
                tune_data['key'] = line[2:].strip()
            elif line.startswith('V:'):
                continue  # 忽略声部标记
            elif '|' in line or any(c in line for c in 'ABCDEFGabcdefg'):
                # 解析音符行
                notes = self.parse_note_line(line, default_note_length)
                tune_data['notes'].extend(notes)
        
        return tune_data
    
    def parse_note_line(self, line: str, default_length: float) -> List[Dict]:
        """解析音符行"""
        notes = []
        
        # 移除小节线和装饰
        line = re.sub(r'[|:\[\]"]', ' ', line)
        line = re.sub(r'"[^"]*"', '', line)  # 移除和弦标记
        
        # 匹配音符模式
        note_pattern = r"([_^=]?)([A-Ga-g])([,']*)(\d*/?\.?\d*)"
        matches = re.finditer(note_pattern, line)
        
        for match in matches:
            accidental, pitch, octave_mod, duration = match.groups()
            
            # 确定音高
            if pitch.isupper():
                octave = 4  # 大写字母表示低八度
            else:
                octave = 5  # 小写字母表示高八度
                pitch = pitch.upper()
            
            # 处理八度修饰符
            if ',' in octave_mod:
                octave -= octave_mod.count(',')
            if "'" in octave_mod:
                octave += octave_mod.count("'")
            
            # 处理时值
            if duration:
                if '/' in duration:
                    parts = duration.split('/')
                    if len(parts) == 2 and parts[1]:
                        note_length = default_length * (int(parts[0]) if parts[0] else 1) / int(parts[1])
                    else:
                        note_length = default_length / 2
                elif duration.isdigit():
                    note_length = default_length * int(duration)
                else:
                    note_length = default_length
            else:
                note_length = default_length
            
            # 计算MIDI音高
            midi_note = self.note_to_midi_number(pitch, octave, accidental)
            
            notes.append({
                'pitch': pitch,
                'midi': midi_note,
                'duration': note_length,
                'octave': octave,
                'accidental': accidental
            })
        
        return notes
    
    def note_to_midi_number(self, pitch: str, octave: int, accidental: str = '') -> int:
        """音符转MIDI音高编号"""
        base_midi = self.note_to_midi.get(pitch, 0)
        midi_number = (octave + 1) * 12 + base_midi
        
        if accidental == '^' or accidental == '#':
            midi_number += 1
        elif accidental == '_' or accidental == 'b':
            midi_number -= 1
        
        return midi_number
    
    def midi_to_frequency(self, midi_number: int) -> float:
        """MIDI音高编号转频率"""
        return self.A4_freq * (2 ** ((midi_number - self.A4_midi) / 12))
    
    def generate_sine_wave(self, frequency: float, duration: float, 
                          amplitude: float = 0.5) -> np.ndarray:
        """生成正弦波（纯音色）"""
        t = np.linspace(0, duration, int(duration * self.sample_rate))
        return amplitude * np.sin(2 * np.pi * frequency * t)
    
    def generate_complex_tone(self, frequency: float, duration: float,
                             harmonics: List[float] = None) -> np.ndarray:
        """生成复合音色（包含泛音）"""
        if harmonics is None:
            # 默认泛音序列（模拟弦乐器）
            harmonics = [1.0, 0.5, 0.3, 0.2, 0.1, 0.05]
        
        t = np.linspace(0, duration, int(duration * self.sample_rate))
        signal = np.zeros_like(t)
        
        for i, harmonic_amp in enumerate(harmonics):
            harmonic_freq = frequency * (i + 1)
            if harmonic_freq > self.sample_rate / 2:  # Nyquist频率
                break
            signal += harmonic_amp * np.sin(2 * np.pi * harmonic_freq * t)
        
        # 归一化
        max_val = np.max(np.abs(signal))
        if max_val > 0:
            signal = signal / max_val * 0.3
        
        return signal
    
    def apply_adsr_envelope(self, samples: np.ndarray, 
                           attack: float = 0.05, decay: float = 0.1,
                           sustain: float = 0.7, release: float = 0.2) -> np.ndarray:
        """应用ADSR包络"""
        total_samples = len(samples)
        sample_rate = self.sample_rate
        
        # 计算各阶段采样数
        attack_samples = min(int(attack * sample_rate), total_samples // 4)
        decay_samples = min(int(decay * sample_rate), total_samples // 4)
        release_samples = min(int(release * sample_rate), total_samples // 3)
        sustain_samples = max(0, total_samples - attack_samples - decay_samples - release_samples)
        
        envelope = np.ones(total_samples)
        
        # Attack阶段
        if attack_samples > 0:
            envelope[:attack_samples] = np.linspace(0, 1, attack_samples)
        
        # Decay阶段
        if decay_samples > 0:
            start = attack_samples
            end = start + decay_samples
            if end <= total_samples:
                envelope[start:end] = np.linspace(1, sustain, decay_samples)
        
        # Sustain阶段
        if sustain_samples > 0:
            start = attack_samples + decay_samples
            end = start + sustain_samples
            if end <= total_samples:
                envelope[start:end] = sustain
        
        # Release阶段
        if release_samples > 0 and total_samples > release_samples:
            envelope[-release_samples:] = np.linspace(sustain, 0, release_samples)
        
        return samples * envelope
    
    def add_reverb(self, signal: np.ndarray, room_size: float = 0.5,
                   damping: float = 0.5) -> np.ndarray:
        """添加混响效果"""
        # 简单的延迟混响
        delay_samples = int(0.05 * self.sample_rate * room_size)
        decay = 1 - damping
        
        reverb_signal = np.zeros(len(signal) + delay_samples * 3)
        reverb_signal[:len(signal)] = signal
        
        # 添加多个延迟回声
        for i in range(1, 4):
            delay = delay_samples * i
            amplitude = decay ** i
            if delay < len(reverb_signal):
                reverb_signal[delay:delay + len(signal)] += signal * amplitude * 0.3
        
        # 截断到原始长度附近
        return reverb_signal[:len(signal) + delay_samples]
    
    def synthesize_tune(self, tune_data: Dict, instrument: str = 'piano') -> np.ndarray:
        """合成完整曲子"""
        tempo = tune_data['tempo']
        notes = tune_data['notes']
        
        # 每拍的秒数
        beat_duration = 60.0 / tempo
        
        # 计算总时长
        total_duration = sum(note['duration'] * 4 * beat_duration for note in notes)
        
        # 预分配音频缓冲
        total_samples = int((total_duration + 2) * self.sample_rate)  # 额外2秒用于混响
        left_channel = np.zeros(total_samples)
        right_channel = np.zeros(total_samples)
        
        # 设置音色参数
        if instrument == 'piano':
            harmonics = [1.0, 0.4, 0.2, 0.1, 0.05]
            attack, decay, sustain, release = 0.01, 0.1, 0.6, 0.3
        elif instrument == 'strings':
            harmonics = [1.0, 0.6, 0.4, 0.3, 0.2, 0.1]
            attack, decay, sustain, release = 0.1, 0.2, 0.8, 0.3
        elif instrument == 'brass':
            harmonics = [1.0, 0.8, 0.6, 0.4, 0.3, 0.2, 0.1]
            attack, decay, sustain, release = 0.05, 0.1, 0.7, 0.2
        else:  # synth
            harmonics = [1.0, 0.7, 0.5, 0.3]
            attack, decay, sustain, release = 0.01, 0.05, 0.5, 0.1
        
        # 合成每个音符
        current_time = 0
        for i, note in enumerate(notes):
            frequency = self.midi_to_frequency(note['midi'])
            duration = note['duration'] * 4 * beat_duration  # 转换为秒
            
            # 生成音符
            tone = self.generate_complex_tone(frequency, duration, harmonics)
            tone = self.apply_adsr_envelope(tone, attack, decay, sustain, release)
            
            # 立体声定位（轻微左右摆动）
            pan = 0.5 + 0.3 * np.sin(2 * np.pi * i / 16)
            left_gain = np.sqrt(1 - pan)
            right_gain = np.sqrt(pan)
            
            # 添加到音轨
            start_sample = int(current_time * self.sample_rate)
            end_sample = min(start_sample + len(tone), total_samples)
            actual_length = end_sample - start_sample
            
            if actual_length > 0:
                left_channel[start_sample:end_sample] += tone[:actual_length] * left_gain
                right_channel[start_sample:end_sample] += tone[:actual_length] * right_gain
            
            current_time += duration
        
        # 添加混响
        left_channel = self.add_reverb(left_channel, room_size=0.3)
        right_channel = self.add_reverb(right_channel, room_size=0.3)
        
        # 合并声道
        stereo = np.stack([left_channel, right_channel], axis=1)
        
        # 归一化
        max_val = np.max(np.abs(stereo))
        if max_val > 0:
            stereo = stereo / max_val * 0.8
        
        # 截断到实际长度
        actual_samples = int(current_time * self.sample_rate)
        return stereo[:actual_samples]
    
    def save_as_wav(self, audio_data: np.ndarray, filename: str):
        """保存为WAV文件"""
        import wave
        
        # 转换为16位整数
        audio_data = (audio_data * 32767).astype(np.int16)
        
        with wave.open(filename, 'wb') as wav_file:
            wav_file.setnchannels(2)  # 立体声
            wav_file.setsampwidth(2)  # 16位
            wav_file.setframerate(self.sample_rate)
            
            # 交错立体声数据
            interleaved = audio_data.flatten()
            wav_file.writeframes(interleaved.tobytes())
    
    def convert_to_ogg(self, wav_file: str, ogg_file: str, quality: int = 6):
        """使用ffmpeg将WAV转换为OGG"""
        try:
            # 使用ffmpeg转换（需要安装ffmpeg）
            cmd = [
                'ffmpeg', '-y', '-i', wav_file,
                '-c:a', 'libvorbis', '-q:a', str(quality),
                ogg_file
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                return True
            else:
                print(f"ffmpeg错误: {result.stderr}")
                return False
        except FileNotFoundError:
            print("未找到ffmpeg，保留WAV格式")
            return False
    
    def generate_all_music(self):
        """生成所有音乐"""
        # 创建输出目录
        os.makedirs('audio/hq', exist_ok=True)
        
        # 解析ABC文件
        tunes = self.parse_abc_file('music_scores.abc')
        
        # 音色映射
        instrument_map = {
            'Main Menu': 'piano',
            'Sky Battle': 'synth',
            'Boss': 'brass',
            'Victory': 'strings',
            'Ocean': 'piano',
            'Lament': 'strings',
            'Power Up': 'synth',
            'Coin': 'synth',
            'Space': 'synth',
            'Epic': 'brass'
        }
        
        generated_files = []
        
        for tune in tunes:
            title = tune['title']
            # 简化文件名
            filename_base = title.lower().replace(' - ', '_').replace(' ', '_')
            filename_base = re.sub(r'[^a-z0-9_]', '', filename_base)
            
            # 选择音色
            instrument = 'piano'
            for key, inst in instrument_map.items():
                if key in title:
                    instrument = inst
                    break
            
            print(f"生成: {title} (音色: {instrument})")
            
            # 合成音频
            audio = self.synthesize_tune(tune, instrument)
            
            # 保存WAV
            wav_file = f'audio/hq/{filename_base}.wav'
            self.save_as_wav(audio, wav_file)
            
            # 转换为OGG
            ogg_file = f'audio/hq/{filename_base}.ogg'
            if self.convert_to_ogg(wav_file, ogg_file):
                print(f"  ✓ 已生成OGG: {ogg_file}")
                generated_files.append({
                    'title': title,
                    'file': ogg_file,
                    'format': 'audio/ogg'
                })
                # 删除WAV文件以节省空间
                os.remove(wav_file)
            else:
                print(f"  ✓ 已生成WAV: {wav_file}")
                generated_files.append({
                    'title': title,
                    'file': wav_file,
                    'format': 'audio/wav'
                })
        
        # 保存文件列表
        with open('audio/hq/music_list.json', 'w', encoding='utf-8') as f:
            json.dump(generated_files, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ 生成完成！共生成 {len(generated_files)} 个音乐文件")
        return generated_files


def main():
    print("=" * 50)
    print("高品质游戏音乐生成器")
    print("=" * 50)
    
    generator = HighQualityMusicGenerator()
    generator.generate_all_music()


if __name__ == '__main__':
    main()