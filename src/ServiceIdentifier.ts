/*!
 * Copyright (c) 2021 Ron Buckton
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * 
 * THIRD PARTY LICENSE NOTICE:
 * 
 * "ServiceIdentifier" is derived from the implementation of "ServiceIdentifier" 
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

import { ServiceDependency, ServiceDependencyCardinality } from "./ServiceDependency";
import { Constructor, MatchingKey, MatchingParameter, NonConstructor } from "./types";

/** Key used to associate the design-type type with a service identifier. */
declare const ServiceType: unique symbol;

/** 
 * Uniquely identifies a service.
 */
export interface ServiceIdentifier<T> {
    readonly [ServiceType]: T;
    readonly serviceName: string | symbol;
    <F extends Constructor<any[], any>, I extends number>(target: F, propertyKey: undefined, parameterIndex: MatchingParameter<F, I, T>): void;
    <O extends object, K extends keyof O>(target: NonConstructor<O>, propertyKey: MatchingKey<O, K, T>): void;
    <O extends object>(target: NonConstructor<O>, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<T>): void;
    toString(options?: { quoted?: boolean }): string;
}

export namespace ServiceIdentifier {
    const knownServiceIdentifiers = new Map<string | symbol, ServiceIdentifier<any>>();

    /**
     * Gets the underlying type of the service.
     */
    export type Type<T extends ServiceIdentifier<any>> = T[typeof ServiceType];

    /**
     * Creates a new ServiceIdentifier for the provided service name.
     */
    export function create<T>(serviceName: string | symbol = Symbol()): ServiceIdentifier<T> {
        if (knownServiceIdentifiers.has(serviceName)) {
            return knownServiceIdentifiers.get(serviceName)!; 
        }

        const id: ServiceIdentifier<T> = Object.defineProperties(
            function(target: object, propertyKey: string | symbol | undefined, parameterIndex?: number): void {
                if (arguments.length === 2 || arguments.length === 3 && parameterIndex === undefined) {
                    if (typeof target === "object" && 
                        typeof target.constructor === "function" &&
                        target.constructor !== Object &&
                        target.constructor !== Function &&
                        (typeof propertyKey === "string" || typeof propertyKey === "symbol")) {
                        ServiceDependency.store(id, target.constructor as new (...args: any[]) => any, propertyKey, ServiceDependencyCardinality.ExactlyOne);
                        return;
                    }
                }
                else if (arguments.length === 3) {
                    if (typeof target === "function" &&
                        propertyKey === undefined &&
                        typeof parameterIndex === "number") {
                        ServiceDependency.store(id, target as new (...args: any[]) => any, parameterIndex, ServiceDependencyCardinality.ExactlyOne);
                        return;
                    }
                }
                debugger;
                throw new TypeError(`@${serviceName.toString()} can only be used to decorate a constructor parameter or an instance property`);
            },
            {
                serviceName: {
                    configurable: true,
                    value: serviceName
                },
                toString: {
                    configurable: true,
                    writable: true,
                    value: function(this: ServiceIdentifier<any>, options?: { quoted?: boolean }) {
                        if (options?.quoted && typeof this.serviceName === "string") return `'${this.serviceName}'`;
                        return this.serviceName.toString();
                    }
                }
            });
    
        knownServiceIdentifiers.set(serviceName, id);
        return id;
    }
    
    /**
     * Tests whether the provided value is a valid `ServiceIdentifier`.
     */
    export function hasInstance(value: unknown): value is ServiceIdentifier<any> {
        if (typeof value !== "function" || !("serviceName" in value)) return false;
        const serviceName = (value as ServiceIdentifier<any>).serviceName;
        return (typeof serviceName === "string" || typeof serviceName === "symbol")
            && knownServiceIdentifiers.get(serviceName) === value;
    }
}
