import { Camera, renderContext, UNIFORM } from "../render/mesh-renderer";
import { CHUNKSIZE, CAMERASPEED, MOUSESENSITIVITY } from "./constants";
import { vec3 } from "gl-matrix";

export class CameraController {
    update(delta) {
        if (this.cameraState.moveF) {
            this.camera.moveAlongForward(CAMERASPEED * delta);
        } else if (this.cameraState.moveB) {
            this.camera.moveAlongForward(-CAMERASPEED * delta);
        }

        if (this.cameraState.moveL) {
            this.camera.moveAlongRight(CAMERASPEED * delta);
        } else if (this.cameraState.moveR) {
            this.camera.moveAlongRight(-CAMERASPEED * delta);
        }

        if (this.cameraState.moveU) {
            this.camera.moveAlongWorldUp(CAMERASPEED * delta);
        } else if (this.cameraState.moveD) {
            this.camera.moveAlongWorldUp(-CAMERASPEED * delta);
        }
    }

    applyToRenderContext() {
        const { gl } = renderContext;
        if (!gl) {
            throw new Error("WebGL context is not set in renderContext!");
        }

        this.camera.use();
        gl.uniformMatrix4fv(
            UNIFORM("u_M"),
            false,
            renderContext.transform.model
        );
        gl.uniformMatrix4fv(
            UNIFORM("u_MV"),
            false,
            renderContext.transform.modelView
        );
        gl.uniformMatrix4fv(
            UNIFORM("u_MVP"),
            false,
            renderContext.transform.modelViewProjection
        );
        gl.uniform3fv(UNIFORM("u_cameraPosition"), this.camera.position);
        gl.uniform3fv(UNIFORM("u_cameraForward"), this.camera.forward);
    }

    init(platform) {
        platform.canvas.addEventListener(
            "mousemove",
            this.onCanvasMouseMoved.bind(this)
        );

        this.camera = new Camera({
            aspect: platform.canvas.width / platform.canvas.height,
        });
        vec3.set(
            this.camera.position,
            CHUNKSIZE[0] / 2,
            CHUNKSIZE[1] / 2,
            CHUNKSIZE[2] / 2
        );
        this.camera.calculateAxes();
        this.camera.calculateView();
    }

    addEventListeners() {
        document.addEventListener("keydown", this.onDocumentKeyDown.bind(this));
        document.addEventListener("keyup", this.onDocumentKeyUp.bind(this));
    }

    onCanvasMouseMoved(event) {
        this.camera.rotate([
            -event.movementX * MOUSESENSITIVITY,
            event.movementY * MOUSESENSITIVITY,
            0.0,
        ]);
        this.camera.calculateAxes();
        this.camera.calculateView();
    }

    onDocumentKeyDown(event) {
        if (event.key === "w" || event.key === "W") {
            this.cameraState.moveF = true;
        } else if (event.key === "s" || event.key === "S") {
            this.cameraState.moveB = true;
        } else if (event.key === "a" || event.key === "A") {
            this.cameraState.moveL = true;
        } else if (event.key === "d" || event.key === "D") {
            this.cameraState.moveR = true;
        } else if (event.key === "Space" || event.key === " ") {
            this.cameraState.moveU = true;
        } else if (event.key === "Control" || event.key === "Ctrl") {
            this.cameraState.moveD = true;
        }
    }

    onDocumentKeyUp(event) {
        if (event.key === "w" || event.key === "W") {
            this.cameraState.moveF = false;
        } else if (event.key === "s" || event.key === "S") {
            this.cameraState.moveB = false;
        } else if (event.key === "a" || event.key === "A") {
            this.cameraState.moveL = false;
        } else if (event.key === "d" || event.key === "D") {
            this.cameraState.moveR = false;
        } else if (event.key === "Space" || event.key === " ") {
            this.cameraState.moveU = false;
        } else if (event.key === "Control" || event.key === "Ctrl") {
            this.cameraState.moveD = false;
        }
    }

    constructor() {
        this.cameraState = {
            moveF: false,
            moveB: false,
            moveL: false,
            moveR: false,
            moveU: false,
            moveD: false,
        };
        this.addEventListeners();
    }
}
