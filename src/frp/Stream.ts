import { Cell, MutableCell } from "./Cell";

export abstract class Stream<A> {
    static never<A>(): Stream<A> {
        return new StreamSink();
    }

    static mergeSet<A, B>(s: ReadonlySet<Stream<A>>): Stream<A> {
        const out = new StreamSink<A>();

        s.forEach((sa) => {
            sa.listen((a) => out.send(a));
        });

        return out;
    }

    static accumSum(sa: Stream<number>, initValue: number = 0): Cell<number> {
        return sa.accum(initValue, (acc, a) => acc + a);
    }

    hold(initValue: A): Cell<A> {
        const cell = new MutableCell<A>(initValue);
        this.listen((a) => {
            cell.value = a;
        });
        return cell;
    }

    accum(initValue: A, f: (acc: A, a: A) => A): Cell<A> {
        const cell = new MutableCell<A>(initValue);
        this.listen((a) => {
            cell.value = f(cell.value, a);
        });
        return cell;
    }

    map<B>(f: (a: A) => B): Stream<B> {
        const out = new StreamSink<B>();
        this.listen((a) => {
            out.send(f(a));
        });
        return out;
    }

    mapTo<B>(b: B): Stream<B> {
        return this.map(() => b);
    }

    abstract listen(h: (a: A) => void): void;

}

export class StreamSink<A> extends Stream<A> {
    private readonly _listeners = new Set<(a: A) => void>();

    send(a: A): void {
        this._listeners.forEach((h) => h(a));
    }

    listen(h: (a: A) => void) {
        this._listeners.add(h);
    }
}
