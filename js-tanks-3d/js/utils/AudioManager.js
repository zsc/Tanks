export default class AudioManager {
    constructor() {
        this.tracks = {};
        this.currentTrack = null;
        this.enabled = true;
        this.musicMuted = false;  // Separate mute for music
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
        // Music tracks (OGG) and sound effects (WAV)
        const audioTracks = {
            // Background music - use OGG for better compression
            title: 'audio/title_theme.ogg',
            battle: 'audio/battle_theme.ogg',
            victory: 'audio/victory_theme.ogg',
            gameOver: 'audio/game_over_theme.ogg',
            powerup: 'audio/powerup_jingle.ogg',
            
            // Sound effects - use WAV for better quality and lower latency
            bulletFire: 'audio/bullet_fire.wav',
            bulletHit: 'audio/bullet_hit.wav',
            tankExplode: 'audio/tank_explode.wav'  // Dedicated tank explosion sound
        };
        
        // Load each track
        for (const [name, path] of Object.entries(audioTracks)) {
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
        
        // Apply volume based on type and mute state
        if (options.sfx) {
            track.volume = (options.volume || 1.0) * this.sfxVolume;
        } else {
            track.volume = this.musicMuted ? 0 : (options.volume || 1.0) * this.musicVolume;
        }
        
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
        
        // Update current track volume if not muted
        if (this.currentTrack && !this.musicMuted) {
            this.currentTrack.volume = this.musicVolume;
        }
    }
    
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
    
    toggleMusicMute() {
        this.musicMuted = !this.musicMuted;
        
        // Update current track volume
        if (this.currentTrack) {
            this.currentTrack.volume = this.musicMuted ? 0 : this.musicVolume;
        }
        
        return this.musicMuted;
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
    
    playTankExplode(position, listenerPosition) {
        // Play tank explosion with 3D positioning
        this.play3D('tankExplode', position, listenerPosition, {
            volume: 1.0,
            maxDistance: 25,
            refDistance: 2
        });
    }
    
    playVictory() {
        this.stop(); // Stop current music
        this.play('victory', { loop: false });
    }
    
    playGameOver() {
        this.stop(); // Stop current music
        this.play('gameOver', { loop: false, volume: 0.4 }); // Lower volume for game over
    }
    
    playTitleMusic() {
        this.play('title', { loop: true });
    }
    
    playBattleMusic() {
        this.play('battle', { loop: true });
    }
    
    // 3D Positional Audio for sound effects
    play3D(soundName, position, listenerPosition, options = {}) {
        if (!this.enabled) return;
        
        const sound = this.tracks[soundName];
        if (!sound) {
            console.warn(`Sound not found: ${soundName}`);
            return;
        }
        
        // Calculate distance
        const dx = position.x - listenerPosition.x;
        const dz = position.z - listenerPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Maximum hearing distance (in game units)
        const maxDistance = options.maxDistance || 20;
        const refDistance = options.refDistance || 1;
        
        // Skip if too far away
        if (distance > maxDistance) return;
        
        // Calculate volume based on distance (inverse distance model)
        let volume = 1.0;
        if (distance > refDistance) {
            volume = refDistance / distance;
        }
        
        // Apply additional volume scaling
        volume *= (options.volume || 1.0) * this.sfxVolume;
        volume = Math.max(0, Math.min(1, volume)); // Clamp to 0-1
        
        // Calculate stereo panning (-1 to 1)
        // Angle from listener to sound source
        const angle = Math.atan2(dz, dx);
        // Map angle to panning (-1 = left, 0 = center, 1 = right)
        // Assuming listener faces "up" (negative Z direction)
        const listenerAngle = options.listenerAngle || -Math.PI / 2; // Facing up
        const relativeAngle = angle - listenerAngle;
        
        // Convert to panning value
        let pan = Math.sin(relativeAngle);
        pan = Math.max(-1, Math.min(1, pan)); // Clamp to -1 to 1
        
        // Clone the audio for multiple simultaneous sounds
        const audioClone = sound.cloneNode();
        audioClone.volume = volume;
        
        // Apply panning if Web Audio API is available
        if (this.audioContext) {
            try {
                const source = this.audioContext.createMediaElementSource(audioClone);
                const panner = this.audioContext.createStereoPanner();
                panner.pan.value = pan;
                
                source.connect(panner);
                panner.connect(this.audioContext.destination);
            } catch (e) {
                // Fallback: just play with volume
                console.warn('3D audio panning failed:', e);
            }
        }
        
        // Play the sound
        audioClone.play().catch(e => {
            console.warn(`Failed to play 3D audio: ${soundName}`, e);
        });
        
        // Clean up after playback
        audioClone.addEventListener('ended', () => {
            audioClone.remove();
        });
        
        return {
            audio: audioClone,
            volume: volume,
            pan: pan,
            distance: distance
        };
    }
    
    // Play bullet fire sound at position
    playBulletFire(position, listenerPosition) {
        return this.play3D('bulletFire', position, listenerPosition, {
            volume: 0.6,
            maxDistance: 15,
            refDistance: 2
        });
    }
    
    // Play bullet hit sound at position
    playBulletHit(position, listenerPosition) {
        return this.play3D('bulletHit', position, listenerPosition, {
            volume: 0.8,
            maxDistance: 20,
            refDistance: 2
        });
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