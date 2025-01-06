# @killiandvcz/satellite 🛰️

A powerful and elegant service abstraction for the Helios broker system. Satellite provides a complete solution for building distributed systems with seamless service-to-service communication, pub/sub patterns, and service discovery.

[![npm version](https://img.shields.io/npm/v/@killiandvcz/satellite.svg)](https://www.npmjs.com/package/@killiandvcz/satellite)
[![License](https://img.shields.io/npm/l/@killiandvcz/satellite.svg)](https://github.com/killiandvcz/satellite/blob/main/LICENSE)

## Features 🚀

- **Seamless Broker Integration**: Built on top of Starling for robust WebSocket communication
- **Service Discovery**: Automatic service registration and discovery
- **Request/Response Pattern**: Easy-to-use method registration and invocation
- **Pub/Sub System**: Topic-based publish/subscribe messaging
- **State Management**: Built-in service state and metrics tracking
- **Automatic Reconnection**: Handles connection drops and recovery
- **Type Safety**: Complete TypeScript definitions
- **Extensible**: Modular design for easy customization

## Installation 📦

```bash
# Using bun
bun add @killiandvcz/satellite

# Using npm
npm install @killiandvcz/satellite

# Using yarn
yarn add @killiandvcz/satellite
```

## Quick Start 🌟

```javascript
import { Satellite } from '@killiandvcz/satellite';

// Create a new service
const service = new Satellite({
    name: 'user-service',
    type: 'core',
    version: '1.0.0',
    capabilities: ['users.read', 'users.write'],
    brokerUrl: 'ws://localhost:3000'
});

// Register a method
service.method('users.get', async (payload, context) => {
    const { userId } = payload;
    return { id: userId, name: 'John Doe' };
});

// Start the service
await service.start();
```

## Core Concepts 🧠

### Service Definition

A service in Satellite is defined by its core attributes:
- `name`: Unique service identifier
- `type`: Service category (e.g., 'core', 'worker', 'api')
- `capabilities`: Array of service capabilities
- `version`: Semantic version number
- `metadata`: Additional service information

### Communication Patterns

#### Method Registration and Invocation
```javascript
// Register a method
service.method('users.create', async (payload, context) => {
    const { username, email } = payload;
    // Create user logic
    return { userId: 'new-id' };
});

// Call a method on another service
const mailService = await service.findServiceByCapability('mail.send');
await service.request(mailService, 'mail.send', {
    to: 'user@example.com',
    subject: 'Welcome!'
});
```

#### Pub/Sub Messaging
```javascript
// Subscribe to a topic
await service.subscribe('users.created', async (data, message) => {
    console.log(`New user: ${data.userId}`);
});

// Publish to a topic
await service.publish('users.created', {
    userId: 'user123',
    email: 'user@example.com'
});
```

### Service Discovery

Satellite provides multiple ways to discover other services:

```javascript
// Find by capability
const services = await service.findServicesByCapability('mail.send');

// Find by name
const authService = await service.findServiceByName('auth-service');

// Find by type
const workers = await service.discovery.findServicesByType('worker');
```

## Advanced Usage 🔧

### State Management

Monitor your service's health and metrics:

```javascript
// Get current state
const state = service.state.getState();

// Get historical metrics
const stats = service.state.getStats(3600000); // Last hour

// Listen for state changes
service.events.on('status:changed', (event) => {
    console.log(`Service status: ${event.current}`);
});
```

### Custom Method Options

Configure method-specific behavior:

```javascript
service.method('heavy.operation', handler, {
    timeout: 60000, // 60 second timeout
    retry: true,    // Enable retry on failure
});
```

### Topic Patterns

Use wildcards in topic subscriptions:

```javascript
// Subscribe to all user events
await service.subscribe('users.*', handler);

// Subscribe to all events in a category
await service.subscribe('audit.users.#', handler);
```

## Events 📡

Satellite emits various events you can listen to:

```javascript
// Connection events
service.events.on('connected', () => {});
service.events.on('disconnected', () => {});

// Service discovery events
service.events.on('service:discovered', (service) => {});
service.events.on('service:lost', (service) => {});

// State events
service.events.on('status:changed', (status) => {});
```

## Configuration Options ⚙️

```javascript
const service = new Satellite({
    name: 'my-service',
    type: 'worker',
    version: '1.0.0',
    capabilities: ['task.process'],
    brokerUrl: 'ws://localhost:3000',
    
    // Connection options
    reconnect: true,
    reconnectDelay: 1000,
    maxReconnectAttempts: 5,
    
    // Logging options
    logger: {
        level: 'info',
        enableColors: true,
        enableEmoji: true
    },
    
    // Additional metadata
    metadata: {
        region: 'eu-west',
        environment: 'production'
    }
});
```

## Error Handling 🚨

Satellite provides comprehensive error handling:

```javascript
// Global error handling
service.events.on('error', (error) => {
    console.error('Service error:', error);
});

// Method-specific error handling
service.method('users.create', async (payload, context) => {
    try {
        // Method logic
    } catch (error) {
        context.error('USER_CREATE_FAILED', error.message);
    }
});
```

## Best Practices 📚

1. **Naming Conventions**: Use namespaced method names (e.g., 'users.create', 'auth.login')
2. **Error Handling**: Always include error handling in method implementations
3. **State Management**: Monitor service health using the state manager
4. **Cleanup**: Properly stop services when shutting down
5. **Versioning**: Follow semantic versioning for service versions

## Contributing 🤝

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support 💪

If you need help or have any questions:
- Open an issue on [GitHub](https://github.com/killiandvcz/satellite/issues)
- Contact the maintainers at [support@killiandvcz.com](mailto:support@killiandvcz.com)

## Acknowledgments 🙏

Special thanks to:
- The Helios Broker team
- The Starling WebSocket library
- All contributors and users of Satellite