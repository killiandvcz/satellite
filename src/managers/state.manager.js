// src/managers/state.manager.js

/**
 * Gère l'état et les métriques du service
 */
export class StateManager {
    constructor(service) {
        this.service = service;
        
        /**
         * État du service
         */
        this.state = {
            uptime: {
                startTime: Date.now(),
                lastSnapshot: Date.now()
            },
            
            status: 'initializing', // initializing, ready, error, stopping
            
            connections: {
                broker: {
                    connected: false,
                    lastConnected: null,
                    reconnectAttempts: 0
                }
            },
            
            activity: {
                requestsProcessed: 0,
                requestsFailed: 0,
                notificationsSent: 0,
                messagesPublished: 0,
                messagesReceived: 0,
                lastActivity: null
            },
            
            topics: {
                subscriptions: 0,
                publications: 0,
                activeTopics: new Set()
            },
            
            discovery: {
                knownServices: 0,
                connectedServices: 0,
                lastDiscovery: null
            },
            
            system: {
                memory: {
                    used: 0,
                    total: 0,
                    peak: 0
                },
                cpu: {
                    usage: 0,
                    loadAvg: []
                }
            }
        };
        
        /**
         * Historique des snapshots d'état
         */
        this.history = [];
        this.maxHistorySize = 100;
        
        // Démarrage des collecteurs de métriques
        this.startMetricsCollectors();
        
        // Configuration des event listeners
        this.setupEventListeners();
    }

    /**
     * Démarre les collecteurs de métriques
     * @private
     */
    startMetricsCollectors() {
        // Snapshot toutes les 10 secondes
        setInterval(() => this.takeSnapshot(), 10000);
        
        // Métriques système toutes les 5 secondes
        setInterval(() => this.updateSystemMetrics(), 5000);
    }

    /**
     * Configure les écouteurs d'événements
     * @private
     */
    setupEventListeners() {
        // Événements de connexion
        this.service.events.on('connected', () => {
            this.setBrokerConnection(true);
        });

        this.service.events.on('disconnected', () => {
            this.setBrokerConnection(false);
        });

        // Événements d'activité
        this.service.events.on('request:processed', () => {
            this.incrementActivity('requestsProcessed');
        });

        this.service.events.on('request:failed', () => {
            this.incrementActivity('requestsFailed');
        });

        // Événements de découverte
        this.service.events.on('service:discovered', () => {
            this.state.discovery.knownServices++;
            this.state.discovery.lastDiscovery = Date.now();
        });
    }

    /**
     * Met à jour le statut du service
     * @param {string} status - Nouveau statut
     * @param {Object} data - Données additionnelles
     */
    setStatus(status, data = {}) {
        const previousStatus = this.state.status;
        this.state.status = status;
        
        this.service.events.emit('status:changed', {
            previous: previousStatus,
            current: status,
            data
        });
        
        this.service.logger.info(`Service status changed: ${previousStatus} -> ${status}`, data);
    }

    /**
     * Met à jour l'état de connexion au broker
     * @param {boolean} connected
     */
    setBrokerConnection(connected) {
        this.state.connections.broker.connected = connected;
        
        if (connected) {
            this.state.connections.broker.lastConnected = Date.now();
            this.state.connections.broker.reconnectAttempts = 0;
        } else {
            this.state.connections.broker.reconnectAttempts++;
        }
    }

    /**
     * Incrémente un compteur d'activité
     * @param {string} counter - Nom du compteur
     * @param {number} value - Valeur à ajouter
     */
    incrementActivity(counter, value = 1) {
        if (counter in this.state.activity) {
            this.state.activity[counter] += value;
            this.state.activity.lastActivity = Date.now();
        }
    }

    /**
     * Met à jour les métriques système
     * @private
     */
    updateSystemMetrics() {
        const memory = process.memoryUsage();
        
        this.state.system.memory = {
            used: memory.heapUsed,
            total: memory.heapTotal,
            peak: Math.max(memory.heapUsed, this.state.system.memory.peak)
        };
        
        this.state.system.cpu = {
            usage: process.cpuUsage(),
            // Note: loadavg n'est pas disponible dans Bun pour le moment
            loadAvg: []
        };
    }

    /**
     * Prend un snapshot de l'état actuel
     */
    takeSnapshot() {
        const snapshot = {
            timestamp: Date.now(),
            state: JSON.parse(JSON.stringify({
                ...this.state,
                topics: {
                    ...this.state.topics,
                    activeTopics: Array.from(this.state.topics.activeTopics)
                }
            }))
        };
        
        this.history.push(snapshot);
        
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
        
        this.state.uptime.lastSnapshot = snapshot.timestamp;
    }

    /**
     * Met à jour les compteurs de topics
     * @param {string} type - Type de compteur (subscriptions/publications)
     * @param {number} value - Nouvelle valeur
     */
    updateTopicCounter(type, value) {
        if (type in this.state.topics) {
            this.state.topics[type] = value;
        }
    }

    /**
     * Ajoute un topic actif
     * @param {string} topic
     */
    addActiveTopic(topic) {
        this.state.topics.activeTopics.add(topic);
    }

    /**
     * Retire un topic actif
     * @param {string} topic
     */
    removeActiveTopic(topic) {
        this.state.topics.activeTopics.delete(topic);
    }

    /**
     * Récupère l'état actuel
     * @returns {Object}
     */
    getState() {
        return {
            ...this.state,
            uptime: {
                ...this.state.uptime,
                current: Date.now() - this.state.uptime.startTime
            },
            topics: {
                ...this.state.topics,
                activeTopics: Array.from(this.state.topics.activeTopics)
            }
        };
    }

    /**
     * Récupère l'historique des états
     * @param {number} limit - Nombre maximum d'entrées
     * @returns {Array<Object>}
     */
    getHistory(limit = 100) {
        return this.history
            .slice(-Math.min(limit, this.history.length))
            .map(snapshot => ({
                ...snapshot,
                age: Date.now() - snapshot.timestamp
            }));
    }

    /**
     * Récupère des statistiques sur une période
     * @param {number} duration - Durée en millisecondes
     * @returns {Object}
     */
    getStats(duration = 3600000) { // 1 heure par défaut
        const now = Date.now();
        const relevantHistory = this.history.filter(
            snapshot => now - snapshot.timestamp <= duration
        );
        
        if (relevantHistory.length < 2) return null;
        
        const first = relevantHistory[0].state;
        const last = relevantHistory[relevantHistory.length - 1].state;
        
        return {
            period: {
                start: first.uptime.lastSnapshot,
                end: last.uptime.lastSnapshot,
                duration: last.uptime.lastSnapshot - first.uptime.lastSnapshot
            },
            activity: {
                requestRate: (last.activity.requestsProcessed - first.activity.requestsProcessed) / (duration / 1000),
                errorRate: (last.activity.requestsFailed - first.activity.requestsFailed) / (duration / 1000),
                messageRate: (last.activity.messagesPublished - first.activity.messagesPublished) / (duration / 1000)
            },
            broker: {
                connected: last.connections.broker.connected,
                uptime: last.connections.broker.lastConnected ? (now - last.connections.broker.lastConnected) : 0
            },
            system: {
                memory: {
                    averageUsage: relevantHistory.reduce((sum, snapshot) => sum + snapshot.state.system.memory.used, 0) / relevantHistory.length,
                    peak: Math.max(...relevantHistory.map(snapshot => snapshot.state.system.memory.peak))
                }
            }
        };
    }

    /**
     * Nettoie les ressources du manager
     */
    cleanup() {
        this.state.topics.activeTopics.clear();
        this.history = [];
    }
}