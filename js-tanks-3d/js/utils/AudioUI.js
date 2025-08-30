import { getAudioManager } from './AudioManager.js';

export default class AudioUI {
    constructor() {
        this.audioManager = getAudioManager();
        this.setupEventListeners();
        this.loadSettings();
    }
    
    setupEventListeners() {
        // Music volume slider
        const musicSlider = document.getElementById('music-volume');
        const musicDisplay = document.getElementById('music-volume-display');
        
        if (musicSlider) {
            musicSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                this.audioManager.setMusicVolume(volume);
                musicDisplay.textContent = `${e.target.value}%`;
                this.saveSettings();
            });
        }
        
        // SFX volume slider
        const sfxSlider = document.getElementById('sfx-volume');
        const sfxDisplay = document.getElementById('sfx-volume-display');
        
        if (sfxSlider) {
            sfxSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                this.audioManager.setSFXVolume(volume);
                sfxDisplay.textContent = `${e.target.value}%`;
                this.saveSettings();
            });
        }
        
        // Mute toggle button
        const muteButton = document.getElementById('mute-toggle');
        
        if (muteButton) {
            muteButton.addEventListener('click', () => {
                const muted = !this.audioManager.enabled;
                this.audioManager.enabled = muted;
                
                if (muted) {
                    muteButton.textContent = '🔇 Mute All';
                    muteButton.classList.remove('muted');
                    this.audioManager.resume();
                } else {
                    muteButton.textContent = '🔊 Unmute';
                    muteButton.classList.add('muted');
                    this.audioManager.pause();
                }
                
                this.saveSettings();
            });
        }
    }
    
    loadSettings() {
        // Load saved volume settings from localStorage
        const settings = localStorage.getItem('tankGameAudioSettings');
        
        if (settings) {
            const parsed = JSON.parse(settings);
            
            // Apply music volume
            if (parsed.musicVolume !== undefined) {
                this.audioManager.setMusicVolume(parsed.musicVolume);
                const musicSlider = document.getElementById('music-volume');
                const musicDisplay = document.getElementById('music-volume-display');
                if (musicSlider) {
                    musicSlider.value = Math.round(parsed.musicVolume * 100);
                    musicDisplay.textContent = `${musicSlider.value}%`;
                }
            }
            
            // Apply SFX volume
            if (parsed.sfxVolume !== undefined) {
                this.audioManager.setSFXVolume(parsed.sfxVolume);
                const sfxSlider = document.getElementById('sfx-volume');
                const sfxDisplay = document.getElementById('sfx-volume-display');
                if (sfxSlider) {
                    sfxSlider.value = Math.round(parsed.sfxVolume * 100);
                    sfxDisplay.textContent = `${sfxSlider.value}%`;
                }
            }
            
            // Apply mute state
            if (parsed.muted !== undefined) {
                this.audioManager.enabled = !parsed.muted;
                const muteButton = document.getElementById('mute-toggle');
                if (muteButton) {
                    if (parsed.muted) {
                        muteButton.textContent = '🔊 Unmute';
                        muteButton.classList.add('muted');
                    } else {
                        muteButton.textContent = '🔇 Mute All';
                        muteButton.classList.remove('muted');
                    }
                }
            }
        }
    }
    
    saveSettings() {
        // Save current settings to localStorage
        const settings = {
            musicVolume: this.audioManager.musicVolume,
            sfxVolume: this.audioManager.sfxVolume,
            muted: !this.audioManager.enabled
        };
        
        localStorage.setItem('tankGameAudioSettings', JSON.stringify(settings));
    }
    
    showVolumeIndicator(text) {
        // Create a temporary volume indicator
        const indicator = document.createElement('div');
        indicator.className = 'volume-indicator';
        indicator.textContent = text;
        indicator.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: #4CAF50;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 16px;
            z-index: 10000;
            pointer-events: none;
            animation: fadeOut 1s ease-in-out;
        `;
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            indicator.remove();
        }, 1000);
    }
}

// Add fade out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        0% { opacity: 1; }
        70% { opacity: 1; }
        100% { opacity: 0; }
    }
`;
document.head.appendChild(style);