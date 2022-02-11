import { IPlugin } from "../plugin";
import { Viewer, Framebuffer } from "@xbim/viewer";
import { vshader } from "./vshader";
import { vec4, vec3, mat4 } from "gl-matrix";

export class LinesDrawer implements IPlugin {
  private viewer!: Viewer;
  private program!: WebGLProgram;
  private vertex_buffer!: WebGLBuffer;
  private coordinatesAttributePointer!: number;
  private mvUniformPointer!: WebGLUniformLocation | null;
  private pUniformPointer!: WebGLUniformLocation | null;
  private colourUniformPointer!: WebGLUniformLocation | null;
  private _colourCodingUniformPointer: any;
  private initialized = false;
  _prodId: any;
  private _modelId = 0;
  dirId!: number;
  vecOffset!: any;

  /**
   * Factor used to make the grid bigger than the current region
   */
  public factor = 1.5;
  /**
   * Fragment of Z height to be used as a Z offset bellow the model
   */
  public zFactor = 5.0;

  /**
   * Number of lines to be drawn
   */
  public numberOfLines = 10.0;

  /**
   * Colour of the grid
   */
  public colour = vec4.fromValues(200.0, 0.0, 0.0, 1.0);

  /**
   * Set to true to stop rendering of this plugin
   */
  public get stopped(): boolean {
    return this._stopped;
  }
  public set stopped(value: boolean) {
    this._stopped = value;
    if (this.viewer) {
      this.viewer.draw();
    }
  }
  private _stopped = false;

  public init(viewer: Viewer): void {
    this.viewer = viewer;

    const gl = viewer.gl;

    this._initShader();
    gl.useProgram(this.program);

    // return
    // create vertex buffer
    this.vertex_buffer = gl.createBuffer() as WebGLBuffer;

    // Get the attribute location
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
    this.coordinatesAttributePointer = gl.getAttribLocation(
      this.program,
      "coordinates"
    );
    // Enable the attribute
    gl.enableVertexAttribArray(this.coordinatesAttributePointer);

    gl.vertexAttribPointer(
      this.coordinatesAttributePointer,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );

    this._colourCodingUniformPointer = gl.getUniformLocation(
      this.program,
      "uColorCoding"
    );
    gl.enableVertexAttribArray(this._colourCodingUniformPointer);

    this._prodId = gl.getUniformLocation(this.program, "prodId");
    gl.enableVertexAttribArray(this._prodId);

    // get uniform locations
    this.colourUniformPointer = gl.getUniformLocation(this.program, "uColour");
    this.pUniformPointer = gl.getUniformLocation(this.program, "uPMatrix");
    this.mvUniformPointer = gl.getUniformLocation(this.program, "uMvMatrix");

    this.initialized = true;
  }
  doMove(deltaX: number, deltaY: number, origin: Float32Array) {
    let c = 0;
    const camera = this.viewer.getCameraPosition();
    const distance = vec3.distance(camera, origin);

    let mainW = (this.viewer.canvas.width = this.viewer.canvas.offsetWidth);
    let mainH = (this.viewer.canvas.height = this.viewer.canvas.offsetHeight);

    const fov = (this.viewer.cameraProperties.fov * Math.PI) / 180;
    const h = 2 * distance * Math.tan(fov / 2.0);
    c = h / mainH;

    // const direction = vec3.subtract(vec3.create(), origin, camera);
    // vec3.normalize(direction, direction);

    let dis = c * Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));

    let x1 = 0;
    let y1 = 0;
    let z1 = 0;
    x1 = deltaX > 0 ? dis : -dis;
    y1 = deltaY > 0 ? dis : -dis;
    z1 = (deltaY > 0 ? 1 : -1) * dis;
    let vecMove = vec3.fromValues(x1, y1, -z1);
    console.log(c);

    let offX = 0,
      offY = 0,
      offZ = 0;
    this.pointes.forEach(arr => {
      let vecNow = vec3.fromValues(arr[0], arr[1], arr[2]);
      vec3.add(vecNow, vecNow, vecMove);
      offX = vecNow[0] - arr[0];
      offY = -(vecNow[1] - arr[1]);
      offZ = vecNow[2] - arr[2];

      if (this.dirId == 3 || this.dirId == 4) {
        offY = 0;
        offZ = 0;
      } else if (this.dirId == 1 || this.dirId == 2) {
        offX = 0;
        offY = 0;
      } else if (this.dirId == 5 || this.dirId == 6) {
        offX = 0;
        offZ = 0;
      }
      arr[0] += offX;
      arr[1] += offY;
      arr[2] += offZ;
      console.log(offX, offY, offZ, this.dirId);
      // arr[1] += deltaY * c;
    });
    this.doOnChangePos(offX, offY, offZ);
    this.doDraw();
  }
  doOnChangePos(moveX: number, moveY: number, moveZ: number) {}
  private _initShader(): void {
    var gl = this.viewer.gl;
    var viewer = this.viewer;
    var compile = (shader: any, code: any) => {
      gl.shaderSource(shader, code);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        let msg = gl.getShaderInfoLog(shader);
        viewer.error(msg);
        return null;
      }
    };

    //fragment shader
    // Fragment shader source code
    const fragCode = `precision mediump float; uniform vec4 uColour;
      varying vec4 vIdColor;
      void main(void) {
      gl_FragColor = vIdColor;
      }`;
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
    compile(fragmentShader, fragCode);

    //vertex shader (the more complicated one)
    var vertexShader = gl.createShader(gl.VERTEX_SHADER) as WebGLProgram;
    compile(vertexShader, vshader);

    //link program
    this.program = gl.createProgram() as WebGLProgram;
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      viewer.error("Could not initialise shaders for a navigation cube plugin");
    }
  }
  public pointes: any[] = [];
  getPoints(off = 0, box: any) {
    let pos = {
      x: box[0] - off,
      y: box[1] - off,
      z: box[2] - off
    };
    let size = {
      x: box[3] + off * 2,
      y: box[4] + off * 2,
      z: box[5] + off * 2
    };

    let A = [pos.x, pos.y, pos.z];
    let B = [pos.x + size.x, pos.y, pos.z];
    let C = [pos.x + size.x, pos.y + size.y, pos.z];
    let D = [pos.x, pos.y + size.y, pos.z];

    let E = [pos.x, pos.y, pos.z + size.z];
    let F = [pos.x + size.x, pos.y, pos.z + size.z];
    let G = [pos.x + size.x, pos.y + size.y, pos.z + size.z];
    let H = [pos.x, pos.y + size.y, pos.z + size.z];
    return [A, B, C, D, E, F, G, H];
  }
  doDraw() {
    if (!this.initialized || this.stopped || this.pointes.length == 0) {
      return;
    }

    let funcAddPoint = (arr: number[], vertices: number[]) => {
      arr.forEach(num => {
        vertices.push(num);
      });
    };

    let vertices1: number[] = [];
    this.pointes.forEach((data: any) => {
      funcAddPoint(data, vertices1);
    });
    this.drawPlane(vertices1);
  }
  id = 1000;
  drawPlane(vertices: any) {
    const gl = this.setActive();

    // set uniforms
    gl.uniformMatrix4fv(this.pUniformPointer, false, this.viewer.pMatrix);
    gl.uniformMatrix4fv(this.mvUniformPointer, false, this.viewer.mvMatrix);
    gl.uniform4fv(this.colourUniformPointer, this.colour);
    // Bind vertex buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
    // Pass the vertex data to the buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Point an attribute to the currently bound VBO
    // gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
    gl.vertexAttribPointer(
      this.coordinatesAttributePointer,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.uniform1f(this._prodId, this.id);

    gl.enable(gl.BLEND);
    // gl.enable(gl.DEPTH_TEST);
    // gl.blendFunc(gl.ONE_MINUS_DST_COLOR, gl.ONE_MINUS_SRC_COLOR);

    // Draw lines
    gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 3);
  }

  // tslint:disable: no-empty
  public onBeforeDraw(width: number, height: number): void {}

  public onBeforeDrawId(): void {}

  private setActive(): WebGLRenderingContext {
    var gl = this.viewer.gl;
    //set own shader
    gl.useProgram(this.program);

    return gl;
  }
  toggleSelected(flagSel = true) {
    var gl = this.setActive();
    this._modelId = flagSel ? 2 : 0;
    gl.uniform1f(this._colourCodingUniformPointer, this._modelId);
  }
  public onAfterDraw(width: number, height: number) {
    if (this.stopped) {
      return;
    }
    var gl = this.setActive();
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);

    //set uniform for colour coding to false
    gl.uniform1f(this._colourCodingUniformPointer, this._modelId);
    this.doDraw();
  }
  public onAfterDrawId() {
    if (this.stopped) {
      return;
    }
    var gl = this.setActive();
    //set uniform for colour coding to true
    gl.uniform1f(this._colourCodingUniformPointer, 1);

    this.doDraw();
  }

  public onAfterDrawModelId() {
    if (this.stopped) {
      return;
    }
    var gl = this.setActive();
    //set uniform for colour coding to this model id
    gl.uniform1f(this._colourCodingUniformPointer, this._modelId);
    this.doDraw();
  }

  checkSelMian(event: any) {
    {
      let viewer = this.viewer;
      if (this.stopped || viewer.plugins.indexOf(this) < 0) {
        return 0;
      }

      var id = this.getId(event) as number;
      // 更新切面大小
      return id;
    }
  }
  private getId(event: MouseEvent | Touch) {
    let x = event.clientX;
    let y = event.clientY;

    //get coordinates within canvas (with the right orientation)
    let r = this.viewer.canvas.getBoundingClientRect();
    let viewX = x - r.left;
    let viewY = this.viewer.height - (y - r.top);

    const gl = this.viewer.gl;
    var fb = new Framebuffer(
      gl,
      this.viewer.width,
      this.viewer.height,
      false,
      this.viewer.glVersion
    );
    gl.viewport(0, 0, this.viewer.width, this.viewer.height);
    // gl.enable(gl.DEPTH_TEST); //we don't use any kind of blending or transparency
    gl.disable(gl.BLEND);
    // clear all
    gl.clearColor(0, 0, 0, 0); //zero colour for no-values
    // tslint:disable-next-line: no-bitwise
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.onAfterDrawId();
    const id = fb.getId(viewX, viewY);
    fb.delete();
    return id;
  }
}
