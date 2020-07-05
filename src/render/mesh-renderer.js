const { mat4, vec3, vec4, quat } = require("gl-matrix");

function assert(b) {
    if (!b) {
        throw new Error("assertion error");
    }
}

export var renderContext = {
    transform: {
        view: mat4.create(),
        projection: mat4.create(),
        model: mat4.create(),
        modelView: mat4.create(),
        modelViewProjection: mat4.create(),
    },
    camera: {
        position: vec3.create(),
        forward: vec3.create(),
        right: vec3.create(),
        up: vec3.create(),
    },
    program: undefined,
    gl: undefined,
};

export function updateRenderContext(opts) {
    renderContext.program = opts.program;
    renderContext.gl = opts.gl;
    renderContext.transform.modelView = mat4.mul(
        renderContext.transform.modelView,
        renderContext.transform.view,
        renderContext.transform.model
    );
    renderContext.transform.modelViewProjection = mat4.clone(
        renderContext.transform.projection
    );
    renderContext.transform.modelViewProjection = mat4.multiply(
        renderContext.transform.modelViewProjection,
        renderContext.transform.modelViewProjection,
        renderContext.transform.view
    );
    renderContext.transform.modelViewProjection = mat4.multiply(
        renderContext.transform.modelViewProjection,
        renderContext.transform.modelViewProjection,
        renderContext.transform.model
    );
}

export class RenderableMesh {
    constructor(gl) {
        this.vbo = gl.createBuffer();
        this.ibo = gl.createBuffer();
        this.vao = gl.createVertexArray();
    }

    process(gl, rawMesh) {
        this.numVertices = rawMesh.vertices.length;
        this.numFaces = rawMesh.faces.length;

        const vertexElements = 3 + 3;
        const vertexBytes = vertexElements * Float32Array.BYTES_PER_ELEMENT;
        const vertexData = new Float32Array(vertexElements * this.numVertices);
        const indexData = new Uint32Array(this.numFaces * 3);

        for (let i = 0; i < this.numVertices; i++) {
            const vertexPosition = rawMesh.vertices[i];
            const vertexNormal = rawMesh.normals[i];

            // vertexData.push(...vertexPosition, ...vertexNormal);
            vertexData.set(
                [...vertexPosition, ...vertexNormal],
                vertexElements * i
            );
        }

        for (let i = 0; i < this.numFaces; i++) {
            const face = rawMesh.faces[i];

            indexData.set(face, 3 * i);
        }

        assert(vertexData.length === this.numVertices * vertexElements);
        assert(indexData.length === this.numFaces * 3);

        gl.bindVertexArray(this.vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);

        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, vertexBytes, 0);
        gl.vertexAttribPointer(
            1,
            3,
            gl.FLOAT,
            true,
            vertexBytes,
            3 * Float32Array.BYTES_PER_ELEMENT
        );
    }

    draw(gl) {
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, 3 * this.numFaces, gl.UNSIGNED_INT, 0);
    }

    dispose(gl) {
        gl.deleteVertexArray(this.vao);
        gl.deleteBuffer(this.vbo);
        gl.deleteBuffer(this.ibo);
    }
}

export class Camera {
    constructor(opts) {
        const makeView = opts.makeView || (() => mat4.create());
        const makeProjection =
            opts.makeProjection ||
            ((aspect) =>
                mat4.perspective(
                    mat4.create(),
                    Math.PI / 3.0,
                    aspect,
                    0.1,
                    400.0
                ));

        this.view = makeView();
        this.projection = makeProjection(opts.aspect);

        this.position = vec3.fromValues(0, 0, -5);
        this.rotation = quat.create();
        this.yaw = 0.0;
        this.pitch = 0.0;
        this.roll = 0.0;
        this.forward = vec3.fromValues(0, 0, 1);
        this.right = vec3.fromValues(1, 0, 0);
        this.up = vec3.fromValues(0, 1, 0);
        this.worldUp = vec3.fromValues(0, 1, 0);

        this.calculateView();
    }

    calculateAxes() {
        this.rotation = quat.fromEuler(
            this.rotation,
            this.pitch,
            this.yaw,
            this.roll
        );

        this.forward = vec3.fromValues(0, 0, 1);
        this.forward = vec3.transformQuat(
            this.forward,
            this.forward,
            this.rotation
        );
        this.forward = vec3.normalize(this.forward, this.forward);

        this.right = vec3.fromValues(1, 0, 0);
        this.right = vec3.transformQuat(this.right, this.right, this.rotation);
        this.right = vec3.normalize(this.right, this.right);

        this.up = vec3.fromValues(0, 1, 0);
        this.up = vec3.transformQuat(this.up, this.up, this.rotation);
        this.up = vec3.normalize(this.up, this.up);
    }

    calculateView() {
        let target = vec3.clone(this.position);
        target = vec3.add(target, target, this.forward);
        this.view = mat4.lookAt(this.view, this.position, target, this.up);
    }

    moveAlongForward(distance) {
        let delta = vec3.clone(this.forward);
        delta = vec3.scale(delta, delta, distance);

        this.position = vec3.add(this.position, this.position, delta);

        this.calculateView();
    }

    moveAlongRight(distance) {
        let delta = vec3.clone(this.right);
        delta = vec3.scale(delta, delta, distance);

        this.position = vec3.add(this.position, this.position, delta);

        this.calculateView();
    }

    moveAlongUp(distance) {
        let delta = vec3.clone(this.up);
        delta = vec3.scale(delta, delta, distance);

        this.position = vec3.add(this.position, this.position, delta);

        this.calculateView();
    }

    moveAlongWorldUp(distance) {
        let delta = vec3.clone(this.worldUp);
        delta = vec3.scale(delta, delta, distance);

        this.position = vec3.add(this.position, this.position, delta);

        this.calculateView();
    }

    rotate(delta) {
        this.yaw += delta[0];
        this.pitch += delta[1];
        this.roll += delta[2];

        this.calculateAxes();
        this.calculateView();
    }

    use() {
        this.calculateAxes();
        this.calculateView();

        renderContext.transform.view = this.view;
        renderContext.transform.projection = this.projection;

        renderContext.camera.position = this.position;
        renderContext.camera.forward = this.forward;
        renderContext.camera.right = this.right;
        renderContext.camera.up = this.up;
    }
}

export class Shader {
    constructor(gl, type, source) {
        this.handle = gl.createShader(type);
        gl.shaderSource(this.handle, source);
        gl.compileShader(this.handle);
        const compileStatus = gl.getShaderParameter(
            this.handle,
            gl.COMPILE_STATUS
        );
        if (!compileStatus) {
            throw new Error(
                "Could not compile shader! Info log: " +
                    gl.getShaderInfoLog(this.handle)
            );
        }
    }
}

export class Program {
    constructor(gl, vertexShader, fragmentShader) {
        this.handle = gl.createProgram();
        gl.attachShader(this.handle, vertexShader.handle);
        gl.attachShader(this.handle, fragmentShader.handle);
        gl.linkProgram(this.handle);
        const linkStatus = gl.getProgramParameter(this.handle, gl.LINK_STATUS);
        if (!linkStatus) {
            throw new Error(
                "Could not link program! Info log: " +
                    gl.getProgramInfoLog(this.handle)
            );
        }

        this.uniformLocationCache = {};
    }

    use(gl) {
        gl.useProgram(this.handle);
    }

    uniformLocation(gl, name) {
        if (typeof this.uniformLocationCache[name] !== "undefined") {
            return this.uniformLocationCache[name];
        }

        this.uniformLocationCache[name] = gl.getUniformLocation(
            this.handle,
            name
        );
        return this.uniformLocationCache[name];
    }
}

export function UNIFORM(name) {
    if (renderContext.program && renderContext.gl) {
        return renderContext.program.uniformLocation(renderContext.gl, name);
    }
    throw new Error(
        "UNIFORM can only be used when the WebGL context and the shader program is set in the renderContext!"
    );
}
