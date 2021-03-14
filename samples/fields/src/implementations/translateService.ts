import { ILocaleService } from "../services/iLocaleService";
import { ITranslateService } from "../services/iTranslateService";

const translations: Record<string, Record<string, string>> = {
    "en": {
        "Hello, {name}!": "Hello, {name}!"
    },
    "fr": {
        "Hello, {name}!": "Bonjour, {name}!"
    },
    "es": {
        "Hello, {name}!": "¡Hola, {name}!"
    }
};

function getTranslation(localeParts: string[], message: string): string | undefined {
    if (!localeParts.length) return undefined;
    const locale = localeParts.join("-");
    if (locale in translations) {
        const messages = translations[locale];
        if (message in messages) return messages[message];
    }
    localeParts.pop();
    return getTranslation(localeParts, message);
}

export class TranslateService implements ITranslateService {
    @ILocaleService private localeService: ILocaleService

    format(message: string, args: Record<string, any>): string {
        const localeParts = this.localeService.locale.split(/-/g);
        const messageFormat = getTranslation(localeParts, message) ?? message;
        return messageFormat.replace(/\{([\w\d_$]+)\}/g, (_, key) => key in args ? args[key] : _);
    }
}