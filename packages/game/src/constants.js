import { vec3 } from "gl-matrix";

export const CHUNKSIZE = [32, 32, 32];
export const CHUNKGROUPSIZE = [2, 2, 2];
export const CHUNKGROUPCOUNTS = [2, 2, 2];
export const CHUNKBASEOFFSET = [
    -1 * Math.floor(CHUNKGROUPCOUNTS[0] * 0.5),
    -1 * Math.floor(CHUNKGROUPCOUNTS[1] * 0.5),
    -1 * Math.floor(CHUNKGROUPCOUNTS[2] * 0.5),
];
export const CAMERASPEED = 35.0;
export const MOUSESENSITIVITY = 0.1;
export const MATERIALDIFFUSE = [0.1, 0.4, 0.4];
export const MATERIALSPECULAR = [0.5, 1.0, 1.0];
export const MATERIALAMBIENT = [0.01, 0.01, 0.01];
export const MATERIALSHININESS = 396;
export const LIGHTENERGY = [0.6, 0.6, 0.3];
export const LIGHTAMBIENT = [0.02, 0.02, 0.02];
export const LIGHTDIR = vec3.normalize([0, 0, 0], [1, 0.6, 0.7]);
