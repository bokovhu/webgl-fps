export class Platform {
    obtainCanvas() {
        this.canvas = document.querySelector("main canvas");
        if (!this.canvas) {
            throw new Error("Canvas could not be obtained!");
        }
    }

    obtainWebGLContext() {
        this.gl = this.canvas.getContext("webgl2");
        if (!this.gl) {
            throw new Error("WebGL 2 context could not be obtained!");
        }

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.disable(this.gl.BLEND);
    }

    obtainCanvasContainer() {
        if (!this.canvas) {
            this.obtainCanvas();
        }
        this.canvasContainer = document.querySelector("main");
        if (!this.canvasContainer) {
            throw new Error("Canvas container element could not be obtained!");
        }
    }

    obtainPointerLocker() {
        this.pointerLocker = document.querySelector(".pointer-locker");
        if (!this.pointerLocker) {
            throw new Error("Pointer locker element could not be obtained!");
        }
    }

    maximizeCanvas() {
        if (!this.canvasContainer) {
            this.obtainCanvasContainer();
        }
        this.canvas.width = this.canvasContainer.clientWidth;
        this.canvas.height = this.canvasContainer.clientHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        if (!this.resizer) {
            this.resizer(this.gl, this.canvas);
        }
    }

    calculateDelta() {
        const now = Date.now();
        const delta = 0.001 * (now - this.lastFrameTimestamp);
        this.lastFrameTimestamp = now;
        return delta;
    }

    requestNextAnimationFrame() {
        window.requestAnimationFrame(this.onAnimationFrame.bind(this));
    }

    hidePointerLocker() {
        if (!this.pointerLocker) {
            this.obtainPointerLocker();
        }
        this.pointerLocker.setAttribute("style", "display: none");
    }

    showPointerLocker() {
        if (!this.pointerLocker) {
            this.obtainPointerLocker();
        }
        this.pointerLocker.setAttribute("style", "display: initial");
    }

    lockPointer() {
        if (typeof this.canvas.requestPointerLock === "function") {
            this.canvas.requestPointerLock();
            this.hidePointerLocker();
        }
    }

    unlockPointer() {
        if (
            document.pointerLockElement === canvas &&
            document.exitPointerLock
        ) {
            document.exitPointerLock();
        }
    }

    addEventListeners() {
        window.addEventListener("resize", this.onWindowResized.bind(this));
        document.addEventListener(
            "pointerlockchange",
            this.onDocumentPointerLockChanged.bind(this)
        );

        if (!this.pointerLocker) {
            this.obtainPointerLocker();
        }
        this.pointerLocker.addEventListener(
            "click",
            this.onPointerLockerClicked.bind(this)
        );
    }

    onAnimationFrame() {
        const delta = this.calculateDelta();

        if (this.ticker) {
            this.ticker(delta);
        }
        if (this.renderer) {
            this.renderer(this.gl, delta);
        }

        this.requestNextAnimationFrame();
    }

    onDocumentPointerLockChanged(event) {
        if (document.pointerLockElement !== this.canvas) {
            this.showPointerLocker();
        }
    }

    onWindowResized() {
        this.maximizeCanvas();
    }

    onPointerLockerClicked() {
        this.lockPointer();
    }

    constructor(initializer) {
        this.ticker = (delta) => {};
        this.renderer = (gl, delta) => {};
        this.resizer = (gl, canvas) => {};

        this.obtainCanvas();
        this.obtainWebGLContext();
        this.maximizeCanvas();

        this.addEventListeners();

        if (initializer) {
            initializer(this);
        }

        this.lastFrameTimestamp = Date.now();

        this.requestNextAnimationFrame();
    }
}
