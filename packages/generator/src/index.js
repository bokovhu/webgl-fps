import { NOISE, GENTHRESHOLD } from "./constants";

import { Chunk } from "./chunk";
export { Chunk } from "./chunk";

export function buildChunkGraph(chunks, numChunks) {
    const chunkIdx = (x, y, z) =>
        z * numChunks[1] * numChunks[0] + y * numChunks[0] + x;

    let chunkPtr = 0;
    for (let cz = 0; cz < numChunks[2]; cz++) {
        for (let cy = 0; cy < numChunks[1]; cy++) {
            for (let cx = 0; cx < numChunks[0]; cx++) {
                const chunk = chunks[chunkPtr];
                if (cx > 0) chunk.prev.x = chunks[chunkIdx(cx - 1, cy, cz)];
                if (cx < numChunks[0] - 1)
                    chunk.next.x = chunks[chunkIdx(cx + 1, cy, cz)];
                if (cy > 0) chunk.prev.y = chunks[chunkIdx(cx, cy - 1, cz)];
                if (cy < numChunks[1] - 1)
                    chunk.next.y = chunks[chunkIdx(cx, cy + 1, cz)];
                if (cz > 0) chunk.prev.z = chunks[chunkIdx(cx, cy, cz - 1)];
                if (cz < numChunks[2] - 1)
                    chunk.next.z = chunks[chunkIdx(cx, cy, cz + 1)];

                ++chunkPtr;
            }
        }
    }
}

export function generateChunks(opts) {
    const { numChunks, chunkSize, coords } = opts;
    let { transformCoordinates, generateValue } = opts;
    if (!transformCoordinates) {
        transformCoordinates = (x, y, z) => [
            x / 34.0 + Math.sin((x / chunkSize[0]) * Math.PI * 0.3) * 0.006,
            y / 37.0 -
                Math.cos(
                    Math.cos(x * 4.0) - Math.sin(y * 6.7) + Math.sin(z * 2.4)
                ) *
                    0.001,
            z / 46.0 +
                Math.cos((5 + x / chunkSize[0]) * Math.PI * 0.4) * 0.007,
        ];
    }
    if (!generateValue) {
        generateValue = (x, y, z) => {
            const noiseValue = NOISE.noise3D(x, y, z);

            if (noiseValue < GENTHRESHOLD[1]) {
                const clampedNoiseValue = Math.max(
                    GENTHRESHOLD[0],
                    Math.min(GENTHRESHOLD[1], noiseValue)
                );
                const translatedNoiseValue =
                    clampedNoiseValue - GENTHRESHOLD[0];
                const normalizedNoiseValue =
                    translatedNoiseValue /
                    Math.abs(GENTHRESHOLD[1] - GENTHRESHOLD[0]);
                const amount = Math.floor(255.0 * normalizedNoiseValue);
                return ((amount & 0xff) << 8) | 0x01;
            }

            return 0x0000;
        };
    }

    const chunks = [];
    const totalNumChunks = numChunks[2] * numChunks[1] * numChunks[0];
    let chunkPtr = 0;
    console.log(`About to generate ${totalNumChunks} chunks ...`);

    const offsetX = coords ? coords[0] : 0;
    const offsetY = coords ? coords[1] : 0;
    const offsetZ = coords ? coords[2] : 0;

    for (let cz = 0; cz < numChunks[2]; cz++) {
        for (let cy = 0; cy < numChunks[1]; cy++) {
            for (let cx = 0; cx < numChunks[0]; cx++) {
                if (chunkPtr % 16 === 0) {
                    console.log(`${chunkPtr} / ${totalNumChunks} done`);
                }

                const chunkCoords = [
                    cx * (chunkSize[0] - 1) + offsetX * (chunkSize[0] - 1),
                    cy * (chunkSize[1] - 1) + offsetY * (chunkSize[1] - 1),
                    cz * (chunkSize[2] - 1) + offsetZ * (chunkSize[2] - 1),
                ];

                const chunk = new Chunk(
                    chunkCoords,
                    chunkSize,
                    (size) => new Uint16Array(size)
                );

                for (let vz = 0; vz < chunkSize[2]; vz++) {
                    for (let vy = 0; vy < chunkSize[1]; vy++) {
                        for (let vx = 0; vx < chunkSize[0]; vx++) {
                            const untransformed = [
                                chunkCoords[0] + vx,
                                chunkCoords[1] + vy,
                                chunkCoords[2] + vz,
                            ];
                            const transformed = transformCoordinates(
                                untransformed[0],
                                untransformed[1],
                                untransformed[2]
                            );
                            const value = generateValue(
                                transformed[0],
                                transformed[1],
                                transformed[2]
                            );
                            chunk.setAt(vx, vy, vz, value);
                        }
                    }
                }

                chunks.push(chunk);
                ++chunkPtr;
            }
        }
    }

    buildChunkGraph(chunks, numChunks);

    return chunks;
}

export function convertChunks(chunks, numChunks) {
    const levelSetChunks = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const levelSet = new Chunk(
            chunk.coords,
            chunk.size,
            (size) => new Float32Array(size)
        );

        for (let z = 0; z < chunk.size[2]; z++) {
            for (let y = 0; y < chunk.size[1]; y++) {
                for (let x = 0; x < chunk.size[0]; x++) {
                    const v = chunk.dataAt(x, y, z);
                    const amount = v & (0xff00 >> 8);
                    const type = v & 0x00ff;

                    if (type !== 0) {
                        levelSet.setAt(x, y, z, amount / 255.0 - 0.5);
                    } else {
                        levelSet.setAt(x, y, z, 0.5);
                    }
                }
            }
        }

        levelSetChunks.push(levelSet);
    }

    buildChunkGraph(levelSetChunks, numChunks);

    return levelSetChunks;
}
