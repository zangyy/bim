import { IPlugin } from "../plugin";
import { Viewer, Framebuffer } from "@xbim/viewer";
import { vshader } from "./vshader";
import { vec4, vec3 } from "gl-matrix";

export class ClickPanelChecker implements IPlugin {
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
  private _modelId = 100000001;

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
  selectedPanelId!: number;
  getClickPanel(box: any, event: any) {
    this.stopped = false;
    this.selectedBox = box;
    this.doDraw();
    let panelId = this.checkSelMian(event);
    this.selectedPanelId = panelId;
    this.stopped = true;
    return this.boxData.find(item => item.id == panelId);
  }
  checkSelMian(event: any) {
    {
      let viewer = this.viewer;
      if (this.stopped) {
        return 0;
      }
      var startX = event.clientX;
      var startY = event.clientY;

      var r = viewer.canvas.getBoundingClientRect();
      var x = startX - r.left;
      var y = viewer.height - (startY - r.top);

      var id = this.getId(event) as number;
      // 更新切面大小
      let conf = this.boxData.find(c => c.id == id);
      if (conf) {
        conf.plane1 = this.getPoints1(id);
      }
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
    gl.enable(gl.DEPTH_TEST); //we don't use any kind of blending or transparency
    gl.disable(gl.BLEND);
    // clear all
    gl.clearColor(0, 0, 0, 0); //zero colour for no-values
    // tslint:disable-next-line: no-bitwise
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.onAfterDrawId();
    const id = fb.getId(viewX, viewY);
    let pos = fb.getXYZ(viewX, viewY);
    fb.delete();
    return id;
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
  public selectedBox: Float32Array | undefined;
  boxData: any[] = [];
  getPoints1(id: number) {
    if (!this.selectedBox) {
      return;
    }
    let box = this.selectedBox;
    let viewBox = this.viewer.getTargetBoundingBox();
    let max = Math.max(viewBox[3], viewBox[4], viewBox[5]);
    let off = max + 400;
    let pos = {
      x: box[0],
      y: box[1],
      z: box[2]
    };
    let size = {
      x: box[3],
      y: box[4],
      z: box[5]
    };
    if (id == 1 || id == 2) {
      // z不动
      pos.x -= off;
      pos.y -= off;
      size.x += off * 2;
      size.y += off * 2;
    } else if (id == 3 || id == 4) {
      // x不动
      pos.z -= off;
      pos.y -= off;
      size.z += off * 2;
      size.y += off * 2;
    } else if (id == 5 || id == 6) {
      // y不动
      pos.x -= off;
      pos.z -= off;
      size.x += off * 2;
      size.z += off * 2;
    }

    let A1 = [pos.x, pos.y, pos.z];
    let B1 = [pos.x + size.x, pos.y, pos.z];
    let C1 = [pos.x + size.x, pos.y + size.y, pos.z];
    let D1 = [pos.x, pos.y + size.y, pos.z];

    let E1 = [pos.x, pos.y, pos.z + size.z];
    let F1 = [pos.x + size.x, pos.y, pos.z + size.z];
    let G1 = [pos.x + size.x, pos.y + size.y, pos.z + size.z];
    let H1 = [pos.x, pos.y + size.y, pos.z + size.z];
    switch (id) {
      case 1: {
        return [A1, B1, D1, C1];
      }
      case 2: {
        return [E1, F1, H1, G1];
      }
      case 3: {
        return [A1, E1, D1, H1];
      }
      case 4: {
        return [B1, F1, C1, G1];
      }
      case 5: {
        return [C1, G1, D1, H1];
      }
      case 6: {
        return [E1, F1, A1, B1];
      }
    }
  }
  getPoints(box: any) {
    let off = 0;
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
    if (!this.initialized || this.stopped) {
      return;
    }
    if (!this.selectedBox) {
      return;
    }

    let [A, B, C, D, E, F, G, H] = this.getPoints(this.selectedBox);
    let [A1, B1, C1, D1, E1, F1, G1, H1] = this.getPoints(this.selectedBox);

    let funcAddPoint = (arr: number[], vertices: number[]) => {
      arr.forEach(num => {
        vertices.push(num);
      });
    };

    this.boxData = [
      {
        plane: [A, B, D, C],
        plane1: [A1, B1, D1, C1],
        faxian: [A, E],
        id: 1.0
      },
      {
        plane: [E, F, H, G],
        plane1: [E1, F1, H1, G1],
        faxian: [E, A],
        id: 2.0
      },
      {
        id: 3.0,
        plane: [A, E, D, H],
        plane1: [A1, E1, D1, H1],
        faxian: [E, F]
      },
      {
        id: 4.0,
        plane: [B, F, C, G],
        plane1: [B1, F1, C1, G1],
        faxian: [B, A]
      },
      {
        id: 5.0,
        plane: [C, G, D, H],
        plane1: [C1, G1, D1, H1],
        faxian: [H, E]
      },
      {
        id: 6.0,
        plane: [E, F, A, B],
        plane1: [E1, F1, A1, B1],
        faxian: [E, H]
      }
    ];
    this.boxData.forEach(conf => {
      let vertices1: number[] = [];
      conf.plane.forEach((data: any) => {
        funcAddPoint(data, vertices1);
      });
      this.drawPlane(vertices1, conf.id, conf.id2);
    });
  }
  drawPlane(vertices: any, id: number, id2: number) {
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

    gl.uniform1f(this._prodId, id);

    gl.enable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    // gl.blendFunc(gl.ONE_MINUS_DST_COLOR, gl.ONE_MINUS_SRC_COLOR);

    // Draw lines
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length / 3);
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
  public onAfterDraw(width: number, height: number) {
    if (this.stopped) {
      return;
    }
    var gl = this.setActive();
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    //set uniform for colour coding to false
    gl.uniform1f(this._colourCodingUniformPointer, 0);
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
}
