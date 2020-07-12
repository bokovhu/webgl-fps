require("./styles/index.scss");
const { Platform } = require("@me.bokov.webglfps/platform");
const { Game } = require("@me.bokov.webglfps/game");

const game = new Game();
const platform = new Platform(game.onPlatformInitialized.bind(game));
