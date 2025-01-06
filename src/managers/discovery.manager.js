// src/managers/discovery.manager.js

/**
 * @typedef {Object} ServiceInfo
 * @property {string} id - ID du service
 * @property {string} name - Nom du service
 * @property {string} type - Type du service
 * @property {string[]} capabilities - Capacités du service
 * @property {Object} metadata - Métadonnées du service
 */

/**
 * Gère la découverte des services
 */
export class DiscoveryManager {
    constructor(service) {
        this.service = service;
        
        /**
         * Cache des services connus
         * @type {Map<string, ServiceInfo>}
         */
        this.services = new Map();
        
        /**
         * Index des services par capacité
         * @type {Map<string, Set<string>>}
         */
        this.servicesByCapability = new Map();
        
        /**
         * Index des services par nom
         * @type {Map<string, string>}
         */
        this.servicesByName = new Map();

        // Configuration du nettoyage périodique
        setInterval(this.cleanup.bind(this), 300000); // 5 minutes
    }

    /**
     * Gère l'arrivée d'un nouveau service
     * @param {ServiceInfo} serviceInfo 
     */
    handleServiceJoined(serviceInfo) {
        // Ajout aux index
        this.services.set(serviceInfo.id, serviceInfo);
        this.servicesByName.set(serviceInfo.name, serviceInfo.id);

        // Indexation des capacités
        for (const capability of serviceInfo.capabilities) {
            if (!this.servicesByCapability.has(capability)) {
                this.servicesByCapability.set(capability, new Set());
            }
            this.servicesByCapability.get(capability).add(serviceInfo.id);
        }

        this.service.events.emit('service:discovered', serviceInfo);
        this.service.logger.debug(`Service discovered: ${serviceInfo.name}`, serviceInfo);
    }

    /**
     * Gère le départ d'un service
     * @param {string} serviceId 
     */
    handleServiceLeft(serviceId) {
        const serviceInfo = this.services.get(serviceId);
        if (serviceInfo) {
            // Retrait des index
            this.services.delete(serviceId);
            this.servicesByName.delete(serviceInfo.name);

            // Retrait des index de capacités
            for (const capability of serviceInfo.capabilities) {
                const services = this.servicesByCapability.get(capability);
                if (services) {
                    services.delete(serviceId);
                    if (services.size === 0) {
                        this.servicesByCapability.delete(capability);
                    }
                }
            }

            this.service.events.emit('service:lost', serviceInfo);
            this.service.logger.debug(`Service lost: ${serviceInfo.name}`, serviceInfo);
        }
    }

    /**
     * Recherche des services par capacité
     * @param {string} capability 
     * @returns {ServiceInfo[]}
     */
    findServicesByCapability(capability) {
        const serviceIds = this.servicesByCapability.get(capability) || new Set();
        return Array.from(serviceIds)
            .map(id => this.services.get(id))
            .filter(Boolean);
    }

    /**
     * Recherche un service par son nom
     * @param {string} name 
     * @returns {ServiceInfo|undefined}
     */
    findServiceByName(name) {
        const serviceId = this.servicesByName.get(name);
        if (serviceId) {
            return this.services.get(serviceId);
        }
    }

    /**
     * Recherche un service par son ID
     * @param {string} id 
     * @returns {ServiceInfo|undefined}
     */
    findServiceById(id) {
        return this.services.get(id);
    }

    /**
     * Liste tous les services connus
     * @returns {ServiceInfo[]}
     */
    listServices() {
        return Array.from(this.services.values());
    }

    /**
     * Liste toutes les capacités connues
     * @returns {string[]}
     */
    listCapabilities() {
        return Array.from(this.servicesByCapability.keys());
    }

    /**
     * Récupère des statistiques sur la découverte
     */
    getStats() {
        return {
            totalServices: this.services.size,
            servicesByType: Array.from(this.services.values()).reduce((acc, service) => {
                acc[service.type] = (acc[service.type] || 0) + 1;
                return acc;
            }, {}),
            capabilities: Object.fromEntries(
                Array.from(this.servicesByCapability.entries())
                    .map(([cap, services]) => [cap, services.size])
            )
        };
    }

    /**
     * Nettoie le cache des services inactifs
     * @private
     */
    cleanup() {
        // Pour l'instant, pas de nettoyage actif
        // On pourrait ajouter une logique de TTL ou de heartbeat plus tard
    }
}