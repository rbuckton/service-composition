/*!
 * Copyright (c) 2021 Ron Buckton
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * 
 * THIRD PARTY LICENSE NOTICE:
 * 
 * "optional" is derived from the implementation of "optional" 
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
import { ServiceDependency, ServiceDependencyCardinality } from "./ServiceDependency";
import { Constructor, MatchingKey, MatchingParameter, NonConstructor } from "./types";
import { DecoratorArgs, isConstructorParameterDecoratorArgs, isInstancePropertyOrFieldDecoratorArgs } from "./decorator";

/**
 * A decorator used to indicate a parameter or property expects zero or one services with the provided identifier.
 * @param id The service identifier.
 */
export function optional<T>(id: ServiceIdentifier<T>) {
    return decorator;

    function decorator<F extends Constructor<any[], any>, I extends number>(target: F, propertyKey: undefined, parameterIndex: MatchingParameter<F, I, T | undefined>): void;
    function decorator<O extends object, K extends keyof O>(target: NonConstructor<O>, propertyKey: MatchingKey<O, K, T | undefined>): void;
    function decorator<O extends object>(target: NonConstructor<O>, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<T | undefined>): void;
    function decorator(...args: DecoratorArgs<T | undefined>): void {
        if (isConstructorParameterDecoratorArgs(args)) {
            const [target, , parameterIndex] = args;
            ServiceDependency.store(id, target, parameterIndex, ServiceDependencyCardinality.ZeroOrOne);
        }
        else if (isInstancePropertyOrFieldDecoratorArgs(args)) {
            const [target, propertyKey] = args;
            ServiceDependency.store(id, target.constructor as Constructor<any[], any>, propertyKey, ServiceDependencyCardinality.ZeroOrOne);
        }
        else {
            debugger;
            throw new TypeError(`@optional(${id.serviceName.toString()}) can only be used to decorate a constructor parameter or an instance property`);
        }
    };
}
