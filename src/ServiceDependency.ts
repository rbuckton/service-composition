/*!
 * Copyright (c) 2021 Ron Buckton
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * 
 * THIRD PARTY LICENSE NOTICE:
 * 
 * "ServiceDependency" is derived from the implementation of "storeServiceDependency" 
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

const kDITarget = Symbol("DependencyInjection.Target");
const kDIDependencies = Symbol("DependencyInjection.Dependencies");

export const enum ServiceDependencyCardinality {
    ZeroOrOne = 0,
    ExactlyOne = 1,
    ZeroOrMore = 2
}

export interface ServiceDependency {
    readonly id: ServiceIdentifier<any>;
    readonly parameterIndex: number | undefined;
    readonly propertyName: string | symbol | undefined;
    readonly cardinality: ServiceDependencyCardinality;
}

export interface ParameterServiceDependency extends ServiceDependency {
    readonly parameterIndex: number;
    readonly propertyName: undefined;
}

export interface PropertyServiceDependency extends ServiceDependency {
    readonly parameterIndex: undefined;
    readonly propertyName: string | symbol;
}

export namespace ServiceDependency {
    export function store(id: ServiceIdentifier<any>, target: new (...args: any[]) => any, parameterIndex: number, cardinality: ServiceDependencyCardinality): void;
    export function store(id: ServiceIdentifier<any>, target: new (...args: any[]) => any, propertyName: string | symbol, cardinality: ServiceDependencyCardinality): void;
    export function store(id: ServiceIdentifier<any>, target: new (...args: any[]) => any, parameterIndexOrPropertyName: string | symbol | number, cardinality: ServiceDependencyCardinality) {
        const dependency: ServiceDependency = {
            id,
            parameterIndex: typeof parameterIndexOrPropertyName === "number" ? parameterIndexOrPropertyName : undefined,
            propertyName: typeof parameterIndexOrPropertyName !== "number" ? parameterIndexOrPropertyName : undefined,
            cardinality
        };
        if ((target as any)[kDITarget] === target) {
            (target as any)[kDIDependencies].push(dependency);
        }
        else {
            (target as any)[kDIDependencies] = [dependency];
            (target as any)[kDITarget] = target;
        }
    }

    export function isParameterDependency(dependency: ParameterServiceDependency | PropertyServiceDependency | ServiceDependency): dependency is ParameterServiceDependency {
        return dependency.parameterIndex !== undefined;
    }

    export function isPropertyDependency(dependency: ParameterServiceDependency | PropertyServiceDependency | ServiceDependency): dependency is PropertyServiceDependency {
        return dependency.propertyName !== undefined;
    }

    export function get(target: new (...args: any[]) => any): readonly (ParameterServiceDependency | PropertyServiceDependency)[] {
        return (target as any)[kDIDependencies] ?? [];
    }
}
