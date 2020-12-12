import { Stream, StreamSubscription } from "./Stream";

export class Cell<A> {
    // Operational bits

    readonly _self: CellStream<A>;

    constructor(
        self: CellStream<A>,
    ) {
        this._self = self;
    }

    get value(): A {
        return this._self.value;
    }

    values(): Stream<A> {
        return this._self;
    }

    listen(h: (a: A) => void): StreamSubscription {
        return this.values().listen(h);
    }

    // Operators

    static switchC<A>(cca: Cell<Cell<A>>): Cell<A> {
        return new Cell(new CellSwitchC(cca));
    }

    static switchS<A>(csa: Cell<Stream<A>>): Stream<A> {
        return new CellSwitchS(csa);
    }

    static map2<A, B, C>(ca: Cell<A>, cb: Cell<B>, f: (a: A, b: B) => C): Cell<C> {
        return ca.switchMapC((a) => cb.map((b) => f(a, b)));
    }

    static sequenceArray<A>(ac: ReadonlyArray<Cell<A>>): Cell<ReadonlyArray<A>> {
        return new Cell(new CellSequenceArray(ac));
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

    map<B>(f: (a: A) => B): Cell<B> {
        return this.values().map(f).hold(f(this.value));
    }

    mapTo<B>(b: B): Cell<B> {
        return this.map((_) => b);
    }

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
        return this.where((a) => a instanceof A2_)
            .map<A2 | undefined>((a) => a as A2);
    }


}

export abstract class CellStream<A> extends Stream<A> {
    private _value: A;

    protected constructor(
        initValue: A,
        private readonly _values?: Stream<A>,
    ) {
        super();
        this._value = initValue;
    }

    get value(): A {
        return this._value;
    }

    protected notify(a: A) {
        this._value = a;
        super.notify(a);
    }

    _send(a: A) {
        this.notify(a);
    }
}

export class StreamHold<A> extends CellStream<A> {
    private _sub?: StreamSubscription;

    constructor(
        initValue: A,
        private readonly _source: Stream<A>,
    ) {
        super(initValue);
    }

    link(): void {
        this._sub = this._source.listen((a) => {
            this.notify(a);
        });
    }

    unlink(): void {
        this._sub?.cancel();
    }
}

export class StreamAccum<A, B> extends CellStream<B> {
    private _sub?: StreamSubscription;

    constructor(
        initValue: B,
        private readonly _source: Stream<A>,
        private readonly _f: (acc: B, a: A) => B,
    ) {
        super(initValue);
    }


    link(): void {
        this._sub = this._source.listen((a) => {
            this.notify(this._f(this.value, a));
        });
    }

    unlink(): void {
        this._sub?.cancel();
    }
}

export class Const<A> extends Cell<A> {
    constructor(value: A) {
        super(new StreamHold(value, Stream.never()));
    }
}

export class MutableCell<A> extends Cell<A> {
    constructor(initValue: A) {
        super(new StreamHold(initValue, Stream.never()));
    }

    get value(): A {
        return this._self.value;
    }

    set value(a: A) {
        this._self._send(a);
    }
}

export class CellSwitchC<A> extends CellStream<A> {
    private _subOuter?: StreamSubscription;

    private _subInner?: StreamSubscription;

    constructor(private readonly _source: Cell<Cell<A>>) {
        super(_source.value.value);
    }

    link(): void {
        const listenInner = (inner: Cell<A>): void => {
            this._subInner?.cancel();
            this._subInner = inner.listen((a) => {
                this.notify(a);
            });
        }

        this._subOuter = this._source.listen((inner) => {
            this.notify(inner.value);
            listenInner(inner);
        });

        listenInner(this._source.value);
    }

    unlink(): void {
        this._subInner?.cancel();
        this._subOuter?.cancel();
    }
}

export class CellSwitchS<A> extends Stream<A> {
    private _subOuter?: StreamSubscription;

    private _subInner?: StreamSubscription;

    constructor(private readonly _source: Cell<Stream<A>>) {
        super();
    }

    link(): void {
        const listenInner = (inner: Stream<A>): void => {
            this._subInner?.cancel();
            this._subInner = inner.listen((a) => {
                this.notify(a);
            });
        }

        this._subOuter = this._source.listen((inner) => {
            listenInner(inner);
        });

        listenInner(this._source.value);
    }

    unlink(): void {
        this._subInner?.cancel();
        this._subOuter?.cancel();
    }
}

export class CellSequenceArray<A> extends CellStream<ReadonlyArray<A>> {
    private _subs?: ReadonlyArray<StreamSubscription>;

    constructor(private readonly _array: ReadonlyArray<Cell<A>>) {
        super(_array.map((ca) => ca.value));
    }

    link(): void {
        this._subs = this._array.map((ca) => ca.listen((_) => {
            const arr = this._array.map((ca) => ca.value);
            this.notify(arr);
        }))
    }

    unlink(): void {
        this._subs?.forEach((sub) => {
            sub.cancel();
        });
    }
}
