import { ServiceIdentifier } from "service-composition";

export const ILocaleService = ServiceIdentifier.create<ILocaleService>();

export interface ILocaleService {
    readonly locale: string;
    setLocale(locale: string): boolean;
}