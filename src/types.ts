/*!
 * Copyright (c) 2021 Ron Buckton
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 */

export type Constructor<A extends unknown[], T> = new (...args: A) => T;
export type NonConstructor<T> = T & ([T] extends [new (...args: any[]) => any] ? never : unknown);
export type MatchingKey<T, K extends keyof T, TMatch> = K & ([TMatch] extends [T[K]] ? unknown : never);
export type MatchingParameter<F extends Constructor<any[], any>, I extends number, TMatch> = I & ([TMatch] extends [ConstructorParameters<F>[I]] ? unknown : never);