/*!
 * Copyright (c) 2021 Ron Buckton
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 */

import { Disposable } from "@esfx/disposable"; 
import { ServiceIdentifier } from "./ServiceIdentifier";
import { IServiceProvider } from "./IServiceProvider";
import { ServiceCollection } from "./ServiceCollection";

export const IScopedServiceProvider = ServiceIdentifier.create<IScopedServiceProvider>("IScopedServiceProvider");

/**
 * Represents an object that can provide scoped services
 */
export interface IScopedServiceProvider extends IServiceProvider, Disposable {
    /**
     * Creates a nested service provider with additional services.
     */
    createChild(services: ServiceCollection): IScopedServiceProvider;
}