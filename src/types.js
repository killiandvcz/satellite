// src/types.js

/**
 * @typedef {Object} NodeServiceOptions
 * @property {string} name - Nom du service
 * @property {string} type - Type du service
 * @property {string[]} capabilities - Capacités du service
 * @property {string} version - Version du service (semver)
 * @property {Object} metadata - Métadonnées additionnelles
 * @property {string} brokerUrl - URL du broker
 * @property {boolean} [reconnect=true] - Reconnexion automatique
 * @property {number} [reconnectDelay=1000] - Délai de reconnexion en ms
 * @property {number} [maxReconnectAttempts=5] - Nombre maximum de tentatives
 * @property {Object} [logger] - Options de logging
 */

/**
 * @typedef {Object} ServiceInfo
 * @property {string} id - ID du service
 * @property {string} name - Nom du service
 * @property {string} type - Type du service
 * @property {string[]} capabilities - Capacités du service
 * @property {Object} metadata - Métadonnées du service
 */

/**
 * @typedef {Object} TopicMessage
 * @property {string} topic - Nom du topic
 * @property {*} data - Données du message
 * @property {Object} metadata - Métadonnées du message
 * @property {Object} metadata.publisher - Informations sur le publisher
 * @property {string} metadata.publisher.id - ID du service publisher
 * @property {string} metadata.publisher.name - Nom du service publisher
 * @property {number} metadata.timestamp - Timestamp du message
 */

/**
 * @typedef {Object} RequestOptions
 * @property {number} [timeout=30000] - Timeout de la requête en ms
 * @property {boolean} [retry=true] - Retry automatique
 */

/**
 * @typedef {Object} MethodOptions
 * @property {number} [timeout=30000] - Timeout de la méthode en ms
 */

/**
 * @typedef {Object} RequestContext
 * @property {*} payload - Données de la requête
 * @property {Function} success - Function pour répondre avec succès
 * @property {Function} error - Function pour répondre avec erreur
 * @property {Object} metadata - Métadonnées de la requête
 */

/**
 * @callback RequestHandler
 * @param {*} payload - Données de la requête
 * @param {RequestContext} context - Contexte de la requête
 * @returns {Promise<*>}
 */

/**
 * @callback TopicHandler
 * @param {*} data - Données du message
 * @param {TopicMessage} message - Message complet
 * @returns {Promise<void>}
 */

export const Types = {};  // Namespace vide pour JSDoc