import { IHelloService } from "../services/iHelloService";
import { ITranslateService } from "../services/iTranslateService";

export class HelloService implements IHelloService {
    constructor(
        @ITranslateService private translation: ITranslateService
    ) {}

    sayHello(name: string): string {
        return this.translation.format("Hello, {name}!", { name });
    }
}