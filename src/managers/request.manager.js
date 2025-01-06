// src/managers/request.manager.js

/**
 * Gère les requêtes et notifications entre services
 */
export class RequestManager {
    constructor(service) {
        this.service = service;
        this.methods = new Map();
        this.pendingRequests = new Map();
        this.defaultTimeout = 30000; // 30 secondes
    }

    /**
     * Enregistre une méthode pouvant être appelée par d'autres services
     * @param {string} name - Nom de la méthode
     * @param {Function} handler - Handler de la méthode
     * @param {Object} options - Options de la méthode
     */
    registerMethod(name, handler, options = {}) {
        if (this.methods.has(name)) {
            throw new Error(`Method ${name} already registered`);
        }

        this.methods.set(name, {
            handler,
            options: {
                timeout: this.defaultTimeout,
                ...options
            }
        });

        this.service.logger.debug(`Registered method: ${name}`);
    }

    /**
     * Désenregistre une méthode
     * @param {string} name - Nom de la méthode
     */
    unregisterMethod(name) {
        if (this.methods.delete(name)) {
            this.service.logger.debug(`Unregistered method: ${name}`);
        }
    }

    /**
     * Envoie une requête à un service
     * @param {Object} target - Service cible
     * @param {string} method - Méthode à appeler
     * @param {*} data - Données de la requête
     * @param {Object} options - Options de la requête
     * @returns {Promise<*>}
     */
    async sendRequest(target, method, data, options = {}) {
        try {
            const response = await this.service.client.request('broker:request', {
                target,
                method,
                data,
                timeout: options.timeout || this.defaultTimeout
            });

            return response;

        } catch (error) {
            this.service.logger.error(`Failed to send request: ${method}`, error);
            throw error;
        }
    }

    /**
     * Envoie une notification à un service
     * @param {Object} target - Service cible
     * @param {string} type - Type de notification
     * @param {*} data - Données de la notification
     * @returns {Promise<void>}
     */
    async sendNotification(target, type, data) {
        try {
            await this.service.client.request('broker:notify', {
                target,
                type,
                data
            });

            this.service.logger.debug(`Sent notification: ${type}`, {
                target,
                data
            });

        } catch (error) {
            this.service.logger.error(`Failed to send notification: ${type}`, error);
            throw error;
        }
    }

    /**
     * Gère une requête entrante
     * @param {import('@killiandvcz/starling').RequestContext} context 
     */
    async handleIncomingRequest(context) {
        const { method, payload } = context;

        try {
            const methodInfo = this.methods.get(method);
            if (!methodInfo) {
                throw new Error(`Method ${method} not found`);
            }

            // Exécution de la méthode avec timeout
            const result = await Promise.race([
                methodInfo.handler(payload, context),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Method timeout')), 
                    methodInfo.options.timeout)
                )
            ]);

            context.success(result);

        } catch (error) {
            this.service.logger.error(`Error handling request: ${method}`, error);
            context.error('METHOD_ERROR', error.message);
        }
    }

    /**
     * Nettoie les requêtes en attente
     */
    cleanup() {
        for (const request of this.pendingRequests.values()) {
            request.reject(new Error('Service stopping'));
        }
        this.pendingRequests.clear();
        this.methods.clear();
    }
}