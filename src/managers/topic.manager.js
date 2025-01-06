// src/managers/topic.manager.js

/**
 * Gère les publications et abonnements aux topics
 */
export class TopicManager {
    constructor(service) {
        this.service = service;
        this.subscriptions = new Map();
        this.handlers = new Map();
        
        // Setup des handlers pour les messages entrants
        this.#setupMessageHandlers();
    }
    
    /**
     * S'abonne à un topic
     * @param {string} topic - Nom du topic
     * @param {Function} handler - Handler pour les messages
     * @returns {Promise<void>}
     */
    async subscribe(topic, handler) {
        try {
            // Envoi de la requête d'abonnement au broker
            await this.service.client.request('broker:subscribe', {
                topic
            });
            
            // Enregistrement du handler
            if (!this.handlers.has(topic)) {
                this.handlers.set(topic, new Set());
            }
            this.handlers.get(topic).add(handler);
            
            // Enregistrement de la souscription
            this.subscriptions.set(topic, {
                timestamp: Date.now(),
                handler
            });
            
            this.service.logger.debug(`Subscribed to topic: ${topic}`);
            
        } catch (error) {
            this.service.logger.error(`Failed to subscribe to topic: ${topic}`, error);
            throw error;
        }
    }
    
    /**
     * Se désabonne d'un topic
     * @param {string} topic - Nom du topic
     * @param {Function} handler - Handler spécifique à retirer (optionnel)
     * @returns {Promise<void>}
     */
    async unsubscribe(topic, handler = null) {
        try {
            if (handler) {
                // Retrait d'un handler spécifique
                const handlers = this.handlers.get(topic);
                if (handlers) {
                    handlers.delete(handler);
                    if (handlers.size === 0) {
                        await this.#unsubscribeFromBroker(topic);
                    }
                }
            } else {
                // Retrait de tous les handlers
                await this.#unsubscribeFromBroker(topic);
            }
            
            this.service.logger.debug(`Unsubscribed from topic: ${topic}`);
            
        } catch (error) {
            this.service.logger.error(`Failed to unsubscribe from topic: ${topic}`, error);
            throw error;
        }
    }
    
    /**
     * Publie sur un topic
     * @param {string} topic - Nom du topic
     * @param {*} data - Données à publier
     * @returns {Promise<void>}
     */
    async publish(topic, data) {
        try {
            await this.service.client.request('broker:publish', {
                topic,
                data
            });
            
            this.service.logger.debug(`Published to topic: ${topic}`, { data });
            
        } catch (error) {
            this.service.logger.error(`Failed to publish to topic: ${topic}`, error);
            throw error;
        }
    }
    
    /**
     * Nettoie toutes les souscriptions
     * @returns {Promise<void>}
     */
    async cleanup() {
        const topics = Array.from(this.subscriptions.keys());
        for (const topic of topics) {
            await this.unsubscribe(topic);
        }
    }
    
    /**
     * Se désabonne d'un topic auprès du broker
     * @private
     */
    async #unsubscribeFromBroker(topic) {
        try {
            await this.service.client.request('broker:unsubscribe', {
                topic
            });
            
            this.handlers.delete(topic);
            this.subscriptions.delete(topic);
            
        } catch (error) {
            this.service.logger.error(`Failed to unsubscribe from broker for topic: ${topic}`, error);
            throw error;
        }
    }
    
    /**
     * Configure les handlers pour les messages entrants
     * @private
     */
    #setupMessageHandlers() {
        this.service.client.on('broker:message', async (message) => {
            try {
                const handlers = this.handlers.get(message.topic);
                if (handlers) {
                    for (const handler of handlers) {
                        try {
                            await handler(message.data, {
                                topic: message.topic,
                                timestamp: message.metadata.timestamp,
                                publisher: message.metadata.publisher
                            });
                        } catch (error) {
                            this.service.logger.error(`Error in topic handler for ${message.topic}`, error);
                        }
                    }
                }
            } catch (error) {
                this.service.logger.error('Error handling incoming message', error);
            }
        });
    }
}