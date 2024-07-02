export interface Plugin {
    key: PluginKey
    register(env?: 'dev' | 'v2'): void;
    unregister(): void;
    use(params: any): Promise<void>;
}

export enum PluginKey {
    PUBSUB
}

export class Plugins {
    static registered: Map<PluginKey, Plugin> = new Map();
    static register = (candidates: Plugin[], env?: 'dev' | 'v2') => {
        if (candidates && candidates.length) {
            for (const candidate of candidates) {
                if (!this.registered.has(candidate.key)) {
                    candidate.register(env);
                    this.registered.set(candidate.key, candidate);
                }
            }
        }
    }
}
