/*!
 * Copyright (c) 2021 Ron Buckton
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 */

import { Constructor, MatchingKey, MatchingParameter, NonConstructor } from "./types";

export type ConstructorParameterDecorator<T> = <F extends Constructor<any[], any>, I extends number>(target: F, propertyKey: undefined, parameterIndex: MatchingParameter<F, I, T[]>) => void;
export type InstancePropertyDecorator<T> = <O extends object>(target: NonConstructor<O>, propertyKey: string | symbol, descriptor?: TypedPropertyDescriptor<T>) => void;
export type InstanceFieldDecorator<T> = <O extends object, K extends keyof O>(target: NonConstructor<O>, propertyKey: MatchingKey<O, K, T[]>) => void;
export type ConstructorParameterDecoratorArgs<T> = Parameters<ConstructorParameterDecorator<T>>;
export type InstancePropertyDecoratorArgs<T> = Parameters<InstancePropertyDecorator<T>>;
export type InstanceFieldDecoratorArgs<T> = Parameters<InstanceFieldDecorator<T>>;
export type InstancePropertyOrFieldDecoratorArgs<T> = InstancePropertyDecoratorArgs<T> | InstanceFieldDecoratorArgs<T>;
export type DecoratorArgs<T> = ConstructorParameterDecoratorArgs<T> | InstancePropertyOrFieldDecoratorArgs<T>;

function isConstructor(obj: object) {
    return typeof obj === "function"
        && typeof obj.prototype !== "undefined";
}

function isInstance(obj: object) {
    return typeof obj === "object"
        && typeof obj.constructor === "function"
        && obj.constructor !== Object
        && obj.constructor !== Function;
}

export function isConstructorParameterDecoratorArgs<T>(args: DecoratorArgs<T>): args is ConstructorParameterDecoratorArgs<T> {
    return args.length >= 3
        && isConstructor(args[0])
        && typeof args[1] === "undefined"
        && typeof args[2] === "number";
}

export function isInstancePropertyDecoratorArgs<T>(args: DecoratorArgs<T>): args is InstancePropertyDecoratorArgs<T> {
    return args.length >= 3
        && isInstance(args[0])
        && (typeof args[1] === "string" || typeof args[1] === "symbol")
        && (typeof args[2] === "undefined" || typeof args[2] === "object");
}

export function isInstanceFieldDecoratorArgs<T>(args: DecoratorArgs<T>): args is InstanceFieldDecoratorArgs<T> {
    return args.length === 2
        && isInstance(args[0])
        && (typeof args[1] === "string" || typeof args[1] === "symbol")
}

export function isInstancePropertyOrFieldDecoratorArgs<T>(args: DecoratorArgs<T>): args is InstancePropertyOrFieldDecoratorArgs<T> {
    return isInstancePropertyDecoratorArgs(args)
        || isInstanceFieldDecoratorArgs(args);
}