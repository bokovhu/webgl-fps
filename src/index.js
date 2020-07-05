const { Platform } = require("./game/platform");
const { Game } = require("./game/game");

const game = new Game();
const platform = new Platform(game.onPlatformInitialized.bind(game));
