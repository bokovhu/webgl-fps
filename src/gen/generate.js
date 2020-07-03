import SimplexNoise from "simplex-noise";

class Chunk {
    constructor(coords, size, makeData) {
        this.coords = coords;
        this.size = size;
        this.dataSize = size[2] * size[1] * size[0];
        this.data = makeData(this.dataSize);
        this.next = {
            x: undefined,
            y: undefined,
            z: undefined,
        };
        this.prev = {
            x: undefined,
            y: undefined,
            z: undefined,
        };
    }

    idx(x, y, z) {
        /* x = x - Math.floor(x / this.size[0]) * this.size[0];
        y = y - Math.floor(y / this.size[1]) * this.size[1];
        z = z - Math.floor(z / this.size[2]) * this.size[2]; */

        if (
            x >= 0 &&
            x < this.size[0] &&
            y >= 0 &&
            y < this.size[1] &&
            z >= 0 &&
            z < this.size[2]
        ) {
            return z * this.size[1] * this.size[0] + y * this.size[0] + x;
        }
        return undefined;
    }

    xyz(index) {
        const x = index % this.size[0];
        const y = ((index - x) % this.size[1]) / this.size[0];
        const z =
            (index - x - y * this.size[0]) / (this.size[1] * this.size[0]);

        return [this.x + x, this.y + y, this.z + z];
    }

    dataAt(x, y, z) {
        const idx = this.idx(x, y, z);
        if (typeof idx !== "undefined") {
            return this.data[idx];
        }
        return undefined;
    }

    dataAtIndex(index) {
        if (index >= 0 && index < this.dataSize) {
            return this.data[index];
        }
        return undefined;
    }

    dataAtWithJump(x, y, z) {
        const idx = this.idx(x, y, z);
        if (typeof idx !== "undefined") {
            return this.data[idx];
        }

        if (x < 0) {
            if (this.prev.x) {
                return this.prev.x.dataAtWithJump(x + this.size[0], y, z);
            }
            return undefined;
        }
        if (x >= this.size[0]) {
            if (this.next.x) {
                return this.next.x.dataAtWithJump(x - this.size[0], y, z);
            }
            return undefined;
        }

        if (y < 0) {
            if (this.prev.y) {
                return this.prev.y.dataAtWithJump(x, y + this.size[1], z);
            }
            return undefined;
        }
        if (y >= this.size[1]) {
            if (this.next.y) {
                return this.next.y.dataAtWithJump(x, y - this.size[1], z);
            }
            return undefined;
        }

        if (z < 0) {
            if (this.prev.z) {
                return this.prev.z.dataAtWithJump(x, y, z + this.size[2]);
            }
            return undefined;
        }
        if (z >= this.size[2]) {
            if (this.next.z) {
                return this.next.z.dataAtWithJump(x, y, z - this.size[2]);
            }
            return undefined;
        }

        return undefined;
    }

    setAt(x, y, z, v) {
        const idx = this.idx(x, y, z);
        if (typeof idx !== "undefined") {
            this.data[idx] = v;
        }
    }

    setAtIndex(index, v) {
        if (index >= 0 && index < this.dataSize) {
            this.data[index] = v;
        }
    }
}

function buildChunkGraph(chunks, numChunks) {
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

const noise = new SimplexNoise(Math.random);

const g_threshold = -0.4;

export function generateChunks(opts) {
    const { numChunks, chunkSize } = opts;
    let { transformCoordinates, generateValue } = opts;
    if (!transformCoordinates) {
        transformCoordinates = (x, y, z) => [
            x / 64.0 + Math.sin((x / chunkSize[0]) * Math.PI * 0.3) * 0.42,
            y / 48.0,
            z / 70.0 + Math.cos((5 + x / chunkSize[0]) * Math.PI * 0.4) * 0.23,
        ];
    }
    if (!generateValue) {
        generateValue = (x, y, z) => {

            const noiseValue = noise.noise3D(x, y, z);

            if (noiseValue < g_threshold) {
                const amount = Math.floor(
                    (255.0 * (noiseValue - g_threshold)) / (g_threshold / 1.0)
                );
                return ((amount & 0xff) << 8) | 0x01;
            }

            return 0x0000;
        };
    }

    const chunks = [];
    const totalNumChunks = numChunks[2] * numChunks[1] * numChunks[0];
    let chunkPtr = 0;
    console.log(`About to generate ${totalNumChunks} chunks ...`);

    for (let cz = 0; cz < numChunks[2]; cz++) {
        for (let cy = 0; cy < numChunks[1]; cy++) {
            for (let cx = 0; cx < numChunks[0]; cx++) {
                if (chunkPtr % 16 === 0) {
                    console.log(`${chunkPtr} / ${totalNumChunks} done`);
                }

                const chunkCoords = [
                    cx * chunkSize[0],
                    cy * chunkSize[1],
                    cz * chunkSize[2],
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
