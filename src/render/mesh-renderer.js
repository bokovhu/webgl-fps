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
};

export function updateRenderContext() {
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

export function rawMeshFromTriangleList(triangles) {
    const vertices = [];
    triangles.forEach((tri) => vertices.push(...tri.vertices));
    const faces = [];
    triangles.forEach((_, idx) =>
        faces.push([idx * 3, idx * 3 + 1, idx * 3 + 2])
    );

    return { vertices, faces };
}

export function optimizeRawMesh(rawMesh) {
    const vertexMap = new Map();
    const vertexFaces = new Map();
    const vertices = [];
    const normals = [];
    const faces = [];

    const vertexKey = (vertex) => `${vertex[0]},${vertex[1]},${vertex[2]}`;
    const vertexIndex = (v, vk) => {
        if (vertexMap.has(vk)) return vertexMap.get(vk);
        const index = vertices.length;
        vertices.push(v);
        vertexMap.set(vk, index);
        return index;
    };
    const addVertexFace = (vk, f) => {
        const currVertexFaces = vertexFaces.get(vk) || [];
        currVertexFaces.push(f);
        vertexFaces.set(vk, currVertexFaces);
    };

    rawMesh.faces.forEach((face, index) => {
        const [v1, v2, v3] = [
            rawMesh.vertices[face[0]],
            rawMesh.vertices[face[1]],
            rawMesh.vertices[face[2]],
        ];
        const [k1, k2, k3] = [v1, v2, v3].map(vertexKey);
        const [i1, i2, i3] = [
            vertexIndex(v1, k1),
            vertexIndex(v2, k2),
            vertexIndex(v3, k3),
        ];

        const faceIndex = faces.length;
        faces.push([i1, i2, i3]);
        addVertexFace(k1, faceIndex);
        addVertexFace(k2, faceIndex);
        addVertexFace(k3, faceIndex);
    });

    console.log(
        `Original vertex count: ${rawMesh.vertices.length}, deduplicated count: ${vertices.length}`
    );

    vertices.forEach((vertex) => {
        const key = vertexKey(vertex);
        const faceIds = vertexFaces.get(key);
        let vertexNormal = vec3.fromValues(0, 0, 0);

        faceIds.forEach((faceId) => {
            const [i1, i2, i3] = faces[faceId];
            const [v1, v2, v3] = [vertices[i1], vertices[i2], vertices[i3]];
            let v1v2 = vec3.fromValues(v2[0], v2[1], v2[2]);
            vec3.sub(v1v2, v1v2, v1);
            let v2v3 = vec3.fromValues(v3[0], v3[1], v3[2]);
            vec3.sub(v2v3, v2v3, v2);

            let faceNormal = vec3.fromValues(0, 0, 0);
            vec3.cross(faceNormal, v1v2, v2v3);
            vec3.normalize(faceNormal, faceNormal);

            vec3.add(vertexNormal, vertexNormal, faceNormal);
        });

        vec3.normalize(vertexNormal, vertexNormal);
        normals.push(vertexNormal);
    });

    return {
        vertices,
        normals,
        faces,
    };
}

export function translateRawMesh(rawMesh, delta) {
    return {
        faces: rawMesh.faces,
        normals: rawMesh.normals,
        vertices: rawMesh.vertices.map((v) => [
            v[0] + delta[0],
            v[1] + delta[1],
            v[2] + delta[2],
        ]),
    };
}

export function mergeRawMeshes(rawMeshes) {
    const allVertices = [];
    const allFaces = [];

    rawMeshes.forEach((rawMesh) => {
        const newFaces = rawMesh.faces.map((f) => [
            f[0] + allVertices.length,
            f[1] + allVertices.length,
            f[2] + allVertices.length,
        ]);
        allVertices.push(...rawMesh.vertices);
        allFaces.push(...newFaces);
    });

    console.log(
        `Merged ${rawMeshes.length} meshes: ${allVertices.length} vertices, ${allFaces.length} faces`
    );

    return optimizeRawMesh({ vertices: allVertices, faces: allFaces });
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
        const vertexData = [];
        const indexData = [];

        for (let i = 0; i < this.numVertices; i++) {
            const vertexPosition = rawMesh.vertices[i];
            const vertexNormal = rawMesh.normals[i];

            vertexData.push(...vertexPosition, ...vertexNormal);
        }

        for (let i = 0; i < this.numFaces; i++) {
            const face = rawMesh.faces[i];

            indexData.push(...face);
        }

        assert(vertexData.length === this.numVertices * vertexElements);
        assert(indexData.length === this.numFaces * 3);

        gl.bindVertexArray(this.vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(vertexData),
            gl.STATIC_DRAW
        );

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            new Uint32Array(indexData),
            gl.STATIC_DRAW
        );

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
