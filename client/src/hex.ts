import * as ge from "./geometry";
import { Vec2 } from "./geometry";
import { HexCoord } from "@common/game/game";

const h = Math.sqrt(3) / 2;

export function mapHexCoordToWorldPoint(c: HexCoord): Vec2 {
    const x = c.j * (3 / 2);
    const yDelta = c.j % 2 == 0 ? 0 : h;
    const y = c.i * (h * 2) + yDelta;
    return { x, y };
}

export function mapWorldPointToHexCoord(p: Vec2): HexCoord {
    // Search for the reference hex, using simple algebra
    const hj0 = Math.round(p.x * (2 / 3));
    const yDelta = hj0 % 2 === 0 ? 0 : h;
    const hi0 = Math.round((p.y - yDelta) / (2 * h));
    const h0: HexCoord = { i: hi0, j: hj0 };

    // The central section of the hex.
    const b0 = hj0 * (3 / 2) - 0.5;
    const b1 = b0 + 1;

    if (p.x >= b0 && p.x <= b1) {
        // The point is in the central part! Easy.
        return h0;
    }

    const hw = mapHexCoordToWorldPoint(h0);

    // The relative position vector: [reference hex center -> P]
    const d = ge.sub(p, hw);
    const qx = d.x < 0 ? -1 : 1;
    const qy = d.y < 0 ? -1 : 1;

    // A vector proportional to the height (h = sqrt(3)/2) dropped from the hex center
    // to the appropriate edge
    const hv = { x: qx * h, y: qy * 0.5 };

    // A scalar projection of `d` to `hv`
    const ds = ge.scalarProj(d, hv);

    if (ds <= h) {
        // If the scalar projection is smaller than h, it means the point is still
        // within the reference hex. It's the second most typical case.
        return h0;
    } else {
        // The point is in the reference hex's neighbour. It's a corner case.
        const hj = qx < 0 ? hj0 - 1 : hj0 + 1;

        if (qy < 0) {
            return { i: hi0 + ((hj0 % 2 == 0) ? -1 : 0), j: hj };
        } else {
            return { i: hi0 + ((hj0 % 2 == 0) ? 0 : 1), j: hj };
        }
    }
}
