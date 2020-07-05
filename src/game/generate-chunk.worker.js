const { generateChunks, convertChunks } = require("../gen/generate");
const { default: marchingCubes } = require("../mc");
const {
    translateRawMesh,
    flipNormalsInRawMesh,
} = require("../render/mesh-utils");

function generate(chunkSize, numChunks, coords) {
    const chunks = generateChunks({
        numChunks,
        chunkSize,
        coords,
    });
    const levelSetChunks = convertChunks(chunks, numChunks);
    const rawMeshes = levelSetChunks
        .map((chunk) => ({
            mesh: marchingCubes({
                chunk: chunk,
                size: chunk.size,
                isoLevel: 0.0,
                diagnostics: true,
            }),
            chunk,
        }))
        .map((rawMesh) => ({
            chunk: rawMesh.chunk,
            mesh: translateRawMesh(rawMesh.mesh, rawMesh.chunk.coords),
        }));
    chunks.forEach((chunk) => {
        chunk.next.x = undefined;
        chunk.next.y = undefined;
        chunk.next.z = undefined;
        chunk.prev.x = undefined;
        chunk.prev.y = undefined;
        chunk.prev.z = undefined;
    });

    return { rawMeshes };
}

self.onmessage = (event) => {
    const { chunkSize, numChunks, coords } = event.data;
    console.log("background worker -> ", { chunkSize, numChunks, coords });

    const result = generate(chunkSize, numChunks, coords);
    console.log("background worker finished, posting ...");
    self.postMessage(result);
};
