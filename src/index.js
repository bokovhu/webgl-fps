const { default: marchingCubes } = require("./mc");
const {
    Program,
    Shader,
    RenderableMesh,
    Camera,
    renderContext,
    updateRenderContext,
    mergeRawMeshes,
    translateRawMesh,
} = require("./render/mesh-renderer");
const {
    default: {
        vertex: blinnPhongVertexSource,
        fragment: blinnPhongFragmentSource,
    },
} = require("./render/blinn-phong");
const { vec3, quat, mat4 } = require("gl-matrix");
const { generateChunks, convertChunks } = require("./gen/generate");
const { measure } = require("./util/measure");

const canvas = document.querySelector("main canvas");
const gl = canvas.getContext("webgl2");

function maximizeCanvas() {
    const canvasContainer = document.querySelector("main");
    canvas.width = canvasContainer.clientWidth;
    canvas.height = canvasContainer.clientHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);
}
maximizeCanvas();
window.addEventListener("resize", () => maximizeCanvas());

function lockPointer() {
    if (typeof canvas.requestPointerLock === "function") {
        canvas.requestPointerLock();
        document
            .querySelector(".pointer-locker")
            .setAttribute("style", "display: none");
    }
}
function unlockPointer() {
    if (document.pointerLockElement === canvas && document.exitPointerLock) {
        document.exitPointerLock();
    }
}
document
    .querySelector(".pointer-locker")
    .addEventListener("click", () => lockPointer());
document.addEventListener("pointerlockchange", (event) => {
    if (document.pointerLockElement !== canvas) {
        document.querySelector(".pointer-locker").setAttribute("style", "");
    }
});

function isKeyEscape(key) {
    return key === "Esc" || key === "Escape";
}

var lastFrameTime = Date.now();

const renderables = [];
let chunkWorkQueue = [];
const chunkSize = [32, 32, 32];
const chunkGroupSize = [2, 2, 2];
const numChunkGroups = [5, 5, 5];
const chunksBaseOffset = [
    -1 * Math.floor (numChunkGroups[0] * 0.5),
    -1 * Math.floor (numChunkGroups[1] * 0.5),
    -1 * Math.floor (numChunkGroups[2] * 0.5),
];

for (let chunkGroupZ = 0; chunkGroupZ < numChunkGroups[2]; chunkGroupZ++) {
    for (let chunkGroupY = 0; chunkGroupY < numChunkGroups[1]; chunkGroupY++) {
        for (
            let chunkGroupX = 0;
            chunkGroupX < numChunkGroups[0];
            chunkGroupX++
        ) {
            chunkWorkQueue.push({
                chunkSize,
                numChunks: chunkGroupSize,
                coords: [
                    chunksBaseOffset[0] + chunkGroupX * chunkGroupSize[0],
                    chunksBaseOffset[1] + chunkGroupY * chunkGroupSize[1],
                    chunksBaseOffset[2] + chunkGroupZ * chunkGroupSize[2],
                ],
            });
        }
    }
}

chunkWorkQueue = chunkWorkQueue.sort((job1, job2) => {
    const job1Distance = vec3.len(job1.coords);
    const job2Distance = vec3.len(job2.coords);
    if (job1Distance < job2Distance) return -1;
    return 1;
});

const gridSize = [32, 32, 32];
const numChunks = [4, 4, 4];

const bgWorker = new Worker("./generate-chunk.worker.js");
bgWorker.postMessage(chunkWorkQueue.shift());
let ready = false;

bgWorker.onmessage = (event) => {
    const { chunks, rawMeshes } = event.data;
    const renderableMesh = new RenderableMesh(gl);
    renderableMesh.process(gl, mergeRawMeshes(rawMeshes.map((rm) => rm.mesh)));
    renderables.push(renderableMesh);
    ready = true;

    if (chunkWorkQueue.length > 0) {
        bgWorker.postMessage(chunkWorkQueue.shift());
    }
};

const blinnPhongProgram = new Program(
    gl,
    new Shader(gl, gl.VERTEX_SHADER, blinnPhongVertexSource),
    new Shader(gl, gl.FRAGMENT_SHADER, blinnPhongFragmentSource)
);
const camera = new Camera({
    aspect: canvas.width / canvas.height,
});
const cameraState = {
    moveF: false,
    moveB: false,
    moveL: false,
    moveR: false,
    moveU: false,
    moveD: false,
    rollPos: false,
    rollNeg: false,
};
const cameraSpeed = 50.0;

const mouseSensitivity = 0.1;
canvas.addEventListener("mousemove", (event) => {
    camera.rotate([
        -event.movementX * mouseSensitivity,
        event.movementY * mouseSensitivity,
        0.0,
    ]);
});
document.addEventListener("keydown", (event) => {
    if (event.key === "w" || event.key === "W") {
        cameraState.moveF = true;
    } else if (event.key === "s" || event.key === "S") {
        cameraState.moveB = true;
    } else if (event.key === "a" || event.key === "A") {
        cameraState.moveL = true;
    } else if (event.key === "d" || event.key === "D") {
        cameraState.moveR = true;
    } else if (event.key === "Space" || event.key === " ") {
        cameraState.moveU = true;
    } else if (event.key === "Control" || event.key === "Ctrl") {
        cameraState.moveD = true;
    } else if (event.key === "e" || event.key === "E") {
        cameraState.rollPos = true;
    } else if (event.key === "q" || event.key === "Q") {
        cameraState.rollNeg = true;
    }
});
document.addEventListener("keyup", (event) => {
    if (isKeyEscape(event.key)) {
        unlockPointer();
    }

    if (event.key === "w" || event.key === "W") {
        cameraState.moveF = false;
    } else if (event.key === "s" || event.key === "S") {
        cameraState.moveB = false;
    } else if (event.key === "a" || event.key === "A") {
        cameraState.moveL = false;
    } else if (event.key === "d" || event.key === "D") {
        cameraState.moveR = false;
    } else if (event.key === "Space" || event.key === " ") {
        cameraState.moveU = false;
    } else if (event.key === "Control" || event.key === "Ctrl") {
        cameraState.moveD = false;
    } else if (event.key === "e" || event.key === "E") {
        cameraState.rollPos = false;
    } else if (event.key === "q" || event.key === "Q") {
        cameraState.rollNeg = false;
    }
});

gl.enable(gl.DEPTH_TEST);

function update(delta) {
    if (cameraState.moveF) {
        camera.moveAlongForward(cameraSpeed * delta);
    } else if (cameraState.moveB) {
        camera.moveAlongForward(-cameraSpeed * delta);
    }

    if (cameraState.moveL) {
        camera.moveAlongRight(cameraSpeed * delta);
    } else if (cameraState.moveR) {
        camera.moveAlongRight(-cameraSpeed * delta);
    }

    if (cameraState.moveU) {
        camera.moveAlongWorldUp(cameraSpeed * delta);
    } else if (cameraState.moveD) {
        camera.moveAlongWorldUp(-cameraSpeed * delta);
    }
}

let lightDir = vec3.fromValues(1.0, -0.8, 0.4);
lightDir = vec3.normalize(lightDir, lightDir);

function render(delta) {
    if (!ready) {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return;
    }
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    camera.use();
    blinnPhongProgram.use(gl);

    updateRenderContext();

    gl.uniformMatrix4fv(
        blinnPhongProgram.uniformLocation(gl, "u_M"),
        false,
        renderContext.transform.model
    );
    gl.uniformMatrix4fv(
        blinnPhongProgram.uniformLocation(gl, "u_MV"),
        false,
        renderContext.transform.modelView
    );
    gl.uniformMatrix4fv(
        blinnPhongProgram.uniformLocation(gl, "u_MVP"),
        false,
        renderContext.transform.modelViewProjection
    );

    gl.uniform3f(blinnPhongProgram.uniformLocation(gl, "u_Kd"), 0.1, 0.3, 0.75);
    gl.uniform3f(blinnPhongProgram.uniformLocation(gl, "u_Ks"), 0.5, 1.0, 1.0);
    gl.uniform3f(
        blinnPhongProgram.uniformLocation(gl, "u_Ka"),
        0.01,
        0.05,
        0.08
    );
    gl.uniform1f(blinnPhongProgram.uniformLocation(gl, "u_shininess"), 96.0);

    gl.uniform3f(blinnPhongProgram.uniformLocation(gl, "u_Le"), 1.0, 1.0, 0.7);
    gl.uniform3f(blinnPhongProgram.uniformLocation(gl, "u_La"), 0.1, 0.1, 0.1);
    gl.uniform3f(
        blinnPhongProgram.uniformLocation(gl, "u_Ld"),
        lightDir[0],
        lightDir[1],
        lightDir[2]
    );

    gl.uniform3f(
        blinnPhongProgram.uniformLocation(gl, "u_cameraPosition"),
        renderContext.camera.position[0],
        renderContext.camera.position[1],
        renderContext.camera.position[2]
    );
    gl.uniform3f(
        blinnPhongProgram.uniformLocation(gl, "u_cameraForward"),
        renderContext.camera.forward[0],
        renderContext.camera.forward[1],
        renderContext.camera.forward[2]
    );

    // renderableMesh.draw(gl);
    renderables.forEach((r) => r.draw(gl));
}

function onAnimationFrame() {
    let now = Date.now();
    let delta = 0.001 * (now - lastFrameTime);
    lastFrameTime = now;
    update(delta);
    render(delta);
    window.requestAnimationFrame(onAnimationFrame);
}
window.requestAnimationFrame(onAnimationFrame);
