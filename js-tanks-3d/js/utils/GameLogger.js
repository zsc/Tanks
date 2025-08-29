export default class GameLogger {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.logToFile = options.logToFile || false;
        this.logToConsole = options.logToConsole !== false;
        this.maxLogSize = options.maxLogSize || 1000; // Max number of entries in memory
        
        // Debug flags to control specific logging
        this.debugFlags = {
            ENEMY_ACTIONS: false,  // Disable enemy movement/spawn logs
            PLAYER_FIRE: true,     // Enable detailed player fire debugging
            COLLISIONS: true,      // Keep collision logs
            STATE_CHANGES: true    // Keep state change logs
        };
        
        // Log levels
        this.LOG_LEVELS = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            EVENT: 4  // Special level for game events
        };
        
        this.currentLevel = options.level || this.LOG_LEVELS.INFO;
        
        // In-memory log buffer
        this.logs = [];
        
        // Event categories for filtering
        this.EVENT_CATEGORIES = {
            INPUT: 'INPUT',
            COLLISION: 'COLLISION',
            STATE: 'STATE',
            SPAWN: 'SPAWN',
            DESTROY: 'DESTROY',
            SCORE: 'SCORE',
            POWERUP: 'POWERUP'
        };
        
        // Debounce timers for high-frequency events
        this.debounceTimers = new Map();
        this.debounceDelay = 100; // ms
        
        // Initialize file logging if enabled
        if (this.logToFile) {
            this.initFileLogging();
        }
        
        // Start timestamp
        this.startTime = Date.now();
    }
    
    initFileLogging() {
        // For browser environment, we'll store logs and provide download functionality
        this.fileBuffer = [];
        
        // Add download button to UI
        this.addDownloadButton();
    }
    
    addDownloadButton() {
        const button = document.createElement('button');
        button.id = 'download-logs';
        button.textContent = 'Download Logs';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            z-index: 1000;
        `;
        
        button.addEventListener('click', () => this.downloadLogs());
        document.body.appendChild(button);
    }
    
    log(level, category, message, data = {}) {
        if (!this.enabled || level < this.currentLevel) return;
        
        const timestamp = Date.now();
        const relativeTime = timestamp - this.startTime;
        
        const entry = {
            timestamp,
            relativeTime,
            level: this.getLevelName(level),
            category,
            message,
            data: this.sanitizeData(data)
        };
        
        // Add to memory buffer
        this.logs.push(entry);
        if (this.logs.length > this.maxLogSize) {
            this.logs.shift(); // Remove oldest entry
        }
        
        // Add to file buffer if file logging is enabled
        if (this.logToFile) {
            this.fileBuffer.push(entry);
        }
        
        // Console output
        if (this.logToConsole) {
            this.consoleLog(entry);
        }
    }
    
    logEvent(category, message, data = {}) {
        this.log(this.LOG_LEVELS.EVENT, category, message, data);
    }
    
    logDebounced(category, message, data = {}, delay = null) {
        const key = `${category}:${message}`;
        
        // Clear existing timer
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        // Set new timer
        const timer = setTimeout(() => {
            this.logEvent(category, message, data);
            this.debounceTimers.delete(key);
        }, delay || this.debounceDelay);
        
        this.debounceTimers.set(key, timer);
    }
    
    // Log specific game events
    logPlayerInput(playerId, action, data = {}) {
        this.logDebounced(
            this.EVENT_CATEGORIES.INPUT,
            `Player ${playerId} ${action}`,
            { playerId, action, ...data },
            200 // Debounce player input with 200ms delay
        );
    }
    
    logCollision(type, entity1, entity2, result = {}) {
        this.logEvent(
            this.EVENT_CATEGORIES.COLLISION,
            `${type} collision: ${entity1} vs ${entity2}`,
            { type, entity1, entity2, result }
        );
    }
    
    logStateChange(from, to, reason = '') {
        this.logEvent(
            this.EVENT_CATEGORIES.STATE,
            `Game state changed: ${from} -> ${to}`,
            { from, to, reason }
        );
    }
    
    logSpawn(entityType, entityId, position) {
        // Skip enemy spawn logs if flag is disabled
        if (entityType === 'Enemy' && !this.debugFlags.ENEMY_ACTIONS) {
            return;
        }
        
        this.logEvent(
            this.EVENT_CATEGORIES.SPAWN,
            `${entityType} spawned: ${entityId}`,
            { entityType, entityId, position }
        );
    }
    
    logDestroy(entityType, entityId, destroyer = null) {
        this.logEvent(
            this.EVENT_CATEGORIES.DESTROY,
            `${entityType} destroyed: ${entityId}`,
            { entityType, entityId, destroyer }
        );
    }
    
    logScore(playerId, points, total) {
        this.logEvent(
            this.EVENT_CATEGORIES.SCORE,
            `Player ${playerId} scored ${points} points`,
            { playerId, points, total }
        );
    }
    
    logMapChange(x, z, oldType, newType, cause) {
        this.logEvent(
            this.EVENT_CATEGORIES.COLLISION,
            `Map tile changed at (${x},${z})`,
            { x, z, oldType, newType, cause }
        );
    }
    
    // Helper methods
    getLevelName(level) {
        const names = Object.entries(this.LOG_LEVELS).find(([name, val]) => val === level);
        return names ? names[0] : 'UNKNOWN';
    }
    
    sanitizeData(data) {
        // Remove circular references and limit object depth
        try {
            const seen = new WeakSet();
            return JSON.parse(JSON.stringify(data, (key, value) => {
                // Skip functions and very large objects
                if (typeof value === 'function') return '[Function]';
                if (value instanceof HTMLElement) return '[HTMLElement]';
                if (typeof THREE !== 'undefined' && value instanceof THREE.Object3D) return `[Three.${value.type}]`;
                
                // Handle circular references
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) {
                        return '[Circular Reference]';
                    }
                    seen.add(value);
                    
                    // Extract only essential properties from complex objects
                    if (value.position && value.rotation) {
                        return {
                            id: value.id,
                            type: value.type,
                            position: { x: value.position.x, y: value.position.y, z: value.position.z },
                            rotation: value.rotation,
                            alive: value.alive,
                            health: value.health
                        };
                    }
                }
                
                // Limit array length
                if (Array.isArray(value) && value.length > 10) {
                    return [...value.slice(0, 10), `... ${value.length - 10} more`];
                }
                
                return value;
            }));
        } catch (e) {
            // Return a simplified version if serialization fails
            return { 
                error: 'Serialization failed',
                type: data?.type || 'unknown',
                id: data?.id || 'unknown'
            };
        }
    }
    
    consoleLog(entry) {
        const timeStr = `[${(entry.relativeTime / 1000).toFixed(2)}s]`;
        const prefix = `${timeStr} [${entry.level}] [${entry.category}]`;
        
        const color = {
            DEBUG: 'gray',
            INFO: 'blue',
            WARN: 'orange',
            ERROR: 'red',
            EVENT: 'green'
        }[entry.level] || 'black';
        
        console.log(
            `%c${prefix} ${entry.message}`,
            `color: ${color}`,
            entry.data
        );
    }
    
    // Export logs
    downloadLogs() {
        const logData = {
            startTime: new Date(this.startTime).toISOString(),
            endTime: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            entries: this.fileBuffer
        };
        
        const blob = new Blob(
            [JSON.stringify(logData, null, 2)],
            { type: 'application/json' }
        );
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `game-log-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`Downloaded ${this.fileBuffer.length} log entries`);
    }
    
    getLogs(category = null, limit = 100) {
        let filtered = this.logs;
        
        if (category) {
            filtered = filtered.filter(log => log.category === category);
        }
        
        return filtered.slice(-limit);
    }
    
    clear() {
        this.logs = [];
        this.fileBuffer = [];
        console.log('Logs cleared');
    }
    
    getStats() {
        const stats = {};
        
        // Count by category
        this.logs.forEach(log => {
            if (!stats[log.category]) {
                stats[log.category] = 0;
            }
            stats[log.category]++;
        });
        
        return {
            total: this.logs.length,
            byCategory: stats,
            duration: Date.now() - this.startTime
        };
    }
}