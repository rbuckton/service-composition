/*!
 * Copyright (c) 2021 Ron Buckton
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 */

import { ServiceIdentifier } from "./ServiceIdentifier";
import { ServiceDependency, ServiceDependencyCardinality } from "./ServiceDependency";
import { Constructor, MatchingKey, MatchingParameter, NonConstructor } from "./types";

/**
 * A decorator used to indicate a parameter or property expects zero or more services with the provided identifier.
 * @param id The service identifier.
 */
export function many<T>(id: ServiceIdentifier<T>) {
    return decorator;

    function decorator<F extends Constructor<any[], any>, I extends number>(target: F, propertyKey: undefined, parameterIndex: MatchingParameter<F, I, T[]>): void;
    function decorator<O extends object, K extends keyof O>(target: NonConstructor<O>, propertyKey: MatchingKey<O, K, T[]>): void;
    function decorator<O extends object>(target: NonConstructor<O>, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<T>): void;
    function decorator(target: object, propertyKey: string | symbol | undefined, parameterIndex?: number | PropertyDescriptor): void {
        if (arguments.length === 2 || arguments.length === 3 && parameterIndex === undefined) {
            if (typeof target === "object" &&
                typeof target.constructor === "function" &&
                target.constructor !== Object &&
                target.constructor !== Function &&
                (typeof propertyKey === "string" || typeof propertyKey === "symbol")) {
                ServiceDependency.store(id, target.constructor as new (...args: any[]) => any, propertyKey, ServiceDependencyCardinality.ZeroOrMore);
                return;
            }
        }
        else if (arguments.length === 3) {
            if (typeof target === "function" &&
                propertyKey === undefined &&
                typeof parameterIndex === "number") {
                ServiceDependency.store(id, target as new (...args: any[]) => any, parameterIndex, ServiceDependencyCardinality.ZeroOrMore);
                return;
            }
        }
        debugger;
        throw new TypeError(`@many(${id.serviceName.toString()}) can only be used to decorate a constructor parameter or an instance property`);
    };
}
