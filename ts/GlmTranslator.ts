import { DOMBuilder, SAXParser, XMLElement } from "typesxml";
import { MTMatch, MTUtils } from "mtengines";

const ENDPOINTS: Record<string, string> = {
    general: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    coding: 'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions'
};

export class GlmTranslator {

    private apiKey: string;
    private apiUrl: string;
    private srcLang: string = '';
    private tgtLang: string = '';
    private model: string | undefined;

    constructor(apiKey: string, endpoint: string, model?: string) {
        this.apiKey = apiKey;
        this.apiUrl = ENDPOINTS[endpoint] || ENDPOINTS.general;
        if (model) {
            this.model = model;
        }
    }

    getName(): string {
        return 'GLM API';
    }

    setModel(model: string): void {
        this.model = model;
    }

    getShortName(): string {
        return 'GLM';
    }

    getSourceLanguages(): Promise<string[]> {
        return MTUtils.getLanguages();
    }

    getTargetLanguages(): Promise<string[]> {
        return MTUtils.getLanguages();
    }

    setSourceLanguage(lang: string): void {
        this.srcLang = lang;
    }

    getSourceLanguage(): string {
        return this.srcLang;
    }

    setTargetLanguage(lang: string): void {
        this.tgtLang = lang;
    }

    getTargetLanguage(): string {
        return this.tgtLang;
    }

    translate(source: string): Promise<string> {
        if (!this.model) {
            return Promise.reject(new Error('Model is not set.'));
        }
        if (this.srcLang === '' || this.tgtLang === '') {
            return Promise.reject(new Error('Source and Target languages must be set before translation.'));
        }
        let prompt = MTUtils.translatePropmt(source, this.srcLang, this.tgtLang);
        return new Promise((resolve, reject) => {
            fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.apiKey,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: MTUtils.getRole(this.srcLang, this.tgtLang) },
                        { role: 'user', content: prompt }
                    ]
                }),
            }).then((response: Response) => {
                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                return response.json();
            }).then((data: any) => {
                let translation: string = data.choices[0].message.content;
                if (translation.startsWith('\n\n')) {
                    translation = translation.substring(2);
                }
                while (translation.startsWith('"') && translation.endsWith('"')) {
                    translation = translation.substring(1, translation.length - 1);
                }
                if (source.startsWith('"') && source.endsWith('"')) {
                    translation = '"' + translation + '"';
                }
                resolve(translation);
            }).catch((error: unknown) => {
                reject(error);
            });
        });
    }

    getMTMatch(source: XMLElement, terms: { source: string; target: string }[]): Promise<MTMatch> {
        if (!this.model) {
            return Promise.reject(new Error('Model is not set.'));
        }
        let prompt: string = MTUtils.generatePrompt(source, this.srcLang, this.tgtLang, terms);
        return new Promise((resolve, reject) => {
            fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.apiKey,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: MTUtils.getRole(this.srcLang, this.tgtLang) },
                        { role: 'user', content: prompt }
                    ]
                }),
            }).then((response: Response) => {
                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                return response.json();
            }).then((data: any) => {
                let translation: string = data.choices[0].message.content.trim();
                if (translation.startsWith('\n\n')) {
                    translation = translation.substring(2);
                }
                while (translation.startsWith('"') && translation.endsWith('"')) {
                    translation = translation.substring(1, translation.length - 1);
                }
                if (translation.startsWith('```xml') && translation.endsWith('```')) {
                    translation = translation.substring(6, translation.length - 3).trim();
                }
                if (translation.startsWith('```') && translation.endsWith('```')) {
                    translation = translation.substring(3, translation.length - 3).trim();
                }
                if (!translation.trim().startsWith('<target') && !translation.trim().endsWith('</target>')) {
                    translation = '<target>' + translation + '</target>';
                }
                let target: XMLElement = MTUtils.toXMLElement(translation);
                resolve(new MTMatch(source, target, this.getShortName()));
            }).catch((error: unknown) => {
                reject(error);
            });
        });
    }

    handlesTags(): boolean {
        return true;
    }

    fixMatch(originalSource: XMLElement, matchSource: XMLElement, matchTarget: XMLElement): Promise<MTMatch> {
        return new Promise((resolve, reject) => {
            this.fixTranslation(originalSource, matchSource, matchTarget).then((translation: string) => {
                let target: XMLElement = MTUtils.toXMLElement(translation);
                resolve(new MTMatch(originalSource, target, this.getShortName()));
            }).catch((error: unknown) => {
                reject(error);
            });
        });
    }

    fixTranslation(originalSource: XMLElement, matchSource: XMLElement, matchTarget: XMLElement): Promise<string> {
        if (!this.model) {
            return Promise.reject(new Error('Model is not set.'));
        }
        let prompt: string = MTUtils.fixMatchPrompt(originalSource, matchSource, matchTarget);
        return new Promise((resolve, reject) => {
            fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.apiKey,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: MTUtils.getRole(this.srcLang, this.tgtLang) },
                        { role: 'user', content: prompt }
                    ]
                }),
            }).then((response: Response) => {
                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                return response.json();
            }).then((data: any) => {
                let translation: string = data.choices[0].message.content;
                if (translation.startsWith('\n\n')) {
                    translation = translation.substring(2);
                }
                while (translation.startsWith('"') && translation.endsWith('"')) {
                    translation = translation.substring(1, translation.length - 1);
                }
                if (translation.startsWith('```xml') && translation.endsWith('```')) {
                    translation = translation.substring(6, translation.length - 3).trim();
                }
                if (!translation.trim().startsWith('<target') && !translation.trim().endsWith('</target>')) {
                    translation = '<target>' + translation + '</target>';
                }
                resolve(translation);
            }).catch((error: unknown) => {
                reject(error);
            });
        });
    }

    fixesMatches(): boolean {
        return true;
    }

    fixesTags(): boolean {
        return true;
    }

    fixTags(source: XMLElement, target: XMLElement): Promise<XMLElement> {
        if (!this.model) {
            return Promise.reject(new Error('Model is not set.'));
        }
        let prompt: string = MTUtils.fixTagsPrompt(source, target, this.srcLang, this.tgtLang);
        return new Promise((resolve, reject) => {
            fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.apiKey,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: MTUtils.getRole(this.srcLang, this.tgtLang) },
                        { role: 'user', content: prompt }
                    ]
                }),
            }).then((response: Response) => {
                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                return response.json();
            }).then((data: any) => {
                let translation: string = data.choices[0].message.content;
                if (translation.startsWith('\n\n')) {
                    translation = translation.substring(2);
                }
                while (translation.startsWith('"') && translation.endsWith('"')) {
                    translation = translation.substring(1, translation.length - 1);
                }
                if (translation.startsWith('```xml') && translation.endsWith('```')) {
                    translation = translation.substring(6, translation.length - 3).trim();
                }
                if (!translation.trim().startsWith('<target') && !translation.trim().endsWith('</target>')) {
                    translation = '<target>' + translation + '</target>';
                }
                let contentHandler: DOMBuilder = new DOMBuilder();
                let xmlParser: SAXParser = new SAXParser();
                xmlParser.setContentHandler(contentHandler);
                xmlParser.parseString(translation);
                let newDoc = contentHandler.getDocument();
                if (newDoc) {
                    const targetElement = newDoc.getRoot();
                    if (targetElement) {
                        resolve(targetElement);
                    } else {
                        reject(new Error('No root element found in fixTags response'));
                    }
                } else {
                    reject(new Error('Error parsing XML from fixTags response'));
                }
            }).catch((error: unknown) => {
                reject(error);
            });
        });
    }
}
