import { IPlugin } from "../plugin";
import { Viewer } from "@xbim/viewer";
import { vshader } from "./vshader";
import { mat4, vec3, vec4 } from "gl-matrix";
import { TextRender } from "../TextRender/TextRender";

export class Measure implements IPlugin {
  private viewer!: Viewer;
  private program!: WebGLProgram;
  private vertex_buffer!: WebGLBuffer | null;
  private coordinatesAttributePointer!: number;
  private mvUniformPointer!: WebGLUniformLocation | null;
  private pUniformPointer!: WebGLUniformLocation | null;
  private colourUniformPointer!: WebGLUniformLocation | null;
  private initialized = false;
  /**
   * Colour of the grid
   */
  public colour = [0.7, 0, 0.7, 0.8];

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

    // create vertex buffer
    this.vertex_buffer = gl.createBuffer();

    // Get the attribute location
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
    this.coordinatesAttributePointer = gl.getAttribLocation(
      this.program,
      "coordinates"
    );
    gl.vertexAttribPointer(
      this.coordinatesAttributePointer,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );

    // Enable the attribute
    gl.enableVertexAttribArray(this.coordinatesAttributePointer);

    // get uniform locations
    this.colourUniformPointer = gl.getUniformLocation(this.program, "uColour");
    this.pUniformPointer = gl.getUniformLocation(this.program, "uPMatrix");
    this.mvUniformPointer = gl.getUniformLocation(this.program, "uMvMatrix");

    this.initialized = true;
  }

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
    const fragCode =
      "precision mediump float; uniform vec4 uColour;" +
      "void main(void) {" +
      "gl_FragColor = uColour;" +
      "}";
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
  points: number[][] = [];
  public onAfterDraw(width: number, height: number): void {
    this.doDraw();
  }
  public drawWithgl(vertices: any[]) {
    const gl = this.viewer.gl;
    gl.useProgram(this.program);

    // set uniforms
    gl.uniformMatrix4fv(this.pUniformPointer, false, this.viewer.pMatrix);
    gl.uniformMatrix4fv(this.mvUniformPointer, false, this.viewer.mvMatrix);
    gl.uniform4fv(this.colourUniformPointer, this.colour);

    // Bind vertex buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
    // Pass the vertex data to the buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Point an attribute to the currently bound VBO
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
    gl.vertexAttribPointer(
      this.coordinatesAttributePointer,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );

    gl.enable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw lines
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length / 3);
  }
  clearAll() {
    this.listText.forEach((text: TextRender) => {
      text.stopped = true;
    });
    this.listText = [];
  }
  public drawPoint(points: number[]) {
    const vertices: number[] = [];

    let off = 100;
    let pos = {
      x: points[0] - off / 2,
      y: points[1] - off / 2,
      z: points[2] - off / 2
    };

    let A = [pos.x, pos.y, pos.z];
    let B = [pos.x + off, pos.y, pos.z];
    let C = [pos.x + off, pos.y + off, pos.z];
    let D = [pos.x, pos.y + off, pos.z];

    let E = [pos.x, pos.y, pos.z + off];
    let F = [pos.x + off, pos.y, pos.z + off];
    let G = [pos.x + off, pos.y + off, pos.z + off];
    let H = [pos.x, pos.y + off, pos.z + off];

    [A, B, C, F, G, E, H, A, D, C, H, G, E, F, A, B].forEach(data => {
      this.funcAddPoint(vertices, data);
    });
    this.drawWithgl(vertices);
  }
  funcAddPoint(vertices: any[], arr: number[]) {
    arr.forEach(num => {
      vertices.push(num);
    });
  }
  drawLineBetween(point1: number[], point2: number[]) {
    const vertices: number[] = [];

    let off = 10;
    let A = [point1[0], point1[1], point1[2]];
    let B = [point1[0] + off, point1[1], point1[2]];
    let C = [point1[0] + off, point1[1] + off, point1[2]];
    let D = [point1[0], point1[1] + off, point1[2]];

    let E = [point2[0], point2[1], point2[2]];
    let F = [point2[0] + off, point2[1], point2[2]];
    let G = [point2[0] + off, point2[1] + off, point2[2]];
    let H = [point2[0], point2[1] + off, point2[2]];

    [A, B, C, F, G, E, H, A, D, C, H, G, E, F, A, B].forEach(data => {
      this.funcAddPoint(vertices, data);
    });

    this.drawWithgl(vertices);
  }

  // tslint:disable: no-empty
  public onBeforeDraw(width: number, height: number): void {}
  public doDraw() {
    if (!this.initialized || this.stopped) {
      return;
    }
    this.points.forEach((pos, idx) => {
      this.drawPoint(pos);
      if (idx % 2 == 1) {
        // 继续画线和距离
        let posPre = this.points[idx - 1];
        this.drawLineBetween(posPre, pos);
        let vecFrom = vec3.fromValues(posPre[0], posPre[1], posPre[2]);
        let vecTo = vec3.fromValues(pos[0], pos[1], pos[2]);

        let dis = vec3.distance(vecFrom, vecTo);

        let txt = this.listText[idx];
        if (!this.listText[idx]) {
          txt = new TextRender(this.viewer);
          this.viewer.addPlugin(txt);
          this.listText[idx] = txt;
          txt.init();
          txt.renderText("" + dis);
          txt.position = vec3.fromValues(
            (vecFrom[0] + vecTo[0]) / 2,
            (vecFrom[1] + vecTo[1]) / 2,
            (vecFrom[2] + vecTo[2]) / 2
          );
        }
        // this.drawTxt(
        //   (vecFrom[0] + vecTo[0]) / 2,
        //   (vecFrom[1] + vecTo[1]) / 2,
        //   (vecFrom[2] + vecTo[2]) / 2
        // );
      }
    });
  }
  listText: any[] = [];
  drawTxt(x: number, y: number, z: number) {}

  public onBeforeDrawId(): void {}

  public onAfterDrawId(): void {}

  public onAfterDrawModelId(): void {}
}
