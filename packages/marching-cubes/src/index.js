import edgeTable from "./edge-table";
import triangleTable from "./triangle-table";
import { vec3 } from "gl-matrix";
import {
    optimizeRawMesh,
    rawMeshFromTriangleList,
    unoptimizedRawMesh,
} from "@me.bokov.webglfps/mesh";
import { measure } from "@me.bokov.webglfps/util";

function interp(a, b, l) {
    if (Math.abs(l - a[0]) < 0.0001) return a.slice(1);
    if (Math.abs(l - b[0]) < 0.0001) return b.slice(1);
    if (Math.abs(a[0] - b[0]) < 0.0001) return a.slice(1);
    const alpha = Math.abs((l - a[0]) / (b[0] - a[0]));
    return [
        a[1] + (b[1] - a[1]) * alpha,
        a[2] + (b[2] - a[2]) * alpha,
        a[3] + (b[3] - a[3]) * alpha,
    ];
}

function fetchTrilinear(grid, idx, p) {
    const x0 = Math.floor(p[0]);
    const y0 = Math.floor(p[1]);
    const z0 = Math.floor(p[2]);
    const dX = p[0] - x0;
    const dY = p[1] - y0;
    const dZ = p[2] - z0;
    const [v000, v001, v010, v011, v100, v101, v110, v111] = [
        grid[idx(x0, y0, z0)],
        grid[idx(x0, y0, z0 + 1)],
        grid[idx(x0, y0 + 1, z0)],
        grid[idx(x0, y0 + 1, z0 + 1)],
        grid[idx(x0 + 1, y0, z0)],
        grid[idx(x0 + 1, y0, z0 + 1)],
        grid[idx(x0 + 1, y0 + 1, z0)],
        grid[idx(x0 + 1, y0 + 1, z0 + 1)],
    ];
    const [v00, v01, v10, v11] = [
        v000 * (1.0 - dX) + v100 * dX,
        v001 * (1.0 - dX) + v101 * dX,
        v010 * (1.0 - dX) + v110 * dX,
        v011 * (1.0 - dX) + v111 * dX,
    ];
    const [v0, v1] = [v00 * (1.0 - dY) + v01 * dY, v10 * (1.0 - dY) + v11 * dY];
    return v0 * (1.0 - dZ) + v1 * dZ;
}

function postProcessVertex(vertex) {
    return [
        parseFloat(vertex[0].toFixed(2)),
        parseFloat(vertex[1].toFixed(2)),
        parseFloat(vertex[2].toFixed(2)),
    ];
}

export default function marchingCubes(opts) {
    const startTimestamp = Date.now();

    const chunk = opts.chunk;
    const size = opts.size;
    const isoLevel = opts.isoLevel;
    const inside = opts.inside || ((v) => v < isoLevel);

    const idx = (x, y, z) => z * size[1] * size[0] + y * size[0] + x;

    const rawOutput = [];

    const vertices = [];
    for (let i = 0; i < 12; i++) {
        vertices.push([0, 0, 0]);
    }

    for (let z = 0; z < size[2] - 1; z++) {
        for (let y = 0; y < size[1] - 1; y++) {
            for (let x = 0; x < size[0] - 1; x++) {
                let cubeIndex = 0;

                const [v000, v100, v101, v001, v010, v110, v111, v011] = [
                    chunk.dataAtWithJump(x, y, z),
                    chunk.dataAtWithJump(x + 1, y, z),
                    chunk.dataAtWithJump(x + 1, y, z + 1),
                    chunk.dataAtWithJump(x, y, z + 1),
                    chunk.dataAtWithJump(x, y + 1, z),
                    chunk.dataAtWithJump(x + 1, y + 1, z),
                    chunk.dataAtWithJump(x + 1, y + 1, z + 1),
                    chunk.dataAtWithJump(x, y + 1, z + 1),
                ];

                if (inside(v000)) cubeIndex |= 1;
                if (inside(v100)) cubeIndex |= 2;
                if (inside(v101)) cubeIndex |= 4;
                if (inside(v001)) cubeIndex |= 8;
                if (inside(v010)) cubeIndex |= 16;
                if (inside(v110)) cubeIndex |= 32;
                if (inside(v111)) cubeIndex |= 64;
                if (inside(v011)) cubeIndex |= 128;

                if (cubeIndex === 0 || cubeIndex === 256) {
                    continue;
                }

                if (edgeTable[cubeIndex] === 0) continue;

                vertices[0] = interp(
                    [v000, x, y, z],
                    [v100, x + 1, y, z],
                    isoLevel
                );
                vertices[1] = interp(
                    [v100, x + 1, y, z],
                    [v101, x + 1, y, z + 1],
                    isoLevel
                );
                vertices[2] = interp(
                    [v101, x + 1, y, z + 1],
                    [v001, x, y, z + 1],
                    isoLevel
                );
                vertices[3] = interp(
                    [v001, x, y, z + 1],
                    [v000, x, y, z],
                    isoLevel
                );

                vertices[4] = interp(
                    [v010, x, y + 1, z],
                    [v110, x + 1, y + 1, z],
                    isoLevel
                );
                vertices[5] = interp(
                    [v110, x + 1, y + 1, z],
                    [v111, x + 1, y + 1, z + 1],
                    isoLevel
                );
                vertices[6] = interp(
                    [v111, x + 1, y + 1, z + 1],
                    [v011, x, y + 1, z + 1],
                    isoLevel
                );
                vertices[7] = interp(
                    [v011, x, y + 1, z + 1],
                    [v010, x, y + 1, z],
                    isoLevel
                );

                vertices[8] = interp(
                    [v000, x, y, z],
                    [v010, x, y + 1, z],
                    isoLevel
                );
                vertices[9] = interp(
                    [v100, x + 1, y, z],
                    [v110, x + 1, y + 1, z],
                    isoLevel
                );
                vertices[10] = interp(
                    [v101, x + 1, y, z + 1],
                    [v111, x + 1, y + 1, z + 1],
                    isoLevel
                );
                vertices[11] = interp(
                    [v001, x, y, z + 1],
                    [v011, x, y + 1, z + 1],
                    isoLevel
                );

                for (let i = 0; triangleTable[cubeIndex][i] != -1; i += 3) {
                    let p1 = postProcessVertex(
                        vertices[triangleTable[cubeIndex][i]]
                    );
                    let p2 = postProcessVertex(
                        vertices[triangleTable[cubeIndex][i + 1]]
                    );
                    let p3 = postProcessVertex(
                        vertices[triangleTable[cubeIndex][i + 2]]
                    );

                    rawOutput.push({
                        vertices: [p1, p2, p3],
                        /* values: [
                            fetchTrilinear(chunk.data, idx, p1),
                            fetchTrilinear(chunk.data, idx, p2),
                            fetchTrilinear(chunk.data, idx, p3),
                        ], */
                    });
                }
            }
        }
    }

    const endMarchingTimestamp = Date.now();
    if (opts.diagnostics) {
        console.log(
            `Marching finished in ${endMarchingTimestamp - startTimestamp} ms`
        );
    }

    const finalResult = measure("marchingCubes() - optimizeRawMesh()", () =>
        unoptimizedRawMesh(rawMeshFromTriangleList(rawOutput))
    );

    const endTimestamp = Date.now();
    if (opts.diagnostics) {
        console.log(
            `Marching cubes finished in ${endTimestamp - startTimestamp} ms`
        );
    }

    return finalResult;
}
