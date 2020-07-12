import { assert } from "@me.bokov.webglfps/util";

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
