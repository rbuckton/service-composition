/*!
 * Copyright (c) 2021 Ron Buckton
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * 
 * THIRD PARTY LICENSE NOTICE:
 * 
 * "ServiceContainer" is derived from the implementation of "InstantiationService" 
 * and related components in vscode, located at:
 * 
 *   https://github.com/microsoft/vscode/blob/5d80c30e5b6ce8b2f5336ed55ad043490b0b818f/src/vs/platform/instantiation/common/instantiationService.ts
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

import { some } from "@esfx/iter-fn";
import { Lazy } from "@esfx/lazy";
import { Disposable } from "@esfx/disposable";
import { Graph, GraphNode, GraphSchema, GraphLink } from "graphmodel";
import { ServiceCollection } from "./ServiceCollection";
import { ServiceIdentifier } from "./ServiceIdentifier";
import { IServiceProvider } from "./IServiceProvider";
import { ServiceDependency, ServiceDependencyCardinality, PropertyServiceDependency, ParameterServiceDependency } from "./ServiceDependency";
import { ServiceDescriptor, ClassDescriptor } from "./ServiceDescriptor";
import { IScopedServiceProvider } from "./IScopedServiceProvider";
import type { Constructor } from "./types";

const compositionGraphSchema = new GraphSchema("CompositionGraph");
const categoryUnsatisfiedParameter = compositionGraphSchema.categories.getOrCreate("parameter");
const categoryUnboundProperty = compositionGraphSchema.categories.getOrCreate("property");
const categoryImmutable = compositionGraphSchema.categories.getOrCreate("immutable");
const categoryUninstantiated = compositionGraphSchema.categories.getOrCreate("uninstantiated");
const propGraphObject = compositionGraphSchema.properties.getOrCreate<CompositionGraph>("compositionGraphObject");
const propNodeObject = compositionGraphSchema.properties.getOrCreate<CompositionGraphNode>("compositionGraphNodeObject");
const propLinkObject = compositionGraphSchema.properties.getOrCreate<CompositionGraphLink>("compositionGraphLinkObject");
const propNodeId = compositionGraphSchema.properties.getOrCreate<ServiceIdentifier<any>>("id");
const propNodeDescriptors = compositionGraphSchema.properties.getOrCreate<ServiceDescriptor<unknown>[]>("descriptors");
const propNodeContainer = compositionGraphSchema.properties.getOrCreate<ServiceContainer>("container");
const propNodePendingInstances = compositionGraphSchema.properties.getOrCreate<Set<number>>("pendingInstances");
const propNodeInstances = compositionGraphSchema.properties.getOrCreate<unknown[]>("instances");
const propLinkDependency = compositionGraphSchema.properties.getOrCreate<ServiceDependency>("dependency");

const emptyArrayId = ServiceIdentifier.create<[]>("[]");

export class ServiceContainer implements IScopedServiceProvider {
    private _instances = new Map<ServiceIdentifier<any>, { remaining: Set<number>, values: unknown[] }>();
    private _disposables: [Disposable, () => void][] = [];
    private _services: ServiceCollection;
    private _parent?: ServiceContainer;
    private _isDisposed = false;

    constructor(services: ServiceCollection) {
        this._services = new ServiceCollection(services);
        this._services.set(IServiceProvider, ServiceDescriptor.forInstance(this));
        this._services.set(IScopedServiceProvider, ServiceDescriptor.forInstance(this));
    }

    /**
     * Create an instance from a `ClassDescriptor` using the provided static arguments.
     * @param descriptor A `ClassDescriptor` for a service.
     * @param args Any required arguments for the service that are not injected.
     */
    createInstance<S extends unknown[], A extends unknown[], T>(descriptor: ClassDescriptor<S, A, T>, ...args: A): T;
    /**
     * Create an instance from a `ClassDescriptor` using the provided static arguments.
     * @param descriptor A `ClassDescriptor` for a service.
     * @param args Any required arguments for the service that are not injected.
     */
    createInstance<A extends unknown[], T>(descriptor: ClassDescriptor<unknown[], A, T>, ...args: A): T;
    /**
     * Create an instance from a class constructor using the provided static arguments.
     * @param descriptor The class for a service.
     * @param args Any required arguments for the service that are not injected.
     */
    createInstance<A extends unknown[], T>(ctor: Constructor<A, T>, ...args: A): T;
    createInstance(ctorOrDescriptor: any, ...args: any[]) {
        this._throwIfDisposed();
        const descriptor =
            ctorOrDescriptor instanceof ClassDescriptor ?
            args.length ? new ClassDescriptor(ctorOrDescriptor.ctor, [...ctorOrDescriptor.staticArguments, ...args]) : ctorOrDescriptor :
            new ClassDescriptor(ctorOrDescriptor, args);
        return this._createInstance(descriptor);
    }

    /**
     * Returns `true` if the container contains a descriptor for the provided `ServiceIdentifier`.
     */
    hasService(serviceId: ServiceIdentifier<any>): boolean {
        this._throwIfDisposed();
        if (this._services.has(serviceId)) return true;
        return this._parent?.hasService(serviceId) ?? false;
    }

    /**
     * Gets the services for the provided `ServiceIdentifier`.
     */
    getServices<T>(serviceId: ServiceIdentifier<T>): T[] {
        this._throwIfDisposed();
        if (!this.hasService(serviceId)) throw new Error(`Unknown service ${serviceId.toString({ quoted: true })}.`);
        const instances = this._getOrCreateServiceInstances(serviceId);
        return checkCardinality(instances, serviceId, ServiceDependencyCardinality.ZeroOrMore).slice();
    }

    /**
     * Gets the service for the provided `ServiceIdentifier`.
     * @throws {Error} there is not exactly one service that satisfies the dependency.
     */
    getService<T>(serviceId: ServiceIdentifier<T>): T {
        this._throwIfDisposed();
        if (!this.hasService(serviceId)) throw new Error(`Unknown service ${serviceId.toString({ quoted: true })}.`);
        const instances = this._getOrCreateServiceInstances(serviceId);
        return checkCardinality(instances, serviceId, ServiceDependencyCardinality.ExactlyOne);
    }

    /**
     * Gets the service for the provided `ServiceIdentifier`, if it is defined.
     * @throws {Error} there is not at most one service that satisfies the dependency.
     */
    tryGetService<T>(serviceId: ServiceIdentifier<T>): T | undefined {
        this._throwIfDisposed();
        if (!this.hasService(serviceId)) return undefined;
        const instances = this._getOrCreateServiceInstances(serviceId);
        return checkCardinality(instances, serviceId, ServiceDependencyCardinality.ZeroOrOne);
    }

    /**
     * Creates a nested service provider with additional services.
     */
    createChild(services: ServiceCollection): IScopedServiceProvider {
        this._throwIfDisposed();
        const child = new ServiceContainer(services);
        child._parent = this;
        return child;
    }

    [Disposable.dispose]() {
        if (!this._isDisposed) {
            this._isDisposed = true;
            this._instances.clear();
            const errors: any[] = [];
            for (const [disposable, dispose] of this._disposables) {
                try {
                    dispose.call(disposable);
                }
                catch (e) {
                    errors.push(e);
                }             
            }
            this._disposables.length = 0;
            if (errors.length === 1) throw errors[0];
            if (errors.length > 1) {
                const error = new Error("One or more errors occurred");
                error.name = "AggregateError";
                (error as any).errors = errors;
                throw error;
            }
        }
    }

    private _throwIfDisposed() {
        if (this._isDisposed) {
            throw new ReferenceError("Object is disposed.");
        }
        this._parent?._throwIfDisposed();
    }

    private _createInstance<T>(descriptor: ServiceDescriptor<T>): T {
        const serviceDependencies = descriptor.dependencies
            .filter(ServiceDependency.isParameterDependency)
            .sort((a, b) => a.parameterIndex - b.parameterIndex);

        const dependencies: any[] = [];
        for (const dependency of serviceDependencies) {
            const instances = this._getOrCreateServiceInstances(dependency.id);
            const value = checkCardinality(instances, dependency.id, dependency.cardinality, descriptor.name);
            dependencies.push(value);
        }

        return descriptor.activate(dependencies);
    }

    private _setServiceInstance<T>(id: ServiceIdentifier<T>, instance: T, index: number): void {
        const descriptors = this._services.get(id);
        if (descriptors) {
            let instances = this._instances.get(id);
            if (!instances) this._instances.set(id, instances = {
                remaining: new Set(descriptors.map((_, i) => i)),
                values: Array(descriptors.length)
            });
            if (!instances.remaining.delete(index)) throw new Error("Service instance already set");
            if (Disposable.hasInstance(instance) && (instance as unknown) !== this) {
                this._disposables.push([instance, instance[Disposable.dispose]]);
            }
            instances.values[index] = instance;
        }
        else if (this._parent) {
            this._parent._setServiceInstance(id, instance, index);
        }
        else {
            throw new Error();
        }
    }

    private _getInstances<T>(id: ServiceIdentifier<T>) {
        const instances = this._instances.get(id);
        if (instances) {
            if (instances.remaining.size) throw new Error("Instance is currently initializing");
            return instances.values as T[];
        }
    }

    private _getOrCreateServiceInstances<T>(id: ServiceIdentifier<T>): T[] {
        const instances = this._getInstances(id);
        if (instances) {
            return instances;
        }
        const descriptors = this._services.get(id);
        if (descriptors) {
            return this._createAndCacheServiceInstances(id, descriptors);
        }
        return this._parent?._getOrCreateServiceInstances(id) ?? [];
    }

    private _createAndCacheServiceInstances<T>(id: ServiceIdentifier<T>, descriptors: ServiceDescriptor<T>[]): T[] {
        if (!this._services.has(id)) throw new Error("Invalid operation");

        let emptyArrayNode: CompositionGraphNode | undefined;
        
        // construct a dependency graph
        const graph = new CompositionGraph();
        const transaction = new CompositionTransaction();
        try {            
            const root = graph.createNode(id, this, descriptors);
            const stack: CompositionGraphNode[] = [root];
            let remainingWork: CompositionGraphNode[] = [root];
            let node: CompositionGraphNode | undefined;
            while (node = stack.pop()) {
                const { id, descriptors, container } = node;
                for (let i = 0; i < descriptors.length; i++) {
                    const descriptor = descriptors[i];
                    for (const dependency of descriptor.dependencies) {
                        let dependencyNode = graph.getNode(dependency.id);
                        if (!dependencyNode) {
                            let currentContainer: ServiceContainer | undefined = container;
                            while (currentContainer) {
                                const instances = currentContainer._getInstances(dependency.id);
                                if (instances) {
                                    checkCardinality(instances, dependency.id, dependency.cardinality, id.toString());
                                    dependencyNode = graph.createImmutableNode(dependency.id, currentContainer, instances);
                                    break;
                                }
                                const descriptors = currentContainer._services.get(dependency.id);
                                if (descriptors) {
                                    checkCardinality(descriptors, dependency.id, dependency.cardinality, id.toString());
                                    dependencyNode = graph.createNode(dependency.id, currentContainer, descriptors);
                                    stack.push(dependencyNode);
                                    remainingWork.push(dependencyNode);
                                    break;
                                }
                                currentContainer = currentContainer._parent;
                            }
                        }

                        if (!dependencyNode && dependency.cardinality === ServiceDependencyCardinality.ZeroOrMore) {
                            dependencyNode = emptyArrayNode ??= graph.createImmutableNode(emptyArrayId, this, []);
                        }

                        if (!dependencyNode) {
                            checkCardinality(undefined, dependency.id, dependency.cardinality, id.toString());
                            continue;
                        }

                        node.addDependency(i, dependencyNode, dependency);
                    }
                }
            }

            if (graph.hasCircularity()) {
                throw new Error("Cyclic dependency in graph");
            }

            // reverse the order of nodes to be instantiated, as thats most likely
            // the order in which their instantiation will need to occur
            remainingWork.reverse();
            remainingWork = [...new Set(remainingWork)]; // ensure nodes are only processed once.

            // instantiate each node
            while (remainingWork.length) {
                const currentWork = remainingWork;
                remainingWork = [];

                for (const node of currentWork) {
                    // skip nodes with unsatisfied parameters
                    if (node.hasUnsatisfiedParameters()) {
                        // add this to the next loop
                        remainingWork.push(node);
                        continue;
                    }

                    const { id, descriptors, container } = node;
                    transaction.enlist(container);
                    for (let i = 0; i < descriptors.length; i++) {
                        const descriptor = descriptors[i];
                        const instance = container._createServiceInstanceWithOwner(id, descriptor, i);
                        container._setServiceInstance(id, instance, i);
                        node.setInstance(instance, i);
                    }
                }

                // sanity check...
                if (remainingWork.length === currentWork.length) {
                    throw new Error("Cyclic dependency in graph");
                }
            }

            // validate all parameters are satisfied
            const unsatisfiedParameters = [...graph.unsatisfiedParameters()];
            if (unsatisfiedParameters.length) {
                const message = unsatisfiedParameters
                    .map(link => `${link.source.id} parameter #${(link.dependency as ParameterServiceDependency).parameterIndex}`)
                    .join(',\n    ');
                throw new Error(`Not all parameters were instantiated:\n    ${message}`);
            }

            // validate all nodes are instantiated
            const uninstantiatedNodes = [...graph.uninstantiatedNodes()];
            if (uninstantiatedNodes.length) {
                const message = uninstantiatedNodes
                    .map(node => node.id)
                    .join(`,\n    `);
                throw new Error(`Not all services were instantiated:\n    ${message}`);
            }

            // invoke setters for unsatisfied properties
            for (const link of [...graph.unboundProperties()]) {
                if (link.bindProperty()) {
                    link.deleteSelf();
                }
            }

            // validate all properties are instantiated
            const unsatisfiedProperties = [...graph.unboundProperties()];
            if (unsatisfiedProperties.length) {
                const message = unsatisfiedProperties
                    .map(link => `${link.source.id}${formatPropertyName((link.dependency as PropertyServiceDependency).propertyName, { dotted: true })}`)
                    .join(',\n    ');
                throw new Error(`Not all properties were instantiated:\n    ${message}`);
            }

            transaction.setTransactionSuccessful();
            return root.instances as T[];
        }
        finally {
            transaction.endTransaction();
        }
    }

    private _createServiceInstanceWithOwner<T>(id: ServiceIdentifier<T>, descriptor: ServiceDescriptor<T>, index: number): T {
        const descriptors = this._services.get(id);
        if (descriptors) {
            if (descriptors[index] !== descriptor) throw new Error("Invalid operation");
            const instances = this._instances.get(id);
            if (instances?.values[index]) throw new Error("Invalid operation");
            return this._createServiceInstance(descriptor);
        }
        else {
            throw new Error();
        }
    }

    private _createServiceInstance<T>(descriptor: ServiceDescriptor<T>): T {
        if (!descriptor.supportsDelayedInstantiation) {
            return this._createInstance(descriptor);
        }
        else {
            const lazy = Lazy.from(() => this._createInstance<T>(descriptor));
            return <T>new Proxy(Object.create(null), {
                get(target: any, key: PropertyKey) {
                    if (key in target) return target[key];
                    const obj = lazy.value;
                    let prop = Reflect.get(Object(obj), key);
                    if (typeof prop !== "function") return prop;
                    prop = prop.bind(obj);
                    target[key] = prop;
                    return prop;
                },
                set(_target, p: PropertyKey, value: any) {
                    Object(lazy.value)[p] = value;
                    return true;
                }
            });
        }
    }
}

class CompositionTransaction {
    private _snapshot = new Map<ServiceContainer, Map<ServiceIdentifier<any>, { remaining: Set<number>, values: unknown[] }>>();
    private _ok = false;
    private _done = false;

    enlist(container: ServiceContainer): void {
        if (this._done) throw new Error("Transaction has already completed");
        if (!this._snapshot.has(container)) {
            this._snapshot.set(container, new Map([...container["_instances"]].map(([key, { remaining, values }]) => [key, { remaining: new Set(remaining), values: values.slice() }])));
        }
    }

    setTransactionSuccessful() {
        if (this._done) throw new Error("Transaction has already completed");
        this._ok = true;
    }

    endTransaction() {
        if (this._done) throw new Error("Transaction has already completed");
        this._done = true;
        if (this._ok) {
            this._commit();
        }
        else {
            this._rollback();
        }
    }

    private _rollback(): void {
        for (const [container, instances] of [...this._snapshot]) {
            container["_instances"] = new Map(instances);
            this._snapshot.delete(container);
        }
    }

    private _commit(): void {
        for (const [container, instances] of [...this._snapshot]) {
            this._snapshot.delete(container);
        }
    }
}

class CompositionGraph {
    private _graph: Graph;

    constructor() {
        this._graph = new Graph().addSchema(compositionGraphSchema);
        this._graph.set(propGraphObject, this);
    }

    get graph() { return this._graph; }

    static from(graph: Graph) {
        return graph.get(propGraphObject);
    }

    getNode(id: ServiceIdentifier<any>) {
        const graphNode = this._graph.nodes.get(id.serviceName);
        return graphNode?.get(propNodeObject);
    }

    createNode(id: ServiceIdentifier<any>, container: ServiceContainer, descriptors: ServiceDescriptor<unknown>[]) {
        return new CompositionGraphNode(this, id, container, descriptors);
    }

    createImmutableNode(id: ServiceIdentifier<any>, container: ServiceContainer, instances: unknown[]) {
        const node = this.createNode(id, container, instances.map(ServiceDescriptor.forInstance));
        node.graphNode.set(propNodeInstances, instances);
        node.graphNode.deleteCategory(categoryUninstantiated);
        node.graphNode.addCategory(categoryImmutable);
        return node;
    }

    hasUninstantiatedNodes() {
        return some(this.uninstantiatedNodes());
    }

    * uninstantiatedNodes() {
        for (const graphNode of this._graph.nodes.byCategory(categoryUninstantiated)) {
            const node = CompositionGraphNode.from(graphNode);
            if (node) yield node;
        }
    }

    hasUnsatisfiedParameters() {
        return some(this.unsatisfiedParameters());
    }

    * unsatisfiedParameters() {
        for (const graphLink of this._graph.links.byCategory(categoryUnsatisfiedParameter)) {
            const link = CompositionGraphLink.from(graphLink);
            if (link) yield link;
        }
    }

    hasUnsatisfiedProperties() {
        return some(this.unboundProperties());
    }

    * unboundProperties() {
        for (const graphLink of this._graph.links.byCategory(categoryUnboundProperty)) {
            const link = CompositionGraphLink.from(graphLink);
            if (link) yield link;
        }
    }

    hasCircularity() {
        for (const node of this.uninstantiatedNodes()) {
            if (node.hasCircularity()) {
                return true;
            }
        }
        return false;
    }
}

class CompositionGraphNode {
    private _owner: CompositionGraph;
    private _node: GraphNode;

    constructor(owner: CompositionGraph, id: ServiceIdentifier<any>, container: ServiceContainer, descriptors: ServiceDescriptor<unknown>[]) {
        if (owner.graph.nodes.has(id.serviceName)) throw new Error("Node already exists");
        this._owner = owner;
        this._node = owner.graph.nodes
            .getOrCreate(id.serviceName, categoryUninstantiated)
            .set(propNodeId, id)
            .set(propNodeContainer, container)
            .set(propNodeDescriptors, descriptors)
            .set(propNodePendingInstances, new Set(descriptors.map((_, i) => i)))
            .set(propNodeInstances, Array(descriptors.length))
            .set(propNodeObject, this);
    }

    get owner() { return this._owner; }
    get graphNode() { return this._node; }
    get serviceName() { return this.id.serviceName; }
    get id() { return this._node.get(propNodeId)!; }
    get container() { return this._node.get(propNodeContainer)!; }
    get isImmutable() { return this._node.hasCategory(categoryImmutable); }
    get isInstantiated() { return !this._node.hasCategory(categoryUninstantiated); }
    get descriptors() { return this._node.get(propNodeDescriptors)!; }
    get instances() { return this._node.get(propNodeInstances)!; }

    static from(node: GraphNode) {
        return node.get(propNodeObject);
    }

    hasCircularity() {
        return this._node.hasCircularity(categoryUnsatisfiedParameter);
    }

    addDependency(index: number, dependencyNode: CompositionGraphNode, dependency: ServiceDependency) {
        if (ServiceDependency.isParameterDependency(dependency) ? !dependencyNode.isInstantiated : !this.isImmutable) {
            return new CompositionGraphLink(this.owner, this, dependencyNode, dependency, index);
        }
    }

    hasUnsatisfiedParameters() {
        return this._node.hasOutgoingLinks(categoryUnsatisfiedParameter);
    }

    hasUnboundProperties() {
        return this._node.hasOutgoingLinks(categoryUnboundProperty);
    }

    * unsatisfiedParameters() {
        for (const graphLink of this._node.outgoingLinks(categoryUnsatisfiedParameter)) {
            const link = CompositionGraphLink.from(graphLink);
            if (link) yield link;
        }
    }

    * unsatisfiedParameterOf() {
        for (const graphLink of this._node.incomingLinks(categoryUnsatisfiedParameter)) {
            const link = CompositionGraphLink.from(graphLink);
            if (link) yield link;
        }
    }

    * unboundProperties() {
        for (const graphLink of this._node.outgoingLinks(categoryUnboundProperty)) {
            const link = CompositionGraphLink.from(graphLink);
            if (link) yield link;
        }
    }

    * unboundPropertyOf() {
        for (const graphLink of this._node.incomingLinks(categoryUnboundProperty)) {
            const link = CompositionGraphLink.from(graphLink);
            if (link) yield link;
        }
    }

    setInstance(instance: unknown, index: number) {
        const pendingInstances = this._node.get(propNodePendingInstances)!;
        const instances = this.instances;
        if (this.isImmutable) throw new TypeError("Node is immutable");
        if (this.isInstantiated) throw new TypeError("Node already instantiated");
        if (!pendingInstances.delete(index)) throw new TypeError("ServiceDescriptor already satisfied");
        instances[index] = instance;
        if (pendingInstances.size === 0) {
            this._node.deleteCategory(categoryUninstantiated);
            this._node.deleteIncomingLinks(categoryUnsatisfiedParameter);

            // bind any instantiated properties for this node
            for (const link of [...this.unboundProperties()]) {
                // if we successfully bind the property we can remove the link from the graph
                if (link.bindProperty()) {
                    link.deleteSelf();
                }
            }

            // bind any properties for instantiated services that depend on this node
            for (const link of [...this.unboundPropertyOf()]) {
                // if we successfully bind the property we can remove the link from the graph
                if (link.bindProperty()) {
                    link.deleteSelf();
                }
            }
        }
    }
}

class CompositionGraphLink {
    private _owner: CompositionGraph;
    private _link: GraphLink;

    constructor(owner: CompositionGraph, source: CompositionGraphNode, target: CompositionGraphNode, dependency: ServiceDependency, index: number) {
        // paint the link with the corresponding category
        const category = ServiceDependency.isParameterDependency(dependency) ?
            categoryUnsatisfiedParameter :
            categoryUnboundProperty;
        this._owner = owner;
        this._link = owner.graph.links.getOrCreate(source.graphNode, target.graphNode, index)
            .addCategory(category)
            .set(propLinkDependency, dependency)
            .set(propLinkObject, this);
    }

    get owner() { return this._owner; }
    get graphLink() { return this._link; }
    get index() { return this._link.index; }
    get isParameter() { return this._link.hasCategory(categoryUnsatisfiedParameter); }
    get isProperty() { return this._link.hasCategory(categoryUnboundProperty); }
    get source() { return CompositionGraphNode.from(this._link.source)!; }
    get target() { return CompositionGraphNode.from(this._link.target)!; }
    get dependency() { return this._link.get(propLinkDependency)!; }

    static from(link: GraphLink) {
        return link.get(propLinkObject);
    }

    deleteSelf() {
        return this.graphLink.deleteSelf();
    }

    bindProperty() {
        if (!this.isProperty) throw new TypeError("This operation is only valid for property dependencies");
        if (!this.target.isInstantiated) return false;
        if (!this.source.isInstantiated) return false;
        if (this.source.isImmutable) throw new TypeError("Cannot set a property on a pre-existing dependency");
        const sourceDescriptor = this.source.descriptors[this._link.index];
        const sourceValue = this.source.instances[this._link.index];
        if (!isObject(sourceValue)) throw new TypeError("Cannot set property of non-object");
        const dependency = this.dependency as PropertyServiceDependency;
        const targetValue = checkCardinality(this.target.instances, dependency.id, dependency.cardinality, sourceDescriptor.name);
        if (!Reflect.set(sourceValue, dependency.propertyName, targetValue)) throw new TypeError(`Cannot set property ${formatPropertyName(dependency.propertyName, { quoted: true })} on service ${this.source.id.toString({ quoted: true })}`);
        return true;
    }
}

function isObject(x: any): x is object {
    return typeof x === "object" && x !== null
        || typeof x === "function";
}

function formatPropertyName(propertyName: string | symbol, { dotted = false, quoted = false } = {}) {
    if (typeof propertyName === "string") {
        if (!quoted && /^[a-z$_][a-z0-9$_]*$/i.test(propertyName)) {
            return dotted ? `.${propertyName}` : propertyName;
        }
        return dotted ? `['${propertyName}']` : `'${propertyName}'`;
    }
    return dotted ? `[${propertyName.toString()}]` : propertyName.toString();
}

function checkCardinality<T, C extends ServiceDependencyCardinality>(values: readonly T[] | undefined, serviceId: ServiceIdentifier<T>, cardinality: C, name?: string): 
    C extends ServiceDependencyCardinality.ZeroOrOne ? T | undefined :
    C extends ServiceDependencyCardinality.ExactlyOne ? T :
    C extends ServiceDependencyCardinality.ZeroOrMore ? readonly T[] :
    never;
function checkCardinality<T>(values: readonly T[] | undefined, serviceId: ServiceIdentifier<T>, cardinality: ServiceDependencyCardinality, name?: string) {
    const length = values?.length ?? 0;
    switch (cardinality) {
        case ServiceDependencyCardinality.ExactlyOne:
            if (length === 0) throw new TypeError(name === undefined ?
                `No dependencies satisfied service ${serviceId.toString({ quoted: true })}.` :
                `No dependencies satisfied service ${serviceId.toString({ quoted: true })} when composing ${name}.`);
        case ServiceDependencyCardinality.ZeroOrOne:
            if (length > 1) throw new TypeError(name === undefined ?
                `Too many dependencies statisfy service ${serviceId.toString({ quoted: true })}. Expected at most one, but received ${length} instead.` :
                `Too many dependencies statisfy service ${serviceId.toString({ quoted: true })} when composing ${name}. Expected at most one, but received ${length} instead.`);
            return length === 1 ? values![0] : undefined;
        case ServiceDependencyCardinality.ZeroOrMore:
            return values;
    }
}
