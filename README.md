# Decorator-based Dependency Injection

## Features

- Instance dependencies &mdash; Define service dependencies that already exist.
- Class dependencies &mdash; Define service dependency classes that are instantiated on demand.
- Optional dependencies &mdash; Define service dependencies that may be `null` if not in the container.
- *n*-ary dependencies &mdash; Define multiple dependencies that may be resolved for a single `ServiceIdentifier`.
- Lazy dependencies &mdash; Create proxies for services that may have circularities.
- Constructor dependencies &mdash; Define dependencies that are injected as constructor arguments.
- Field dependencies &mdash; Define dependencies that are injected as fields after an dependency has been instantiated.
- Hierarchical dependency trees &mdash; Seperate reusable services with longer lifetimes from transient services.

## Installation

```sh
npm install service-composition
```

## Usage

> NOTE: The following examples use TypeScript, but its possible to use `service-composition` in
> JavaScript (without decorators) as well. [See below](#using-in-javascript-commonjs) for examples

### Step 1 - Define Services

**ihelloservice.ts** 
```ts
import { ServiceIdentifier } from "service-composition";

const const IHelloService = ServiceIdentifier.create<IHelloService>("IHelloService");

export interface IHelloService {
    sayHello(name: string): string;
}
```

**itranslateservice.ts** 
```ts
import { ServiceIdentifier } from "service-composition";

const const ITranslateService = ServiceIdentifier.create<ITranslateService>("ITranslateService");

export interface ITranslateService {
    format(message: string, args: Record<string, any>): string;
}
```

### Step 2 - Define Implementations and Dependencies

**helloservice.ts**
```ts
import { IHelloService } from "./ihelloservice";
import { ITranslateService } from "./itranslateservice";

export class HelloService implements IHelloService {
    constructor(@ITranslateService private translate: ITranslateService) {
    }

    sayHello(name: str) {
        return this.translate.format("hello, {name}", { name });
    }
}
```

### Step 3 - Wire up Services

**app.ts**
```ts
import { ServiceCollection } from "service-composition";

// service interfaces
import { IHelloService } from "./ihelloservice";
import { ITranslateService } from "./itranslateservice";

// concrete services (or mock services for testing)
import { HelloService } from "./helloservice";

const serviceCollection = new ServiceCollection();

// define factories
serviceCollection.setClass(IHelloService, HelloService);

// define instances
serviceCollection.setInstance(ITranslateService, {
    format(message: string, args: Record<string, any>) {
        return message.replace(/\{([\w\d_$]+)\}/g, (_, key) => key in args ? args[key] : _);
    }
});

// create container
const serviceProvider = serviceCollection.createContainer();

// resolve dependencies and get instances
const helloService = serviceProvider.getService(IHelloService);
console.log(helloService.sayHello("Alice")); // prints: hello, Alice
```

### Using in JavaScript (commonjs)

**ihelloservice.js**
```js
const { ServiceIdentifier } = require("service-composition");

/** @type {ServiceIdentifier<IHelloService>} */
exports.IHelloService = ServiceIdentifier.create("IHelloService");

/**
 * @typedef IHelloService
 * @property {(name: string) => string} sayHello
 */
```

**itranslateservice.js**
```js
const { ServiceIdentifier } = require("service-composition");

/** @type {ServiceIdentifier<ITranslateService>} */
exports.ITranslateService = ServiceIdentifier.create("ITranslateService");

/**
 * @typedef ITranslateService
 * @property {(message: string, args: Record<string, any>) => string} format
 */
```

**helloservice.js**
```js
const { ITranslateService } = require("./itranslateservice.js")
class HelloService {
    /**
     * @param {import("./translateservice").ITranslateService} translate
     */
    constructor(translate) {
        this.translate = translate;
    }

    /**
     * @param {string} name
     */
    sayHello(name) {
        return this.translate.format("hello, {name}", { name });
    }
}

// Call decorator directly
ITranslateService(HelloService, undefined, /*parameterIndex*/ 0);
exports.HelloService = HelloService;
```

**app.js**
```js
const { ServiceCollection } = require("service-composition");

// service interfaces
const { IHelloService } = require("./ihelloservice");
const { ITranslateService } = require("./itranslateservice");

// concrete services (or mock services for testing)
const { HelloService } = require("./helloservice");

const serviceCollection = new ServiceCollection();

// define factories
serviceCollection.setClass(IHelloService, HelloService);

// define instances
serviceCollection.setInstance(ITranslateService, {
    format(message, args) {
        return message.replace(/\{([\w\d_$]+)\}/g, (_, key) => key in args ? args[key] : _);
    }
});

// create container
const serviceProvider = serviceCollection.createContainer();

// resolve dependencies and get instances
const helloService = serviceProvider.getService(IHelloService);
console.log(helloService.sayHello("Alice")); // prints: hello, Alice
```

## API Overview

- `interface ServiceIdentifier` &mdash; Identifies a service within the composition graph, and is a decorator that
  indicates the provided dependency is required.
    - `serviceName` &mdash; Gets the (optional) name of the service.
- `namespace ServiceIdentifier` &mdash; Methods used to get/create `ServiceIdentifier` instances.
    - `create(name?: string | symbol)` &mdash; Creates a unique service identifier, which can act as a
      parameter or field decorator.
- `function optional(id)` &mdash; A decorator that indicates the provided `ServiceIdentifier` is an optional dependency.
- `function many(id)` &mdash; A decorator that indicates the provided `ServiceIdentifier` is an *n*-ary dependency.
- `enum ServiceDependencyCardinality` &mdash; Describes the cardinality of a `ServiceDependency`:
  - `ZeroOrOne` &mdash; The dependency may have at most one service.
  - `ExactlyOne` &mdash; The dependency may have exactly one service.
  - `ZeroOrMore` &mdash; The dependency may have any number of services.
- `interface ServiceDependency` &mdash; Describes a dependency on a class.
  - `id` &mdash; The `ServiceIdentifier` that satisfies this dependency.
  - `parameterIndex` &mdash; The constructor parameter this dependency satisfies, if this describes a parameter.
  - `propertyName` &mdash; The name of the property (i.e., field) this dependency satisfies, if this describes a property.
  - `cardinality` &mdash; The cardinality of the dependency.
- `namespace ServiceDependency`:
  - `store(id, target, parameterIndex, cardinality)` &mdash; Stores information about a `ServiceDependency` for a constructor parameter.
  - `store(id, target, propertyName, cardinality)` &mdash; Stores information about a `ServiceDependency` for a property/field on an instance.
  - `get(target)` &mdash; Gets the `ServiceDependencies` for a class.
  - `isParameterDependency(dependency)` &mdash; Tests whether a `ServiceDependency` is for a constructor parameter.
  - `isPropertyDependency(dependency)` &mdash; Tests whether a `ServiceDependency` is for an instance field/property.
- `class ServiceDescriptor` &mdash; Describes how a service should be activated.
  - `static forClass(ctor, staticArguments, supportsDelayedInstantiation)` &mdash; Creates a `ClassDescriptor` for a class with the provided bound arguments and whether the result can be created as a `Proxy` for circular dependencies.
  - `static forInstance(value)` &mdash; Creates an `InstanceDescriptor` for a value.
  - `abstract activate(dependencies)` &mdash; Instantiates a service from the descriptor.
- `class ClassDescriptor` &mdash; A `ServiceDescriptor` describing a class.
  - `bind(...args)` &mdash; Binds additional static arguments to a `ClassDescriptor`.
  - `activate(dependencies)` &mdash; Instantiates a service from the descriptor.
- `class InstanceDescriptor` &mdash; A `ServiceDescriptor` describing an instance.
  - `activate(dependencies)` &mdash; Instantiates a service from the descriptor.
- `class ServiceCollection` &mdash; A catalog that maps a `ServiceIdentifier` to a `ServiceDescriptor`.
  - `new ServiceCollection(entries?)` &mdash; Creates a new `ServiceCollection`.
  - `get size()` &mdash; Returns the number of entries in the collection.
  - `has(id)` &mdash; Returns whether a `ServiceIdentifier` is present in the collection.
  - `get(id)` &mdash; Gets the `ServiceDescriptor` associated with a `ServiceIdentifier`.
  - `set(id, descriptor)` &mdash; Sets the `ServiceDescriptor` or an array of `ServiceDescriptor` objects to use for a `ServiceIdentifier`.
  - `setInstance(id, value)` &mdash; Shorthand for `col.set(id, ServiceDescriptor.forInstance(value))`.
  - `setClass(id, ctor, staticArguments, supportsDelayedInstantiation?)` &mdash; Shorthand for `col.set(id, ServiceDescriptor.forClass(ctor, staticArguments, supportsDelayedInstantiation))`.
  - `add(id, descriptor)` &mdash; Adds a `ServiceDescriptor` or an array of `ServiceDescriptor` objects to use for a `ServiceIdentifier` (similar to `col.set`, except it appends to the list of descriptors).
  - `addInstance(id, value)` &mdash; Shorthand for `col.add(id, ServiceDescriptor.forInstance(value))`.
  - `addClass(id, ctor, staticArguments, supportsDelayedInstantiation?)` &mdash; Shorthand for `col.add(id, ServiceDescriptor.forClass(ctor, staticArguments, supportsDelayedInstantiation))`.
  - `createContainer(parent?)` &mdash; Creates a `ServiceContainer` with an optional parent.
- `interface IServiceProvider` &mdash; Describes the shape of a service provider.
- `const IServiceProvider` &mdash; A `ServiceIdentifier` for an `IServiceProvider`.
- `class ServiceContainer` &mdash; Instantiates and holds references to services described in a `ServiceCollection`. Every `ServiceContainer` has a single `IServiceProvider` dependency of itself.
  - `new ServiceContainer(services)` &mdash; Creates a new `ServiceContainer` from a `ServiceCollection`.
  - `createInstance(descriptor, ...args)` &mdash; Instantiates a `ClassDescriptor` or class with the provided static arguments.
  - `hasService(serviceId)` &mdash; Tests whether the provided `ServiceIdentifier` can be instantiated by the container.
  - `getServices(serviceId)` &mdash; Instantiates services for the provided `ServiceIdentifier` (when not already instantiated) and returns an array of all instantiated services.
  - `getService(serviceId)` &mdash; Instantiates the service for the provided `ServiceIdentifier` (when not already instantiated) and returns it. Throws an error if there is not exactly one service for the provided `ServiceIdentifier`.
  - `tryGetService(serviceId)` &mdash; Instantiates the service for the provided `ServiceIdentifier` (when not already instantiated) and returns it if it was defined. Throws an error if there is more than one service for the provided `ServiceIdentifier`.
  - `createChild(services)` &mdash; Creates a child container for this container's services and the provided `ServiceCollection`.

## Dependencies

This package depends on the following packages at runtime:
- `@esfx/iter-fn` - For enhanced iteration.
- `@esfx/lazy` - For lazy initialization of classes.
- `graphmodel` - For managing the composition graph.
- `tslib` - For TypeScript runtime helpers.

## License

This package is licensed under the [MIT License](./LICENSE).

## Third Party License Notice

This package is partially based on the dependency injection system used by VS Code, but with
substantial changes in implementation. Please review [THIRD_PARTY_NOTICES](./THIRD_PARTY_NOTICES)
for more information.
