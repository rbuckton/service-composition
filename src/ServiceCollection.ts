/*!
 * Copyright (c) 2021 Ron Buckton
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * 
 * THIRD PARTY LICENSE NOTICE:
 * 
 * "ServiceCollection" is derived from the definition of "ServiceCollection" 
 * and related components in vscode, located at:
 * 
 *   https://github.com/microsoft/vscode/blob/5d80c30e5b6ce8b2f5336ed55ad043490b0b818f/src/vs/platform/instantiation/common/serviceCollection.ts
 * 
 * vscode is licensed under the MIT license:
 * 
 *   MIT License
 *
 *   Copyright (c) 2015 - present Microsoft Corporation
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a copy
 *   of this software and associated documentation files (the "Software"), to deal
 *   in the Software without restriction, including without limitation the rights
 *   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *   copies of the Software, and to permit persons to whom the Software is
 *   furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in all
 *   copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *   SOFTWARE.
 */

import { ServiceIdentifier } from "./ServiceIdentifier";
import { ServiceDescriptor } from "./ServiceDescriptor";
import { Constructor } from "./types";
import { ServiceContainer } from "./ServiceContainer";

export class ServiceCollection {
    private _entries = new Map<ServiceIdentifier<any>, ServiceDescriptor<any>[]>();

    /**
     * Creates a new `ServiceCollection`.
     * @param entries An optional `Iterable` of entries to add to the collection.
     */
    constructor(entries?: Iterable<[ServiceIdentifier<any>, ServiceDescriptor<any>]>) {
        if (entries) {
            for (const [id, service] of entries) {
                this.add(id, service);
            }
        }
    }

    /**
     * Gets the number of `ServiceIdentifiers` registered in the collection.
     */
    get size() {
        return this._entries.size;
    }

    /**
     * Returns `true` if the collection contains a `ServiceDescriptor` for the provided `ServiceIdentifier`.
     * @param id The identifier for the service.
     */
    has<T>(id: ServiceIdentifier<T>): boolean {
        return this._entries.has(id);
    }

    /**
     * Gets an array of the `ServiceDescriptor` objects registered for the provided `ServiceIdentifier`.
     * @param id The identifier for the service.
     */
    get<T>(id: ServiceIdentifier<T>): ServiceDescriptor<T>[] | undefined {
        return this._entries.get(id)?.slice();
    }

    /**
     * Sets one or more `ServiceDescriptor` objects to be used for a `ServiceIdentifier`.
     * @param id The identifier for the service.
     * @param descriptor The descriptor, or an array of descriptors, for the service.
     */
    set<T>(id: ServiceIdentifier<T>, descriptor: ServiceDescriptor<T> | readonly ServiceDescriptor<T>[]) {
        const descriptors = Array.isArray(descriptor) ? descriptor.slice() : [descriptor];
        if (descriptors.length === 0) throw new TypeError("An array of descriptors must not be empty.");
        this._entries.set(id, descriptors);
        return this;
    }

    /**
     * Sets an instance value to use for a `ServiceIdentifier`.
     * 
     * This is shorthand for `coll.set(id, ServiceDescriptor.forInstance(value))`.
     * 
     * @param id The identifier for the service.
     * @param value The value for the service.
     */
    setInstance<T>(id: ServiceIdentifier<T>, value: T) {
        return this.set(id, ServiceDescriptor.forInstance(value));
    }

    /**
     * Sets a factory callback to use for a `ServiceIdentifier`.
     * 
     * This is shorthand for `coll.set(id, ServiceDescriptor.forFactory(value))`.
     * 
     * @param id The identifier for the service.
     * @param factory The factory callback for the service.
     */
    setFactory<T>(id: ServiceIdentifier<T>, factory: () => T) {
        return this.set(id, ServiceDescriptor.forFactory(factory));
    }

    /**
     * Sets a class constructor to use for a `ServiceIdentifier`.
     * 
     * This is shorthand for `coll.set(id, ServiceDescriptor.forClass(ctor, staticArguments, supportsDelayedInstantiation))`.
     * 
     * @param id The identifier for the service.
     * @param ctor The class constructor.
     * @param staticArguments Any leading arguments to be supplied to the constructor that should not come from injected dependencies.
     * @param supportsDelayedInstantiation Indicates whether the service should be created as a `Proxy` to support circular dependencies in constructor parameters.
     */
    setClass<T, S extends unknown[], A extends unknown[]>(id: ServiceIdentifier<T>, ctor: Constructor<[...S, ...A], T>, staticArguments: S, supportsDelayedInstantiation?: boolean): this;
    /**
     * Sets a class constructor to use for a `ServiceIdentifier`.
     * 
     * This is shorthand for `coll.set(id, ServiceDescriptor.forClass(ctor, staticArguments, supportsDelayedInstantiation))`.
     * 
     * @param id The identifier for the service.
     * @param ctor The class constructor.
     * @param staticArguments Any leading arguments to be supplied to the constructor that should not come from injected dependencies.
     * @param supportsDelayedInstantiation Indicates whether the service should be created as a `Proxy` to support circular dependencies in constructor parameters.
     */
    setClass<T, A extends unknown[]>(id: ServiceIdentifier<T>, ctor: Constructor<[...A], T>, staticArguments?: undefined, supportsDelayedInstantiation?: boolean): this;
    setClass<T, S extends unknown[], A extends unknown[]>(id: ServiceIdentifier<T>, ctor: Constructor<[...S, ...A], T>, staticArguments: S, supportsDelayedInstantiation?: boolean) {
        return this.set(id, ServiceDescriptor.forClass(ctor, staticArguments, supportsDelayedInstantiation));
    }

    /**
     * Adds one or more `ServiceDescriptor` objects to be used for a `ServiceIdentifier`.
     * 
     * NOTE: This does not replace any existing services for the provided `id`, instead it appends
     * them to the list of services. This can affect service cardinality if a dependency expects
     * only a single service to be injected.
     * 
     * @param id The identifier for the service.
     * @param descriptor The descriptor, or an array of descriptors, for the service.
     */
    add<T>(id: ServiceIdentifier<T>, descriptor: ServiceDescriptor<T> | readonly ServiceDescriptor<T>[]) {
        let descriptors = this._entries.get(id);
        if (!descriptors) this._entries.set(id, descriptors = []);
        if ((Array.isArray as (x: unknown) => x is readonly any[])(descriptor)) {
            for (const item of descriptor) {
                descriptors.push(item);
            }
        }
        else {
            descriptors.push(descriptor);
        }
        return this;
    }

    /**
     * Adds an instance value to use for a `ServiceIdentifier`.
     * 
     * This is shorthand for `coll.add(id, ServiceDescriptor.forInstance(value))`.
     * 
     * NOTE: This does not replace any existing services for the provided `id`, instead it appends
     * them to the list of services. This can affect service cardinality if a dependency expects
     * only a single service to be injected.
     * 
     * @param id The identifier for the service.
     * @param value The value for the service.
     */
    addInstance<T>(id: ServiceIdentifier<T>, value: T) {
        return this.add(id, ServiceDescriptor.forInstance(value));
    }

    /**
     * Adds a factory callback to use for a `ServiceIdentifier`.
     * 
     * This is shorthand for `coll.add(id, ServiceDescriptor.forFactory(value))`.
     * 
     * NOTE: This does not replace any existing services for the provided `id`, instead it appends
     * them to the list of services. This can affect service cardinality if a dependency expects
     * only a single service to be injected.
     * 
     * @param id The identifier for the service.
     * @param factory The factory callback for the service.
     */
    addFactory<T>(id: ServiceIdentifier<T>, factory: () => T) {
        return this.add(id, ServiceDescriptor.forFactory(factory));
    }

    /**
     * Adds a class constructor to use for a `ServiceIdentifier`.
     * 
     * This is shorthand for `coll.add(id, ServiceDescriptor.forClass(ctor, staticArguments, supportsDelayedInstantiation))`.
     * 
     * NOTE: This does not replace any existing services for the provided `id`, instead it appends
     * them to the list of services. This can affect service cardinality if a dependency expects
     * only a single service to be injected.
     * 
     * @param id The identifier for the service.
     * @param ctor The class constructor.
     * @param staticArguments Any leading arguments to be supplied to the constructor that should not come from injected dependencies.
     * @param supportsDelayedInstantiation Indicates whether the service should be created as a `Proxy` to support circular dependencies in constructor parameters.
     */
    addClass<T, S extends unknown[], A extends unknown[]>(id: ServiceIdentifier<T>, ctor: Constructor<[...S, ...A], T>, staticArguments: S, supportsDelayedInstantiation?: boolean): this;
    /**
     * Adds a class constructor to use for a `ServiceIdentifier`.
     * 
     * This is shorthand for `coll.add(id, ServiceDescriptor.forClass(ctor, staticArguments, supportsDelayedInstantiation))`.
     * 
     * NOTE: This does not replace any existing services for the provided `id`, instead it appends
     * them to the list of services. This can affect service cardinality if a dependency expects
     * only a single service to be injected.
     * 
     * @param id The identifier for the service.
     * @param ctor The class constructor.
     * @param staticArguments Any leading arguments to be supplied to the constructor that should not come from injected dependencies.
     * @param supportsDelayedInstantiation Indicates whether the service should be created as a `Proxy` to support circular dependencies in constructor parameters.
     */
    addClass<T, A extends unknown[]>(id: ServiceIdentifier<T>, ctor: Constructor<[...A], T>, staticArguments?: undefined, supportsDelayedInstantiation?: boolean): this;
    addClass<T, S extends unknown[], A extends unknown[]>(id: ServiceIdentifier<T>, ctor: Constructor<[...S, ...A], T>, staticArguments: S, supportsDelayedInstantiation?: boolean) {
        return this.add(id, ServiceDescriptor.forClass(ctor, staticArguments, supportsDelayedInstantiation));
    }

    /**
     * Creates a `ServiceContainer` from this collection.
     * @param parent An optional parent container.
     */
    createContainer(parent?: ServiceContainer) {
        return parent ? parent.createChild(this) : new ServiceContainer(this);
    }

    forEach<This>(callback: <T>(this: This, id: ServiceIdentifier<T>, descriptors: ServiceDescriptor<T>, collection: ServiceCollection) => void, thisArg: This): void;
    forEach(callback: <T>(id: ServiceIdentifier<T>, descriptors: ServiceDescriptor<T>, collection: ServiceCollection) => void): void;
    forEach(callback: <T>(id: ServiceIdentifier<T>, descriptors: ServiceDescriptor<T>, collection: ServiceCollection) => void, thisArg?: any): void {
        for (const [id, values] of this._entries) {
            for (const value of values) {
                callback.call(thisArg, id, value, this);
            }
        }
    }

    keys(): IterableIterator<ServiceIdentifier<any>> {
        return this._entries.keys();
    }

    * entries(): IterableIterator<[ServiceIdentifier<any>, ServiceDescriptor<any>]> {
        for (const [id, values] of this._entries) {
            for (const value of values) {
                yield [id, value];
            }
        }
    }

    [Symbol.iterator](): IterableIterator<[ServiceIdentifier<any>, ServiceDescriptor<any>]> {
        return this.entries();
    }
}