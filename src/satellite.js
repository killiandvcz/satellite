// src/node-service.js
import { Starling } from "@killiandvcz/starling";
import { Logger } from "./utils/logger.util";
import { TopicManager } from "./managers/topic.manager";
import { DiscoveryManager } from "./managers/discovery.manager";
import { RequestManager } from "./managers/request.manager";
import { StateManager } from "./managers/state.manager";
import { Pulse } from "@killiandvcz/pulse";


export class Satellite {
    /**
     * @typedef {Object} SatelliteOptions
     * @property {string} name - Nom du service
     * @property {string} type - Type du service
     * @property {string[]} capabilities - Capacités du service
     * @property {string} version - Version du service (semver)
     * @property {Object} metadata - Métadonnées additionnelles
     * @property {string} brokerUrl - URL du broker
     * @property {Object} logger - Options de logging
     */

    /**
     * @param {SatelliteOptions} options 
     */
    constructor(options) {
        this.options = {
            reconnect: true,
            reconnectDelay: 1000,
            maxReconnectAttempts: 5,
            ...options
        };

        // Validation des options requises
        this.#validateOptions();

        // Initialisation du logger
        this.logger = new Logger(`Service:${this.options.name}`, this.options.logger);

        // Initialisation des events
        this.events = new Pulse();

        // État du service
        this.ready = false;
        this.connected = false;
        this.identified = false;

        // Client Starling
        this.client = new Starling(this.options.brokerUrl, {
            reconnect: this.options.reconnect,
            reconnectDelay: this.options.reconnectDelay,
            maxReconnectAttempts: this.options.maxReconnectAttempts
        });

        // Managers
        this.topics = new TopicManager(this);
        this.discovery = new DiscoveryManager(this);
        this.requests = new RequestManager(this);
        this.state = new StateManager(this);

        // Setup des event handlers
        this.#setupEventHandlers();
        this.#setupBrokerMethods();
    }

    /**
     * Démarre le service
     */
    async start() {
        try {
            this.logger.info("Starting service...");

            // Connexion au broker
            await this.connect();

            // Identification auprès du broker
            await this.identify();

            this.ready = true;
            this.events.emit('ready');

            this.logger.info("Service started successfully");

        } catch (error) {
            this.logger.error("Failed to start service", error);
            throw error;
        }
    }

    /**
     * Connecte le service au broker
     */
    async connect() {
        try {
            this.logger.info("Connecting to broker...");
            await this.client.connect();
            this.connected = true;
            this.events.emit('connected');
            this.logger.info("Connected to broker");
        } catch (error) {
            this.logger.error("Failed to connect to broker", error);
            throw error;
        }
    }

    /**
     * Identifie le service auprès du broker
     */
    async identify() {
        try {
            this.logger.info("Identifying service to broker...");

            const response = await this.client.request('broker:identify', {
                name: this.options.name,
                type: this.options.type,
                version: this.options.version,
                capabilities: this.options.capabilities,
                metadata: this.options.metadata
            });

            this.serviceId = response.serviceId;
            this.identified = true;

            this.logger.info("Service identified successfully", {
                serviceId: this.serviceId
            });

        } catch (error) {
            this.logger.error("Failed to identify service", error);
            throw error;
        }
    }

    /**
     * Enregistre une méthode pouvant être appelée par d'autres services
     * @param {string} name - Nom de la méthode
     * @param {Function} handler - Handler de la méthode
     * @param {Object} options - Options de la méthode
     */
    method(name, handler, options = {}) {
        this.requests.registerMethod(name, handler, options);
    }

    /**
     * S'abonne à un topic
     * @param {string} topic - Nom du topic
     * @param {Function} handler - Handler pour les messages
     * @returns {Promise<void>}
     */
    async subscribe(topic, handler) {
        return this.topics.subscribe(topic, handler);
    }

    /**
     * Publie sur un topic
     * @param {string} topic - Nom du topic
     * @param {*} data - Données à publier
     * @returns {Promise<void>}
     */
    async publish(topic, data) {
        return this.topics.publish(topic, data);
    }

    /**
     * Envoie une requête à un service spécifique
     * @param {Object} target - Service cible
     * @param {string} method - Méthode à appeler
     * @param {*} data - Données de la requête
     * @returns {Promise<*>}
     */
    async request(target, method, data) {
        return this.requests.sendRequest(target, method, data);
    }

    /**
     * Envoie une notification à un service spécifique
     * @param {Object} target - Service cible
     * @param {string} type - Type de notification
     * @param {*} data - Données de la notification
     * @returns {Promise<void>}
     */
    async notify(target, type, data) {
        return this.requests.sendNotification(target, type, data);
    }

    /**
     * Recherche des services par capacité
     * @param {string} capability 
     * @returns {Promise<Array<ServiceInfo>>}
     */
    async findServicesByCapability(capability) {
        return this.discovery.findServicesByCapability(capability);
    }

    /**
     * Recherche un service par son nom
     * @param {string} name 
     * @returns {Promise<ServiceInfo>}
     */
    async findServiceByName(name) {
        return this.discovery.findServiceByName(name);
    }

    /**
     * Arrête proprement le service
     */
    async stop() {
        try {
            this.logger.info("Stopping service...");

            // Nettoyage des topics
            await this.topics.cleanup();

            // Déconnexion du broker
            await this.client.disconnect();

            this.ready = false;
            this.connected = false;
            this.identified = false;

            this.events.emit('stopped');
            this.logger.info("Service stopped");

        } catch (error) {
            this.logger.error("Error stopping service", error);
            throw error;
        }
    }

    /**
     * Validation des options
     * @private
     */
    #validateOptions() {
        const required = ['name', 'type', 'version', 'brokerUrl'];
        const missing = required.filter(field => !this.options[field]);

        if (missing.length) {
            throw new Error(`Missing required options: ${missing.join(', ')}`);
        }

        // Validation du format de version (semver)
        const semverRegex = /^\d+\.\d+\.\d+$/;
        if (!semverRegex.test(this.options.version)) {
            throw new Error(`Invalid version format: ${this.options.version}`);
        }
    }

    /**
     * Configuration des event handlers
     * @private
     */
    #setupEventHandlers() {
        // Events de connexion
        this.client.events.on('starling:open', () => {
            this.connected = true;
            this.events.emit('connected');
        });

        this.client.events.on('starling:close', () => {
            this.connected = false;
            this.events.emit('disconnected');
        });

        this.client.events.on('starling:error', (event) => {
            this.logger.error("Connection error", event.error);
            this.events.emit('error', event.error);
        });

        // Events du broker
        this.client.on('broker:event', (event) => {
            switch (event.type) {
                case 'service:joined':
                    this.discovery.handleServiceJoined(event.service);
                    break;
                case 'service:left':
                    this.discovery.handleServiceLeft(event.serviceId);
                    break;
            }
        });
    }

    /**
     * Configuration des méthodes du broker
     * @private
     */
    #setupBrokerMethods() {
        // Handler pour les requêtes entrantes
        this.client.method('request', async (context) => {
            return this.requests.handleIncomingRequest(context);
        });
    }
}

export default Satellite;