// src/utils/logger.util.js

/**
 * Niveaux de log disponibles avec leurs configurations
 */
const LOG_LEVELS = {
    debug: {
        value: 0,
        color: '\x1b[36m', // Cyan
        label: 'DEBUG',
        emoji: '🔍'
    },
    info: {
        value: 1,
        color: '\x1b[32m', // Vert
        label: 'INFO',
        emoji: 'ℹ️'
    },
    warn: {
        value: 2,
        color: '\x1b[33m', // Jaune
        label: 'WARN',
        emoji: '⚠️'
    },
    error: {
        value: 3,
        color: '\x1b[31m', // Rouge
        label: 'ERROR',
        emoji: '❌'
    },
    critical: {
        value: 4,
        color: '\x1b[35m', // Magenta
        label: 'CRIT',
        emoji: '🚨'
    }
};

/**
 * Motifs à masquer dans les logs pour la sécurité
 */
const SENSITIVE_PATTERNS = [
    /password[^=]*=\s*[^\s&]+/gi,
    /authorization:\s*bearer\s+[^\s]+/gi,
    /token[^=]*=\s*[^\s&]+/gi
];

export class Logger {
    /**
     * @param {string} namespace - Namespace du logger
     * @param {Object} options - Options de configuration
     */
    constructor(namespace, options = {}) {
        this.namespace = namespace;
        this.options = {
            level: process.env.LOG_LEVEL || 'info',
            enableColors: true,
            enableEmoji: true,
            enableTimestamp: true,
            maskSensitiveData: true,
            logToFile: false,
            logFilePath: `./logs/${namespace}.log`,
            maxLogSize: 10 * 1024 * 1024, // 10 MB
            maxLogFiles: 5,
            ...options
        };

        // Historique des logs en mémoire
        this.history = [];
        this.maxHistorySize = 1000;

        // Statistiques
        this.stats = {
            messagesByLevel: new Map(),
            totalMessages: 0,
            startTime: Date.now()
        };

        // Création du système de fichier si nécessaire
        if (this.options.logToFile) {
            this.setupFileSystem();
        }
    }

    /**
     * Configure le système de fichiers pour les logs
     * @private
     */
    setupFileSystem() {
        const fs = require('fs');
        const path = require('path');

        const logDir = path.dirname(this.options.logFilePath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    /**
     * Crée une entrée de log
     * @param {string} level - Niveau de log
     * @param {string} message - Message à logger
     * @param {Object} data - Données additionnelles
     */
    log(level, message, data = null) {
        if (LOG_LEVELS[level].value < LOG_LEVELS[this.options.level].value) {
            return;
        }

        const timestamp = new Date();
        const logEntry = this.formatLogEntry(level, message, data, timestamp);

        // Masquage des données sensibles si activé
        const processedEntry = this.options.maskSensitiveData 
            ? this.maskSensitiveData(logEntry)
            : logEntry;

        // Affichage dans la console
        console.log(processedEntry);

        // Enregistrement dans le fichier si activé
        if (this.options.logToFile) {
            this.writeToFile(this.stripAnsiColors(processedEntry));
        }

        // Mise à jour des stats
        this.updateStats(level);

        // Ajout à l'historique
        this.addToHistory({
            level,
            message,
            data,
            timestamp
        });
    }

    /**
     * Formate une entrée de log
     * @private
     */
    formatLogEntry(level, message, data, timestamp) {
        const levelConfig = LOG_LEVELS[level];
        const parts = [];

        // Timestamp
        if (this.options.enableTimestamp) {
            parts.push(`[${timestamp.toISOString()}]`);
        }

        // Namespace
        parts.push(`[${this.namespace}]`);

        // Niveau avec couleur et emoji
        if (this.options.enableColors) {
            const emoji = this.options.enableEmoji ? `${levelConfig.emoji} ` : '';
            parts.push(`${levelConfig.color}${emoji}[${levelConfig.label}]\x1b[0m`);
        } else {
            const emoji = this.options.enableEmoji ? `${levelConfig.emoji} ` : '';
            parts.push(`${emoji}[${levelConfig.label}]`);
        }

        // Message
        parts.push(message);

        // Données additionnelles
        if (data !== null) {
            if (data instanceof Error) {
                parts.push(`\n${data.stack}`);
            } else {
                parts.push(`\n${JSON.stringify(data, null, 2)}`);
            }
        }

        return parts.join(' ');
    }

    /**
     * Masque les données sensibles
     * @private
     */
    maskSensitiveData(message) {
        let maskedMessage = message;
        for (const pattern of SENSITIVE_PATTERNS) {
            maskedMessage = maskedMessage.replace(pattern, match => {
                const parts = match.split('=');
                return `${parts[0]}=***`;
            });
        }
        return maskedMessage;
    }

    /**
     * Écrit dans le fichier de log
     * @private
     */
    writeToFile(message) {
        const fs = require('fs');

        try {
            // Vérification de la taille du fichier
            if (fs.existsSync(this.options.logFilePath)) {
                const stats = fs.statSync(this.options.logFilePath);
                if (stats.size >= this.options.maxLogSize) {
                    this.rotateLogFiles();
                }
            }

            // Écriture du message
            fs.appendFileSync(
                this.options.logFilePath,
                message + '\n',
                'utf8'
            );
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    /**
     * Rotation des fichiers de log
     * @private
     */
    rotateLogFiles() {
        const fs = require('fs');
        const path = require('path');

        for (let i = this.options.maxLogFiles - 1; i > 0; i--) {
            const oldPath = `${this.options.logFilePath}.${i}`;
            const newPath = `${this.options.logFilePath}.${i + 1}`;

            if (fs.existsSync(oldPath)) {
                fs.renameSync(oldPath, newPath);
            }
        }

        fs.renameSync(
            this.options.logFilePath,
            `${this.options.logFilePath}.1`
        );
    }

    /**
     * Ajoute une entrée à l'historique
     * @private
     */
    addToHistory(entry) {
        this.history.push(entry);
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * Met à jour les statistiques
     * @private
     */
    updateStats(level) {
        this.stats.totalMessages++;
        this.stats.messagesByLevel.set(
            level,
            (this.stats.messagesByLevel.get(level) || 0) + 1
        );
    }

    /**
     * Supprime les codes couleur ANSI
     * @private
     */
    stripAnsiColors(str) {
        return str.replace(/\x1b\[\d+m/g, '');
    }

    /**
     * Méthodes de log pour chaque niveau
     */
    debug(message, data = null) {
        this.log('debug', message, data);
    }

    info(message, data = null) {
        this.log('info', message, data);
    }

    warn(message, data = null) {
        this.log('warn', message, data);
    }

    error(message, data = null) {
        this.log('error', message, data);
    }

    critical(message, data = null) {
        this.log('critical', message, data);
    }

    /**
     * Récupère l'historique des logs
     * @param {Object} options - Options de filtrage
     */
    getHistory(options = {}) {
        let filtered = [...this.history];

        if (options.level) {
            filtered = filtered.filter(entry => entry.level === options.level);
        }

        if (options.search) {
            const searchRegex = new RegExp(options.search, 'i');
            filtered = filtered.filter(entry => 
                searchRegex.test(entry.message) || 
                searchRegex.test(JSON.stringify(entry.data))
            );
        }

        if (options.since) {
            filtered = filtered.filter(entry => 
                entry.timestamp >= options.since
            );
        }

        return filtered;
    }

    /**
     * Récupère les statistiques du logger
     */
    getStats() {
        const uptime = Date.now() - this.stats.startTime;
        const messagesByLevel = Object.fromEntries(this.stats.messagesByLevel);

        return {
            totalMessages: this.stats.totalMessages,
            messagesByLevel,
            messagesPerSecond: this.stats.totalMessages / (uptime / 1000),
            uptime
        };
    }
}