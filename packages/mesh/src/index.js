import { vec3 } from "gl-matrix";

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

export function unoptimizedRawMesh(rawMesh) {
    const normals = [];
    rawMesh.vertices.forEach(() => normals.push([0, 0, 0]));

    rawMesh.faces.forEach((face) => {
        const [v1, v2, v3] = [
            rawMesh.vertices[face[0]],
            rawMesh.vertices[face[1]],
            rawMesh.vertices[face[2]],
        ];
        const [n1, n2, n3] = [
            normals[face[0]],
            normals[face[1]],
            normals[face[2]],
        ];

        let v1v2 = vec3.sub([0, 0, 0], v2, v1);
        let v2v3 = vec3.sub([0, 0, 0], v3, v2);
        vec3.cross(n1, v1v2, v2v3);
        vec3.normalize(n1, n1);
        vec3.set(n2, n1[0], n1[1], n1[2]);
        vec3.set(n3, n1[0], n1[1], n1[2]);
    });

    return { ...rawMesh, normals };
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

export function flipNormalsInRawMesh(rawMesh) {
    return {
        faces: rawMesh.faces,
        normals: rawMesh.normals.map((n) => vec3.inverse(n, n)),
        vertices: rawMesh.vertices,
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

    // return optimizeRawMesh({ vertices: allVertices, faces: allFaces });
    return unoptimizedRawMesh({ vertices: allVertices, faces: allFaces });
}

export function subdivideRawMesh(rawMesh) {

    const edges = [];
    rawMesh.faces.forEach(
        (face) => {
            edges.push(
                [face[0], face[1]],
                [face[1], face[2]],
                [face[2], face[0]]
            );
        }
    );

}
