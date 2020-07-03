const { generateChunks, convertChunks } = require("./gen/generate");
const { measure } = require("./util/measure");
const { default: marchingCubes } = require("./mc");
const { translateRawMesh } = require("./render/mesh-renderer");

function prepare(opts) {
    

    return {
        chunks,
        levelSetChunks,
        rawMeshes,
    };
}
self.onmessage = function (event) {
    const result = prepare(event.data);

    self.postMessage({
        type: "info",
        numChunks: result.chunks.length,
        numLevelSetChunks: result.levelSetChunks.length,
        numRawMeshes: result.rawMeshes.length,
    });

    for (let i = 0; i < result.chunks.length; i++) {
        self.postMessage({
            type: "chunk",
            data: result.chunks[i],
            index: i,
        });
    }

    for (let i = 0; i < result.levelSetChunks.length; i++) {
        self.postMessage({
            type: "levelset-chunk",
            data: result.levelSetChunks[i],
            index: i,
        });
    }

    for (let i = 0; i < result.rawMeshes.length; i++) {
        self.postMessage({
            type: "rawmesh",
            data: result.rawMeshes[i],
            index: i,
        });
    }
};
