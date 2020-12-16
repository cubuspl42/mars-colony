import { MutableCell } from "@common/frp/Cell";
import { createHexGridCanvas } from "./drawing";
import { Game, HexCoord } from "@common/game/game";
import { createBuildingGroup } from "./buildings_group";
import { createHudElement } from "./hud";
import { ClientGame } from "./game/game";
import { Stream, StreamSink } from "@common/frp/Stream";

interface ButtonElement {
    readonly element: HTMLElement;
    readonly onPressed: Stream<null>;
}

function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    args: {
        readonly init?: (style: CSSStyleDeclaration, element: HTMLElementTagNameMap[K]) => void,
        readonly children?: ReadonlyArray<Node>,
    },
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);

    const init = args?.init;

    if (init !== undefined) {
        init(element.style, element);
    }

    args?.children?.forEach((child) => {
        element.appendChild(child);
    });

    return element;
}

function createButtonElement(args: {
    readonly init?: (style: CSSStyleDeclaration, element: HTMLButtonElement) => void,
    readonly text: string,
},): ButtonElement {
    const onPressed = new StreamSink<null>();

    const element = createElement("button", {
        init: (style, element) => {
            element.addEventListener("click", () => {
                onPressed.send(null);
            });

            const init = args?.init;

            if (init !== undefined) {
                init(style, element);
            }

            element.innerText = args.text;
        },
    })

    return {
        element,
        onPressed,
    };
}

enum LoginState {
    IDLE,
    LOGGING_IN,
}

enum LoginError {
    INCORRECT_USERNAME_PASSWORD,
}

function createLoginView(): HTMLElement {
    const submitButton = createButtonElement({
        init: (style, element) => {
            style.marginTop = "10px";
            style.padding = "10px";
        },
        text: "Sign in!",
    });

    const state = new MutableCell(LoginState.IDLE);



    const error = new MutableCell<LoginError | undefined>(undefined);

    const createLabeledTextInput = (args: {
        readonly labelTex: string,
    }) =>
        createElement("div", {
            init: (style, element) => {
                style.width = "100%";
                style.display = "flex";
                style.flexDirection = "column";
                style.marginBottom = `10px`;
            },
            children: [
                createElement("label", {
                    init: (style, element) => {
                        element.innerText = args.labelTex;
                        style.marginBottom = `5px`;
                    },
                }),
                createElement("input", {
                    init: (style, element) => {
                        element.type = "text";
                    },
                }),
            ],
        });

    return createElement("div", {
        init: (style, element) => {
            style.width = "100vw";
            style.height = "100vh";
            style.backgroundColor = "#d4d4d4";

            style.display = "flex";
            style.justifyContent = "center";
            style.alignItems = "center";
        },
        children: [
            createElement("div", {
                init: (style, element) => {
                    style.width = "200px";
                    style.padding = "20px";

                    style.backgroundColor = "#8d8d8d";

                    style.display = "flex";
                    style.flexDirection = "column";
                    style.justifyContent = "center";
                    style.alignItems = "center";
                },
                children: [
                    createLabeledTextInput({
                        labelTex: "Username",
                    }),
                    createLabeledTextInput({
                        labelTex: "Password",
                    }),
                    createElement("button", {
                        init: (style, element) => {
                            element.innerText = "Log in";

                            element.onclick = () => {

                            };

                            style.marginTop = "10px";
                            style.padding = "10px";
                        }
                    }),
                    submitButton.element,
                ]
            }),
        ]
    });
}

function createGameView(game: Game): HTMLElement {
    const selectedHexCoord = new MutableCell<HexCoord>({ i: 0, j: 0 });

    const gameView = document.createElement("div");

    gameView.style.position = "relative";
    gameView.style.width = "100vw";
    gameView.style.height = "100vh";

    const canvas = createHexGridCanvas({
        selectedHexCoord: selectedHexCoord,
        game: game,
    });

    canvas.style.position = "absolute";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.left = "0";
    canvas.style.right = "0";

    gameView.appendChild(canvas);

    const buildingsGroup = createBuildingGroup({ game });

    gameView.appendChild(buildingsGroup);

    const hud = createHudElement({ game });

    gameView.appendChild(hud);

    return gameView;
}

async function main() {
    const loginView = createLoginView();

    const game = await ClientGame.connect();

    const gameView = createGameView(game);

    document.body.appendChild(loginView);
}

main();
