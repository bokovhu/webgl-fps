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

let renderableMesh = new RenderableMesh(gl);

const gridSize = [32, 32, 32];
const numChunks = [12, 12, 12];

const chunks = measure("generateChunks()", () =>
    generateChunks({
        numChunks: numChunks,
        chunkSize: gridSize,
    })
);
const levelSetChunks = measure("convertChunks()", () =>
    convertChunks(chunks, numChunks)
);
const rawMeshes = measure("marchingCubes()", () =>
    levelSetChunks.map((chunk) => ({
        mesh: marchingCubes({
            chunk: chunk,
            size: chunk.size,
            isoLevel: 0.0,
            diagnostics: true,
        }),
        chunk,
    }))
).map((rawMesh) => ({
    chunk: rawMesh.chunk,
    mesh: translateRawMesh(rawMesh.mesh, rawMesh.chunk.coords),
}));
renderableMesh.process(gl, mergeRawMeshes(rawMeshes.map((rm) => rm.mesh)));

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

    renderableMesh.draw(gl);
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
