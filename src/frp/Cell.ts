import { Stream, StreamSink } from "./Stream";

export abstract class Cell<A> {
    static map2<A, B, C>(ca: Cell<A>, cb: Cell<B>, f: (a: A, b: B) => C): Cell<C> {
        const cc = new MutableCell(f(ca.value, cb.value));

        const update = () => {
            cc.value = f(ca.value, cb.value);
        }

        ca.listen(update);
        cb.listen(update);

        return cc;
    }

    static fuseArray<A>(ac: ReadonlyArray<Cell<A>>): Cell<ReadonlyArray<A>> {
        const buildMappedArray = () => ac.map((a) => a.value);
        const initValue = buildMappedArray();
        const ca = new MutableCell<ReadonlyArray<A>>(initValue);

        ac.forEach((c) => {
            c.listen((a) => {
                ca.value = buildMappedArray();
            });
        });

        return ca;
    }

    abstract get value(): A;

    abstract values(): Stream<A>;

    abstract map<B>(f: (a: A) => B): Cell<B>;

    abstract listen(h: (a: A) => void): void;
}

export class Const<A> extends Cell<A> {
    private readonly _value: A;

    constructor(value: A) {
        super();
        this._value = value;
    }

    listen(h: (a: A) => void): void {
    }

    get value(): A {
        return this._value;
    }

    values(): Stream<A> {
        throw new Error("Unimplemented");
    }

    map<B>(f: (a: A) => B): Cell<B> {
        throw new Error("Unimplemented");
    }
}

export class MutableCell<A> extends Cell<A> {
    private _value: A;

    private _stream = new StreamSink<A>();

    constructor(initValue: A) {
        super();
        this._value = initValue;
    }

    get value(): A {
        return this._value;
    }

    set value(value: A) {
        this._value = value;
        this._stream.send(value);
    }

    update(f: (oldValue: A) => A) {
        this.value = f(this.value);
    }

    map<B>(f: (a: A) => B): Cell<B> {
        const cell = new MutableCell<B>(f(this.value));
        this.listen((a) => cell.value = f(a));
        return cell;
    }

    mapTo<B>(b: B): Cell<B> {
        return this.map((_) => b);
    }

    values(): Stream<A> {
        return this._stream;
    }

    listen(h: (a: A) => void) {
        return this.values().listen(h);
    }
}
