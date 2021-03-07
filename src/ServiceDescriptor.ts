/*!
 * Copyright (c) 2021 Ron Buckton
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * 
 * THIRD PARTY LICENSE NOTICE:
 * 
 * "ServiceDescriptor" is derived from the definition of "SyncDescriptor" 
 * and related components in vscode, located at:
 * 
 *   https://github.com/microsoft/vscode/blob/5d80c30e5b6ce8b2f5336ed55ad043490b0b818f/src/vs/platform/instantiation/common/descriptors.ts
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

import { ServiceDependency } from "./ServiceDependency";
import type { Constructor } from "./types";

/**
 * Describes a service that has not yet been instantiated.
 */
export abstract class ServiceDescriptor<T> {
    constructor(
        readonly name: string,
        readonly dependencies: readonly ServiceDependency[],
        readonly supportsDelayedInstantiation: boolean
    ) {}

    abstract activate(dependencies: any[]): T;

    static forClass<S extends unknown[], A extends unknown[], T>(ctor: Constructor<[...S, ...A], T>, staticArguments: S, supportsDelayedInstantiation?: boolean): ClassDescriptor<S, A, T>;
    static forClass<A extends unknown[], T>(ctor: Constructor<[...A], T>, staticArguments?: undefined, supportsDelayedInstantiation?: boolean): ClassDescriptor<[], A, T>;    
    static forClass<T>(ctor: new (...args: any[]) => T, staticArguments: readonly any[] = [], supportsDelayedInstantiation = false) {
        return new ClassDescriptor(ctor, staticArguments, supportsDelayedInstantiation);
    }

    static forInstance<T>(instance: T) {
        return new InstanceDescriptor(instance);
    }
}

export class ClassDescriptor<S extends unknown[], A extends unknown[], T> extends ServiceDescriptor<T> {
    constructor(
        readonly ctor: new (...args: [...S, ...A]) => T,
        readonly staticArguments: readonly [...S],
        supportsDelayedInstantiation = false,
    ) {
        super(ctor.name, ServiceDependency.get(ctor), supportsDelayedInstantiation);
    }

    bind<S2 extends unknown[], A2 extends unknown[], R>(this: ClassDescriptor<S, [...S2, ...A2], R>, ...args: S2): ClassDescriptor<[...S, ...S2], A2, R> {
        return new ClassDescriptor(this.ctor, [...this.staticArguments, ...args], this.supportsDelayedInstantiation);
    }

    activate(dependencies: A) {
        let args = this.staticArguments.slice();

        const parameterDependencies = this.dependencies
            .filter(ServiceDependency.isParameterDependency)
            .sort((a, b) => a.parameterIndex - b.parameterIndex);
        
        const firstServiceArgPos = parameterDependencies.length > 0 ? parameterDependencies[0].parameterIndex : args.length;
        if (args.length !== firstServiceArgPos) {
            console.warn(`[createInstance] First service dependency of ${this.ctor.name} at position ${firstServiceArgPos + 1} conflicts with ${args.length} static arguments`);
            const delta = firstServiceArgPos - args.length;
            if (delta > 0) {
                args = args.concat(Array(delta));
            }
            else {
                args = args.slice(0, firstServiceArgPos);
            }
        }

        return <T>Reflect.construct(this.ctor, [...args, ...dependencies]);
    }
}

export class InstanceDescriptor<T> extends ServiceDescriptor<T> {
    constructor(
        readonly instance: T
    ) {
        super("instance", [], false);
    }

    activate(_dependencies: any[]) {
        return this.instance;
    }
}
