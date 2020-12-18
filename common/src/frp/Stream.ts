import { Cell, SimpleCell, StreamAccum, StreamHold } from "./Cell";

export interface StreamSubscription {
    cancel(): void;
}

type Constructor<T> = Function & { prototype: T }

export abstract class Stream<A> {
    // Operational bits

    // abstract link(): void;
    //
    // abstract unlink(): void;

    abstract addListener(h: (a: A) => void): void;

    abstract removeListener(h: (a: A) => void): void;

    abstract listen(h: (a: A) => void): StreamSubscription;

    // Operators

    static never<A>(): Stream<A> {
        return new StreamNever();
    }

    static looped<A>(f: (self: Stream<A>) => Stream<A>) {
        const loop = new StreamLoop<A>();
        const sa = f(loop);
        loop.loop(sa);
        return sa;
    }

    static fromPromise<A>(promise: Promise<A>): Stream<A> {
        const sink = new StreamSink<A>();

        promise.then((a) => {
            sink.send(a);
        });

        return sink;
    }

    static whereNotUndefined<A>(sa: Stream<A | undefined>): Stream<A> {
        return sa.where((a) => a !== undefined).map((a) => a as A);
    }

    map<B>(f: (a: A) => B): Stream<B> {
        return new StreamMap(this, f);
    }

    mapNotUndefined<B>(f: (a: A) => B | undefined): Stream<B> {
        return Stream.whereNotUndefined(this.map(f));
    }

    mapTo<B>(b: B): Stream<B> {
        return this.map(() => b);
    }

    where(predicate: (a: A) => boolean): Stream<A> {
        return new StreamWhere(this, predicate);
    }

    // whereInstanceof<A2 extends A>(A2_: { new(...args: any[]): A2 }): Stream<A2> {
    whereInstanceof<A2 extends A>(A2_: Constructor<A2>): Stream<A2> {
        return this.where((a) => a instanceof A2_)
            .map<A2>((a) => a as A2);
    }

    mergeWith(sa: Stream<A>): Stream<A> {
        return Stream.mergeSet(new Set([this, sa]));
    }

    static mergeSet<A>(s: ReadonlySet<Stream<A>>): Stream<A> {
        return new StreamMergeSet(s);
    }

    static accumSum(sa: Stream<number>, initValue: number = 0): Cell<number> {
        return sa.accum(initValue, (acc, a) => acc + a);
    }

    hold(initValue: A): Cell<A> {
        return new SimpleCell(new StreamHold(initValue, this));
    }

    accum<B>(initValue: B, f: (acc: B, a: A) => B): Cell<B> {
        return new SimpleCell(new StreamAccum(initValue, this, f));
    }

    next(): Promise<A> {
        return new Promise((resolve) => {
            this.addListener(resolve);
        });
    }
}

export abstract class SimpleStream<A> extends Stream<A> {
    // Operational bits

    private readonly _listeners = new Set<(a: A) => void>();

    abstract link(): void;

    abstract unlink(): void;

    addListener(h: (a: A) => void): void {
        const oldSize = this._listeners.size;

        this._listeners.add(h);

        if (oldSize === 0 && this._listeners.size === 1) {
            this.link();
        }
    }

    removeListener(h: (a: A) => void): void {
        const wasThere = this._listeners.delete(h);

        if (!wasThere) {
            throw new Error("Attempted to remove a listener that wasn't present");
        }

        if (wasThere && this._listeners.size === 0) {
            this.unlink();
        }
    }

    listen(h: (a: A) => void): StreamSubscription {
        this.addListener(h);

        let isCanceled = false;

        return {
            cancel: () => {
                if (isCanceled) {
                    throw new Error("Attempted to re-cancel StreamSubscription");
                } else {
                    isCanceled = true;
                    this.removeListener(h);
                }
            }
        };
    }

    protected notify(a: A): void {
        this._listeners.forEach((h) => {
            h(a);
        });
    }

    protected refCount(): number {
        return this._listeners.size;
    }
}


export class StreamLoop<A> extends SimpleStream<A> {
    private _source?: Stream<A>;

    private _sub?: StreamSubscription;

    link(): void {
        this._sub = this._source?.listen((a) => {
            this.notify(a);
        });
    }

    unlink(): void {
        this._sub?.cancel();
    }

    loop(sa: Stream<A>): void {
        if (this._source !== undefined) {
            throw new Error("StreamLoop is already looped");
        }

        if (this.refCount() > 0) {
            throw new Error("StreamLoop already has listeners; too late to loop");
        }

        this._source = sa;
    }
}

export class StreamNever<A> extends SimpleStream<A> {
    link(): void {

    }

    unlink(): void {
    }
}

export class StreamMap<A, B> extends SimpleStream<B> {
    private _sub?: StreamSubscription;

    constructor(
        private readonly _source: Stream<A>,
        private readonly _f: (a: A) => B,
    ) {
        super();
    }


    link(): void {
        this._sub = this._source.listen((a) => {
            this.notify(this._f(a));
        });
    }

    unlink(): void {
        this._sub?.cancel();
    }
}

export class StreamWhere<A> extends SimpleStream<A> {
    private _sub?: StreamSubscription;

    constructor(
        private readonly _source: Stream<A>,
        private readonly _predicate: (a: A) => boolean,
    ) {
        super();
    }


    link(): void {
        this._sub = this._source.listen((a) => {
            if (this._predicate(a)) {
                this.notify(a);
            }
        });
    }

    unlink(): void {
        this._sub?.cancel();
    }
}

export class StreamMergeSet<A> extends SimpleStream<A> {
    private _subs?: ReadonlyArray<StreamSubscription>;

    constructor(
        private readonly _set: ReadonlySet<Stream<A>>,
    ) {
        super();
    }

    link(): void {
        this._subs = [...this._set].map((sa) => sa.listen((a) => {
            this.notify(a);
        }));
    }

    unlink(): void {
        this._subs?.forEach((sub) => {
            sub.cancel();
        });
    }
}

export class StreamSink<A> extends SimpleStream<A> {
    send(a: A): void {
        this.notify(a);
    }

    link(): void {
    }

    unlink(): void {
    }
}
