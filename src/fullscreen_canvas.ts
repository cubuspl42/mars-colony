import { Stream } from "./frp/Stream";

export function createFullscreenCanvas(
    redraw: (context: CanvasRenderingContext2D) => void,
    sRedraw: Stream<null>,
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        redraw(context);
    }

    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);

    sRedraw.listen(() => redraw(context));

    return canvas;
}
