import { IPlugin } from "../plugin";
import { Viewer } from "@xbim/viewer";
import { vshader } from "./vshader";

export class Clipping implements IPlugin {
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
  public colour = [200.0, 100.0, 255.0, 1.0];

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
  public drawPoint(points: any[][]) {
    const vertices: number[] = [];

    points.forEach(data => {
      this.funcAddPoint(vertices, data);
    });
    this.drawWithgl(vertices);
  }
  funcAddPoint(vertices: any[], arr: number[]) {
    arr.forEach(num => {
      vertices.push(num);
    });
  }

  // tslint:disable: no-empty
  public onBeforeDraw(width: number, height: number): void {}
  public doDraw() {
    if (!this.initialized || this.stopped) {
      return;
    }
    // this.points.forEach((pos, idx) => {
    //   this.drawPoint(pos);
    // });
  }
  // addPanelData(color,){

  // }

  public onBeforeDrawId(): void {}

  public onAfterDrawId(): void {}

  public onAfterDrawModelId(): void {}
}
