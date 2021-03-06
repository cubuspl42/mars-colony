export interface ReactiveMap<K, V> {
    get(key: K): V | undefined;

    mapValues<V2>(f: (k: K, v: V) => V2): ReactiveMap<K, V2>;
}

export class MutableReactiveMap<K, V> implements ReactiveMap<K, V> {
    private readonly _map = new Map<string, V>();

    private readonly _buildKeyString: (key: K) => string;

    constructor(buildKey: (key: K) => string) {
        this._buildKeyString = buildKey;
    }

    get(key: K): V | undefined {
        const keyString = this._buildKeyString(key);
        return this._map.get(keyString);
    }

    set(key: K, value: V): void {
        const keyString = this._buildKeyString(key);
        this._map.set(keyString, value);
    }

    mapValues<V2>(f: (k: K, v: V) => V2): ReactiveMap<K, V2> {
        throw new Error();
    }
}
