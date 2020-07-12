const { generateChunks, convertChunks } = require("@me.bokov.webglfps/generator");
const { default: marchingCubes } = require("@me.bokov.webglfps/marching-cubes");
const {
    translateRawMesh,
    flipNormalsInRawMesh,
} = require("@me.bokov.webglfps/mesh");

export function generate(chunkSize, numChunks, coords) {
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