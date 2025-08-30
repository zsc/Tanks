export default class AudioManager {
    constructor() {
        this.tracks = {};
        this.currentTrack = null;
        this.enabled = true;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;
        
        // Load all audio tracks
        this.loadTracks();
        
        // Check if audio is supported
        this.audioContext = null;
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch(e) {
            console.warn('Web Audio API not supported');
        }
    }
    
    loadTracks() {
        // Music tracks
        const musicTracks = {
            title: 'audio/title_theme.ogg',
            battle: 'audio/battle_theme.ogg',
            victory: 'audio/victory_theme.ogg',
            gameOver: 'audio/game_over_theme.ogg',
            powerup: 'audio/powerup_jingle.ogg'
        };
        
        // Load each track
        for (const [name, path] of Object.entries(musicTracks)) {
            const audio = new Audio(path);
            audio.volume = this.musicVolume;
            
            // Add error handling
            audio.addEventListener('error', (e) => {
                console.warn(`Failed to load audio: ${path}`, e);
            });
            
            this.tracks[name] = audio;
        }
        
        // Set up looping for background music
        this.tracks.title.loop = true;
        this.tracks.battle.loop = true;
    }
    
    play(trackName, options = {}) {
        if (!this.enabled) return;
        
        const track = this.tracks[trackName];
        if (!track) {
            console.warn(`Track not found: ${trackName}`);
            return;
        }
        
        // Stop current track if it's different
        if (this.currentTrack && this.currentTrack !== track) {
            this.stop();
        }
        
        // Set options
        track.loop = options.loop || false;
        track.volume = (options.volume || 1.0) * 
                      (options.sfx ? this.sfxVolume : this.musicVolume);
        
        // Reset and play
        track.currentTime = 0;
        
        // Resume audio context if suspended (for browser autoplay policies)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        track.play().catch(e => {
            console.warn(`Failed to play audio: ${trackName}`, e);
        });
        
        // Track current music (not SFX)
        if (!options.sfx) {
            this.currentTrack = track;
        }
    }
    
    stop(trackName = null) {
        if (trackName) {
            const track = this.tracks[trackName];
            if (track) {
                track.pause();
                track.currentTime = 0;
            }
        } else if (this.currentTrack) {
            this.currentTrack.pause();
            this.currentTrack.currentTime = 0;
            this.currentTrack = null;
        }
    }
    
    pause() {
        if (this.currentTrack) {
            this.currentTrack.pause();
        }
    }
    
    resume() {
        if (this.currentTrack && this.enabled) {
            this.currentTrack.play().catch(e => {
                console.warn('Failed to resume audio', e);
            });
        }
    }
    
    fadeOut(duration = 1000) {
        if (!this.currentTrack) return;
        
        const track = this.currentTrack;
        const startVolume = track.volume;
        const fadeStep = 50; // ms
        const steps = duration / fadeStep;
        const volumeStep = startVolume / steps;
        
        const fadeInterval = setInterval(() => {
            if (track.volume > volumeStep) {
                track.volume -= volumeStep;
            } else {
                track.volume = 0;
                track.pause();
                track.currentTime = 0;
                track.volume = startVolume; // Reset volume for next play
                clearInterval(fadeInterval);
                
                if (track === this.currentTrack) {
                    this.currentTrack = null;
                }
            }
        }, fadeStep);
    }
    
    crossFade(fromTrack, toTrack, duration = 1000) {
        // Fade out current track
        if (this.tracks[fromTrack]) {
            const from = this.tracks[fromTrack];
            this.fadeOut(duration);
        }
        
        // Fade in new track
        if (this.tracks[toTrack]) {
            const to = this.tracks[toTrack];
            to.volume = 0;
            to.play().catch(e => console.warn('Failed to play audio', e));
            
            const fadeStep = 50; // ms
            const steps = duration / fadeStep;
            const volumeStep = this.musicVolume / steps;
            
            const fadeInterval = setInterval(() => {
                if (to.volume < this.musicVolume - volumeStep) {
                    to.volume += volumeStep;
                } else {
                    to.volume = this.musicVolume;
                    clearInterval(fadeInterval);
                }
            }, fadeStep);
            
            this.currentTrack = to;
        }
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        
        // Update current track volume
        if (this.currentTrack) {
            this.currentTrack.volume = this.musicVolume;
        }
    }
    
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
    
    toggleMute() {
        this.enabled = !this.enabled;
        
        if (!this.enabled) {
            this.pause();
        } else {
            this.resume();
        }
        
        return this.enabled;
    }
    
    // Play specific sound effects
    playPowerup() {
        this.play('powerup', { sfx: true, volume: 0.8 });
    }
    
    playVictory() {
        this.stop(); // Stop current music
        this.play('victory', { loop: false });
    }
    
    playGameOver() {
        this.stop(); // Stop current music
        this.play('gameOver', { loop: false });
    }
    
    playTitleMusic() {
        this.play('title', { loop: true });
    }
    
    playBattleMusic() {
        this.play('battle', { loop: true });
    }
}

// Singleton instance
let audioManagerInstance = null;

export function getAudioManager() {
    if (!audioManagerInstance) {
        audioManagerInstance = new AudioManager();
    }
    return audioManagerInstance;
}