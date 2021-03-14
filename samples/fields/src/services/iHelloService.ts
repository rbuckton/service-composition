import { ServiceIdentifier } from "service-composition";

export const IHelloService = ServiceIdentifier.create<IHelloService>();

export interface IHelloService {
    sayHello(name: string): string;
}