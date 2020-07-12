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
