import { Cell, StreamAccum, StreamHold } from "./Cell";

export interface StreamSubscription {
    cancel(): void;
}

export abstract class Stream<A> {
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
            throw new Error();
        }

        if (wasThere && this._listeners.size === 0) {
            this.unlink();
        }
    }

    listen(h: (a: A) => void): StreamSubscription {
        this.addListener(h);

        return {
            cancel: () => {
                this.removeListener(h);
            }
        };
    }

    protected notify(a: A): void {
        this._listeners.forEach((h) => {
            h(a);
        });
    }

    // Operators

    static never<A>(): Stream<A> {
        return new StreamNever();
    }

    map<B>(f: (a: A) => B): Stream<B> {
        return new StreamMap(this, f);
    }

    mapTo<B>(b: B): Stream<B> {
        return this.map(() => b);
    }

    static mergeSet<A>(s: ReadonlySet<Stream<A>>): Stream<A> {
        return new StreamMergeSet(s);
    }

    static accumSum(sa: Stream<number>, initValue: number = 0): Cell<number> {
        return sa.accum(initValue, (acc, a) => acc + a);
    }

    hold(initValue: A): Cell<A> {
        return new Cell(new StreamHold(initValue, this));
    }

    accum(initValue: A, f: (acc: A, a: A) => A): Cell<A> {
        return new Cell(new StreamAccum(initValue, this, f));
    }
}

export class StreamNever<A> extends Stream<A> {
    link(): void {

    }

    unlink(): void {
    }
}

export class StreamMap<A, B> extends Stream<B> {
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


export class StreamMergeSet<A> extends Stream<A> {
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


export class StreamSink<A> extends Stream<A> {
    send(a: A): void {
        this.notify(a);
    }

    link(): void {
    }

    unlink(): void {
    }
}
