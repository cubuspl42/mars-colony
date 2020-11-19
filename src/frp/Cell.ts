import { Stream, StreamSink } from "./Stream";

export abstract class Cell<A> {
    abstract get value(): A;

    abstract values(): Stream<A>;
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

    values(): Stream<A> {
        return this._stream;
    }
}
