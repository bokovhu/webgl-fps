import {
    RenderableMesh,
    updateRenderContext,
} from "@me.bokov.webglfps/rendering";
import { mergeRawMeshes } from "@me.bokov.webglfps/mesh";
import {
    CHUNKGROUPSIZE,
    CHUNKGROUPCOUNTS,
    CHUNKBASEOFFSET,
    CHUNKSIZE,
} from "./constants";
import { vec3 } from "gl-matrix";
import { CameraController } from "./camera-controller";
import { WorldRenderer } from "./world-renderer";
import { generate } from "./generate-chunk.worker";

export class Game {
    createInitialChunkWorkQueue() {
        let q = [];
        for (
            let chunkGroupZ = 0;
            chunkGroupZ < CHUNKGROUPCOUNTS[2];
            chunkGroupZ++
        ) {
            for (
                let chunkGroupY = 0;
                chunkGroupY < CHUNKGROUPCOUNTS[1];
                chunkGroupY++
            ) {
                for (
                    let chunkGroupX = 0;
                    chunkGroupX < CHUNKGROUPCOUNTS[0];
                    chunkGroupX++
                ) {
                    q.push({
                        chunkSize: CHUNKSIZE,
                        numChunks: CHUNKGROUPSIZE,
                        coords: [
                            CHUNKBASEOFFSET[0] +
                                chunkGroupX * CHUNKGROUPSIZE[0],
                            CHUNKBASEOFFSET[1] +
                                chunkGroupY * CHUNKGROUPSIZE[1],
                            CHUNKBASEOFFSET[2] +
                                chunkGroupZ * CHUNKGROUPSIZE[2],
                        ],
                    });
                }
            }
        }
        q = q.sort((a, b) =>
            vec3.len(a.coords) < vec3.len(b.coords) ? -1 : 1
        );
        return q;
    }

    finishLevelGeneration() {
        while (this.chunkWorkQueue.length > 0) {
            const {
                chunkSize,
                numChunks,
                coords,
            } = this.chunkWorkQueue.shift();
            const { rawMeshes } = generate(chunkSize, numChunks, coords);
            const renderableMesh = new RenderableMesh(this.gl);
            renderableMesh.process(
                this.gl,
                mergeRawMeshes(rawMeshes.map((rm) => rm.mesh))
            );
            this.renderables.push(renderableMesh);
        }
        console.log(`finishLevelGeneration() done: `, this.renderables);
    }

    tick(delta) {
        this.time += delta;

        this.cameraController.update(delta);
    }

    beginRenderContext(gl, program) {
        program.use(gl);
        updateRenderContext({ gl, program });
    }

    render(gl, delta) {
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.beginRenderContext(gl, this.worldRenderer.blinnPhongProgram);

        this.cameraController.applyToRenderContext();
        this.worldRenderer.render(this);
    }

    resized(gl, canvas) {}

    onPlatformInitialized(platform) {
        this.gl = platform.gl;
        platform.ticker = this.tick.bind(this);
        platform.renderer = this.render.bind(this);
        platform.resizer = this.resized.bind(this);

        this.cameraController.init(platform);
        this.worldRenderer.init(platform);

        this.finishLevelGeneration();
    }

    constructor() {
        this.renderables = [];
        this.chunkWorkQueue = this.createInitialChunkWorkQueue();
        this.cameraController = new CameraController();
        this.worldRenderer = new WorldRenderer();

        this.time = 0.0;
    }
}
