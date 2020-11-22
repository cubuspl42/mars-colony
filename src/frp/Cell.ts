import { Stream, StreamSink } from "./Stream";

export abstract class Cell<A> {
    abstract get value(): A;

    abstract values(): Stream<A>;

    abstract listen(h: (a: A) => void): void;
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
