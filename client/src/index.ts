import { Cell, CellLoop, MutableCell, SourceCell } from "@common/frp/Cell";
import { createHexGridCanvas } from "./drawing";
import { Game, HexCoord } from "@common/game/game";
import { createBuildingGroup } from "./buildings_group";
import { createHudElement } from "./hud";
import { ClientGame } from "./game/game";
import { SourceStream, Stream, StreamSink, StreamSubscription } from "@common/frp/Stream";
import { BackendClient, GameClient, SignInError } from "./game/network";
import { linkElement } from "./dom";

interface ButtonElement {
    readonly element: HTMLElement;
    readonly onPressed: Stream<null>;
}

interface LoginViewElement {
    readonly element: HTMLElement;
    readonly sGame: Stream<Game>;
}

function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    args?: {
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

type LoginState = null | Promise<SignInError | Game>;

interface TextInputElement {
    readonly element: HTMLElement;
    readonly cText: Cell<string>;
}

function htmlEventStream<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
): Stream<HTMLElementEventMap[K]> {
    return new SourceStream((notify) => {
        element.addEventListener(type, notify);
        return <StreamSubscription>{
            cancel(): void {
                element.removeEventListener(type, notify);
            }
        }
    })
}

const createLabeledTextInput = (args: {
    readonly labelTex: string,
}) => {
    const input = createElement("input", {
        init: (style, element) => {
            element.type = "text";
        },
    });

    const element = createElement("div", {
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
            input,
        ],
    });

    const cText = new SourceCell(
        htmlEventStream(input, "input").map(() => input.value),
        () => input.value,
    )

    return <TextInputElement>{
        element,
        cText,
    };
};

function createLoginView(backendClient: BackendClient): LoginViewElement {
    const usernameTextInput = createLabeledTextInput({
        labelTex: "Username",
    });

    const passwordTextInput = createLabeledTextInput({
        labelTex: "Password",
    });

    async function signIn(): Promise<SignInError | Game> {
        const username = usernameTextInput.cText.value;
        const password = passwordTextInput.cText.value;

        const result = await backendClient.signIn({
            username,
            password,
        });

        if (!(result instanceof GameClient)) {
            return result;
        }

        const game = await ClientGame.connect(result);

        return game;
    }

    const cLoginStateLoop = new CellLoop<LoginState>();

    // const  sSignInErrorLoop = new CellLoop<SignInError>();

    const submitButton = createButtonElement({
        init: (style, element) => {
            style.marginTop = "10px";
            style.padding = "10px";
        },
        text: "Sign in!",
    });

    // const sSignInError_: Stream<SignInError> = Stream.never();

    const sSignInResult = Cell.switchNotNullP(cLoginStateLoop);

    const sSignInError = sSignInResult.mapNotUndefined(
        (r) => r instanceof Game ? undefined : r,
    );

    const cSignInError = (sSignInError as Stream<SignInError | null>).hold(null);


    const sGame = sSignInResult.whereInstanceof(Game);


    const cLoginState = submitButton.onPressed
        .map<LoginState>(() => signIn())
        .mergeWith(sSignInError.mapTo<LoginState>(null))
        .hold(null);

    cLoginStateLoop.loop(cLoginState);

    // const x = cSignInResult.switchMapS()

    // const state = new MutableCell(LoginState.IDLE);


    // const error = new MutableCell<LoginError | undefined>(undefined);


    const createErrorLabel = (): HTMLElement => {
        const element = createElement("div");

        const cErrorText = cSignInError.map((err) => {
            if (err === null) {
                return "";
            } else {
                switch (err) {
                    case SignInError.INCORRECT_CREDENTIALS:
                        return "Incorrect credentials";
                    case SignInError.UNKNOWN_ERROR:
                        return "Unknown sign-in error";
                }
            }
        }).map((s) => document.createTextNode(s));

        linkElement(cErrorText, element);

        return element;
    }


    const element = createElement("div", {
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
                    usernameTextInput.element,
                    passwordTextInput.element,
                    submitButton.element,
                    createErrorLabel(),
                ]
            }),
        ]
    });

    return {
        element,
        sGame: sGame,
    }
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
    const loginView = createLoginView(new BackendClient());

    const cRoot = loginView.sGame
        .map(createGameView)
        .hold(loginView.element);

    linkElement(cRoot, document.body);
}

main();
