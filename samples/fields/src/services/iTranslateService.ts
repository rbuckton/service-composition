import { ServiceIdentifier } from "service-composition";

export const ITranslateService = ServiceIdentifier.create<ITranslateService>();

export interface ITranslateService {
    format(message: string, args: Record<string, any>): string;
}