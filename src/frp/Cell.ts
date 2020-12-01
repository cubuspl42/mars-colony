import { Stream, StreamSink } from "./Stream";

export abstract class Cell<A> {
    static switchC<A>(cca: Cell<Cell<A>>): Cell<A> {
        const out = new MutableCell<A>(cca.value.value);
        cca.listen((ca) => {
            out.value = ca.value;
            ca.listen((a) => { // FIXME: Unlisten!
                out.value = a;
            });
        });
        return out;
    }

    static switchS<A>(csa: Cell<Stream<A>>): Stream<A> {
        const out = new StreamSink<A>();

        csa.value.listen((a) => { // FIXME: Unlisten!
            out.send(a);
        });

        csa.listen((sa) => {
            sa.listen((a) => { // FIXME: Unlisten!
                out.send(a);
            });
        });

        return out;
    }

    static map2<A, B, C>(ca: Cell<A>, cb: Cell<B>, f: (a: A, b: B) => C): Cell<C> {
        const cc = new MutableCell(f(ca.value, cb.value));

        const update = () => {
            cc.value = f(ca.value, cb.value);
        }

        ca.listen(update);
        cb.listen(update);

        return cc;
    }

    static sequenceArray<A>(ac: ReadonlyArray<Cell<A>>): Cell<ReadonlyArray<A>> {
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

    // (switchS . map) [not undefined]
    static switchMapNotUndefinedS<A, B>(ca: Cell<A | undefined>, f: (a: A) => Stream<B>): Stream<B> {
        return Cell.switchS(ca.map((a) => {
            if (a !== undefined) {
                return f(a);
            } else {
                return Stream.never();
            }
        }));
    }

    abstract get value(): A;

    abstract values(): Stream<A>;

    abstract map<B>(f: (a: A) => B): Cell<B>;

    switchMapC<B>(f: (a: A) => Cell<B>): Cell<B> {
        return Cell.switchC(this.map(f));
    }

    // (switchS . map)
    switchMapS<B>(f: (a: A) => Stream<B>): Stream<B> {
        return Cell.switchS(this.map(f));
    }

    where(f: (a: A) => boolean): Cell<A | undefined> {
        const out = new MutableCell<A | undefined>(
            f(this.value) ? this.value : undefined,
        );

        this.listen((a) => {
            if (f(a)) {
                out.value = a;
            }
        });

        return out;
    }

    whereSubclass<A2 extends A>(A2_: { new(...args: any[]): A2 }): Cell<A2 | undefined> {
        return this.where((a) => a instanceof A2_).map((a) => a as A2);
    }

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
