/*!
 * Copyright (c) 2021 Ron Buckton
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 */

import { ServiceIdentifier } from "./ServiceIdentifier";
import { ServiceDependency, ServiceDependencyCardinality } from "./ServiceDependency";
import { Constructor, MatchingKey, MatchingParameter, NonConstructor } from "./types";
import { ConstructorParameterDecorator, DecoratorArgs, InstanceFieldDecorator, InstancePropertyDecorator, isConstructorParameterDecoratorArgs, isInstancePropertyOrFieldDecoratorArgs } from "./decorator";

/**
 * A decorator used to indicate a parameter or property expects zero or more services with the provided identifier.
 * @param id The service identifier.
 */
export function many<T>(id: ServiceIdentifier<T>) {
    return decorator;

    function decorator<F extends Constructor<any[], any>, I extends number>(target: F, propertyKey: undefined, parameterIndex: MatchingParameter<F, I, T[]>): void;
    function decorator<O extends object, K extends keyof O>(target: NonConstructor<O>, propertyKey: MatchingKey<O, K, T[]>): void;
    function decorator<O extends object>(target: NonConstructor<O>, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<T[]>): void;
    function decorator(...args: DecoratorArgs<T[]>): void {
        if (isConstructorParameterDecoratorArgs(args)) {
            const [target, , parameterIndex] = args;
            ServiceDependency.store(id, target, parameterIndex, ServiceDependencyCardinality.ZeroOrMore);
        }
        else if (isInstancePropertyOrFieldDecoratorArgs(args)) {
            const [target, propertyKey] = args;
            ServiceDependency.store(id, target.constructor as Constructor<any[], any>, propertyKey, ServiceDependencyCardinality.ZeroOrMore);
        }
        else {
            debugger;
            throw new TypeError(`@many(${id.serviceName.toString()}) can only be used to decorate a constructor parameter or an instance property`);
        }
    };
}
