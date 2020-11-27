import { Cell } from "./Cell";
import { Stream, StreamSink } from "./Stream";

export class Sets {
    static sum<A>(s: ReadonlySet<number>): number {
        let acc = 0;
        s.forEach((a) => {
            acc += a;
        });
        return acc;
    }
}

export type SetMergeFn<A, B> = (s: ReadonlySet<A>) => B;

export abstract class ReactiveSet<A> {
    static flatten<A>(c: Cell<ReadonlySet<A>>): ReactiveSet<A> {
        return new FlattenedReactiveSet(c);
    }

    static fuse<A>(rs: ReactiveSet<Cell<A>>): ReactiveSet<A> {
        return ReactiveSet.flatten(
            rs.asCell()
                .flatMap((cs) =>
                    Cell.sequenceArray([...cs])
                        .map((a) => new Set(a)),
                ),
        );
    }

    static merge<A, B>(rs: ReactiveSet<Stream<A>>): Stream<A> {
        return rs.asCell()
            .switchMapS((ssa) =>
                Stream.mergeSet(ssa)
            );
    }

    abstract asCell(): Cell<ReadonlySet<A>>;

    has(a: A): Cell<boolean> {
        return this.asCell().map((set) => set.has(a));
    }

    map<B>(f: (a: A) => B): ReactiveSet<B> {
        const cell = this.asCell().map((set) => {
            const array = [...set];
            const mappedArray = array.map((a) => f(a));
            const mappedSet = new Set(mappedArray);
            return mappedSet;
        });
        return ReactiveSet.flatten(cell);
    }

    singleWhere(f: (a: A) => boolean): Cell<A | undefined> {
        return this.asCell().map((set) => {
            const array = [...set];
            const matchingElements = [...set].filter((a) => f(a));
            if (matchingElements.length === 1) {
                return matchingElements[0];
            } else {
                return undefined;
            }
        })
    }

    fuseMap<B>(f: (a: A) => Cell<B>): ReactiveSet<B> {
        return ReactiveSet.fuse(this.map(f));
    }

    mergeMap<B>(f: (a: A) => Stream<B>): Stream<B> {
        return ReactiveSet.merge(this.map(f));
    }
}

export class FlattenedReactiveSet<K, A> extends ReactiveSet<A> {
    private readonly _cell: Cell<ReadonlySet<A>>;

    constructor(cell: Cell<ReadonlySet<A>>) {
        super();
        this._cell = cell;
    }

    asCell(): Cell<ReadonlySet<A>> {
        return this._cell;
    }
}

export class MutableReactiveSet<A> extends ReactiveSet<A> {
    private readonly _set: Set<A>;

    private readonly _onChanged = new StreamSink<null>();

    constructor(initialContent?: ReadonlySet<A>) {
        super();
        this._set = new Set<A>(initialContent ?? []);
    }

    asCell(): Cell<ReadonlySet<A>> {
        return this._onChanged.mapTo(this._set).hold(this._set);
    }

    add(a: A): void {
        this._set.add(a);
        this._onChanged.send(null);
    }

    delete(a: A): void {
        this._set.delete(a);
        this._onChanged.send(null);
    }
}
