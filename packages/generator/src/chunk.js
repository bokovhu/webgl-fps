export class Chunk {
    constructor(coords, size, makeData) {
        this.coords = coords;
        this.size = size;
        this.dataSize = size[2] * size[1] * size[0];
        this.data = makeData(this.dataSize);
        this.next = {
            x: undefined,
            y: undefined,
            z: undefined,
        };
        this.prev = {
            x: undefined,
            y: undefined,
            z: undefined,
        };
    }

    idx(x, y, z) {
        /* x = x - Math.floor(x / this.size[0]) * this.size[0];
        y = y - Math.floor(y / this.size[1]) * this.size[1];
        z = z - Math.floor(z / this.size[2]) * this.size[2]; */

        if (
            x >= 0 &&
            x < this.size[0] &&
            y >= 0 &&
            y < this.size[1] &&
            z >= 0 &&
            z < this.size[2]
        ) {
            return z * this.size[1] * this.size[0] + y * this.size[0] + x;
        }
        return undefined;
    }

    xyz(index) {
        const x = index % this.size[0];
        const y = ((index - x) % this.size[1]) / this.size[0];
        const z =
            (index - x - y * this.size[0]) / (this.size[1] * this.size[0]);

        return [this.x + x, this.y + y, this.z + z];
    }

    dataAt(x, y, z) {
        const idx = this.idx(x, y, z);
        if (typeof idx !== "undefined") {
            return this.data[idx];
        }
        return undefined;
    }

    dataAtIndex(index) {
        if (index >= 0 && index < this.dataSize) {
            return this.data[index];
        }
        return undefined;
    }

    dataAtWithJump(x, y, z) {
        const idx = this.idx(x, y, z);
        if (typeof idx !== "undefined") {
            return this.data[idx];
        }

        if (x < 0) {
            if (this.prev.x) {
                return this.prev.x.dataAtWithJump(x + this.size[0], y, z);
            }
            return undefined;
        }
        if (x >= this.size[0]) {
            if (this.next.x) {
                return this.next.x.dataAtWithJump(x - this.size[0], y, z);
            }
            return undefined;
        }

        if (y < 0) {
            if (this.prev.y) {
                return this.prev.y.dataAtWithJump(x, y + this.size[1], z);
            }
            return undefined;
        }
        if (y >= this.size[1]) {
            if (this.next.y) {
                return this.next.y.dataAtWithJump(x, y - this.size[1], z);
            }
            return undefined;
        }

        if (z < 0) {
            if (this.prev.z) {
                return this.prev.z.dataAtWithJump(x, y, z + this.size[2]);
            }
            return undefined;
        }
        if (z >= this.size[2]) {
            if (this.next.z) {
                return this.next.z.dataAtWithJump(x, y, z - this.size[2]);
            }
            return undefined;
        }

        return undefined;
    }

    setAt(x, y, z, v) {
        const idx = this.idx(x, y, z);
        if (typeof idx !== "undefined") {
            this.data[idx] = v;
        }
    }

    setAtIndex(index, v) {
        if (index >= 0 && index < this.dataSize) {
            this.data[index] = v;
        }
    }
}