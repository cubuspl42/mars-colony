import { Stream, StreamSink } from "./frp/Stream";

export function periodic(periodMillis: number): Stream<null> {
    const out = new StreamSink<null>();

    const register = () => setTimeout(() => {
        out.send(null);
        register();
    }, periodMillis);

    register();

    return out;
}
