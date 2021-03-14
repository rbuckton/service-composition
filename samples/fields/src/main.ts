import { ServiceCollection } from "service-composition";

// service interfaces
import { ILocaleService } from "./services/iLocaleService";
import { ITranslateService } from "./services/iTranslateService";
import { IHelloService } from "./services/iHelloService";

// implementations
import { LocaleService } from "./implementations/localeService";
import { TranslateService } from "./implementations/translateService";
import { HelloService } from "./implementations/helloService";

// set up container
const serviceProvider = new ServiceCollection()
    .addClass(ILocaleService, LocaleService)
    .addClass(ITranslateService, TranslateService)
    .addClass(IHelloService, HelloService)
    .createContainer();

// say hello
const helloService = serviceProvider.getService(IHelloService);
console.log(helloService.sayHello("Alice"));