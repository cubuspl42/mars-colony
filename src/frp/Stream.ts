import { Cell, MutableCell } from "./Cell";

export abstract class Stream<A> {
    hold(initValue: A): Cell<A> {
        const cell = new MutableCell<A>(initValue);
        this.listen((a) => {
            cell.value = a;
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
