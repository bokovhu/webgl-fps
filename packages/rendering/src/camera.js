import { mat4, vec3, quat } from "gl-matrix";
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

        this.applyToRenderContext = opts.applyToRenderContext;

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

        if (this.applyToRenderContext) {
            this.applyToRenderContext({
                view: this.view,
                projection: this.projection,
                camera: {
                    position: this.position,
                    forward: this.forward,
                    right: this.right,
                    up: this.up,
                },
            });
        }
    }
}
