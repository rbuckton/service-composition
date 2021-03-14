import { ILocaleService } from "../services/iLocaleService";

export class LocaleService implements ILocaleService {
    private _locale: string | undefined;

    get locale(): string {
        if (!this._locale) {
            this._locale = "en-US";
            const lang =
                process.env.LANG ||
                process.env.LANGUAGES ||
                process.env.LC_ALL
            if (lang) {
                const match = /^[a-zA-Z]{1,}(?:[-_][a-zA-Z]{1,})*/.exec(lang);
                if (match) {
                    const locale = match[0].replace(/_/g, "-");
                    if (locale !== "C") this._locale = locale;
                }
            }
        }
        return this._locale;
    }

    setLocale(locale: string) {
        if (!/^[a-zA-Z]{1,}(?:[-_][a-zA-Z]{1,})*$/.test(locale)) return false;
        this._locale = locale;
        return true;
    }
}