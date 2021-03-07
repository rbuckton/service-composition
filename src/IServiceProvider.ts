/*!
 * Copyright (c) 2021 Ron Buckton
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * 
 * THIRD PARTY LICENSE NOTICE:
 * 
 * "IServiceProvider" is derived from the definition of "IInstantiationService" 
 * and related components in vscode, located at:
 * 
 *   https://github.com/microsoft/vscode/blob/5d80c30e5b6ce8b2f5336ed55ad043490b0b818f/src/vs/platform/instantiation/common/instantiation.ts
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
import type { ServiceCollection } from "./ServiceCollection";
import type { ClassDescriptor } from "./ServiceDescriptor";
import type { Constructor } from "./types";

export const IServiceProvider = ServiceIdentifier.create<IServiceProvider>("IServiceProvider");

/**
 * Represents an object that can provide services
 */
export interface IServiceProvider {
    /**
     * Create an instance from a `ClassDescriptor` using the provided static arguments.
     * @param descriptor A `ClassDescriptor` for a service.
     * @param args Any required arguments for the service that are not injected.
     */
    createInstance<A extends any[], T>(descriptor: ClassDescriptor<unknown[], A, T>, ...args: A): T;
    /**
     * Create an instance from a class constructor using the provided static arguments.
     * @param descriptor The class for a service.
     * @param args Any required arguments for the service that are not injected.
     */
    createInstance<A extends any[], T>(constructor: Constructor<A, T>, ...args: A): T;
    /**
     * Gets the services for the provided `ServiceIdentifier`.
     */
    getServices<T>(serviceId: ServiceIdentifier<T>): T[];
    /**
     * Gets the service for the provided `ServiceIdentifier`.
     * @throws {Error} there is not exactly one service that satisfies the dependency.
     */
    getService<T>(serviceId: ServiceIdentifier<T>): T;
    /**
     * Gets the service for the provided `ServiceIdentifier`, if it is defined.
     * @throws {Error} there is not at most one service that satisfies the dependency.
     */
    tryGetService<T>(serviceId: ServiceIdentifier<T>): T | undefined;
    /**
     * Creates a nested service provider with additional services.
     */
    createChild(services: ServiceCollection): IServiceProvider;
}