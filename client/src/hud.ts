import { Game } from "./game/game";
import { Cell } from "@common/frp/Cell";

function createTextNode(text: Cell<string>): Text {
    const node = document.createTextNode(text.value);

    text.listen((t) => {
        node.textContent = t;
    });

    return node;
}

export function createHudElement(args: {
    readonly game: Game,
}): HTMLElement {
    const { game } = args;

    const wrapper = document.createElement("div");
    wrapper.style.position = "absolute";

    const container = document.createElement("div");
    container.style.padding = "16px";
    wrapper.appendChild(container);

    const appendHudTextNode = (c: Cell<string>): void => {
        const textNode = createTextNode(c);

        const span = document.createElement("span");
        span.style.marginRight = "10px";

        span.appendChild(textNode);

        container.appendChild(span);
    }

    appendHudTextNode(game.xpCount.map((x) => `XP: ${x}`));

    appendHudTextNode(game.ironAmount.map((ia) => `Iron: ${ia}`));

    return wrapper;
}
