import { IPlugin } from "../plugin";
import { Viewer } from "@xbim/viewer";
import { mat4, vec3, mat3 } from "gl-matrix";

export class TextRender implements IPlugin {
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

  private viewer!: Viewer;
  private program!: any;

  constructor(viewer: Viewer) {
    this.viewer = viewer;
    this.init();
  }
  buffers: any;
  position: vec3 = vec3.fromValues(
    -5415.40478515625,
    647.7828369140625,
    5741.4638671875
  );
  flagInited = false;
  texture!: any;
  init() {
    this.buffers = this.initBuffers();

    this.main();
    this.flagInited = true;
  }
  renderText(txt: string = "") {
    let canvas: any = document.querySelector("#canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "canvas";
      document.body.appendChild(canvas);
    }
    const scale = 1; // 精度
    let size = 20;
    const value = txt;
    const ctx = canvas.getContext("2d"); // 获取2D绘图上下文
    let w = ctx.measureText(value).width;
    ctx.globalAlpha = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0)";
    canvas.width = w * scale;
    canvas.height = w * scale;

    ctx.textBaseline = "middle";

    // =E 绘制坐标参照系

    //绘制字体
    ctx.font = size * scale + 'px "微软雅黑"';
    ctx.fillText(value, 0, canvas.height / 2);

    function imageDataHRevert(sourceData: any, newData: any) {
      for (var i = 0, h = sourceData.height; i < h; i++) {
        for (let j = 0, w = sourceData.width; j < w; j++) {
          newData.data[i * w * 4 + j * 4 + 0] =
            sourceData.data[i * w * 4 + (w - j) * 4 + 0];
          newData.data[i * w * 4 + j * 4 + 1] =
            sourceData.data[i * w * 4 + (w - j) * 4 + 1];
          newData.data[i * w * 4 + j * 4 + 2] =
            sourceData.data[i * w * 4 + (w - j) * 4 + 2];
          newData.data[i * w * 4 + j * 4 + 3] =
            sourceData.data[i * w * 4 + (w - j) * 4 + 3];
        }
      }
      return newData;
    }
    var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var newImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imageDataHRevert(newImgData, imgData), 0, 0);

    this.loadTexture(canvas.toDataURL("image/png"));
    // drawTextCanvasToWebGL(ctx.canvas); //绘制文字纹理到WebGL
  }
  loadTexture(url: string) {
    let gl = this.viewer.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Because images have to be download over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      width,
      height,
      border,
      srcFormat,
      srcType,
      pixel
    );

    const image = new Image();
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        srcFormat,
        srcType,
        image
      );

      // WebGL1 has different requirements for power of 2 images
      // vs non power of 2 images so check if the image is a
      // power of 2 in both dimensions.
      if (this.isPowerOf2(image.width) && this.isPowerOf2(image.height)) {
        // Yes, it's a power of 2. Generate mips.
        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        // No, it's not a power of 2. Turn of mips and set
        // wrapping to clamp to edge
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      this.texture = texture;
    };
    image.src = url;

    return texture;
  }
  isPowerOf2(value: any) {
    return (value & (value - 1)) == 0;
  }

  onAfterDraw() {
    this.drawScene();
  }
  onBeforeDraw() {
    // this.drawCube();
  }
  onBeforeDrawId() {}
  onAfterDrawId() {}
  onAfterDrawModelId() {}
  //
  // Start here
  //
  main() {
    let gl = this.viewer.gl;

    // If we don't have a GL context, give up now

    if (!gl) {
      alert(
        "Unable to initialize WebGL. Your browser or machine may not support it."
      );
      return;
    }

    // Vertex shader program

    const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord;

    uniform mat4 uMVMatrix;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying highp vec2 vTextureCoord;

    void main(void) {

      gl_Position = uProjectionMatrix  * uMVMatrix* uModelViewMatrix * aVertexPosition;
      vTextureCoord = aTextureCoord;
    }
  `;

    // Fragment shader program

    const fsSource = `
    varying highp vec2 vTextureCoord;

    uniform sampler2D uSampler;

    void main(void) {
      gl_FragColor = texture2D(uSampler, vTextureCoord);
    }
  `;

    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    const shaderProgram = this.initShaderProgram(gl, vsSource, fsSource);

    // Collect all the info needed to use the shader program.
    // Look up which attributes our shader program is using
    // for aVertexPosition, aVertexColor and also
    // look up uniform locations.
    this.program = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        textureCoord: gl.getAttribLocation(shaderProgram, "aTextureCoord")
      },
      uniformLocations: {
        mvMatrix: gl.getUniformLocation(shaderProgram, "uMVMatrix"),
        projectionMatrix: gl.getUniformLocation(
          shaderProgram,
          "uProjectionMatrix"
        ),
        modelViewMatrix: gl.getUniformLocation(
          shaderProgram,
          "uModelViewMatrix"
        ),
        uSampler: gl.getUniformLocation(shaderProgram, "uSampler")
      }
    };

    // Here's where we call the routine that builds all the
    // objects we'll be drawing.
  }

  //
  // initBuffers
  //
  // Initialize the buffers we'll need. For this demo, we just
  // have one object -- a simple three-dimensional cube.
  //
  initBuffers() {
    let gl = this.viewer.gl;

    // Create a buffer for the cube's vertex positions.

    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now create an array of positions for the cube.
    let len = 500;
    let y = 0.1;
    const positions = [
      // Front face
      -len,
      -y,
      len,

      len,
      -y,
      len,

      len,
      y,
      len,

      -len,
      y,
      len,

      // Back face
      -len,
      -y,
      -len,

      -len,
      y,
      -len,

      len,
      y,
      -len,

      len,
      -y,
      -len,

      // Top face
      -len,
      y,
      -len,

      -len,
      y,
      len,

      len,
      y,
      len,

      len,
      y,
      -len,

      // Bottom face
      -len,
      -y,
      -len,

      len,
      -y,
      -len,

      len,
      -y,
      len,

      -len,
      -y,
      len,

      // Right face
      len,
      -y,
      -len,

      len,
      y,
      -len,

      len,
      y,
      len,

      len,
      -y,
      len,

      // Left face
      -len,
      -y,
      -len,

      -len,
      -y,
      len,

      -len,
      y,
      len,

      -len,
      y,
      -len
    ];

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Now set up the texture coordinates for the faces.

    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

    const textureCoordinates = [
      // Front
      0.0,
      0.0,

      0.0,
      0.0,

      0.0,
      0.0,

      0.0,
      0.0,
      // Back
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      // Top
      1.0,
      0.0,
      1.0,
      1.0,
      0.0,
      1.0,
      0.0,
      0.0,
      // Bottom
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      // Right
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      // Left
      0.0,
      0.0,
      1.0,
      0.0,
      1.0,
      1.0,
      0.0,
      1.0
    ];

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(textureCoordinates),
      gl.STATIC_DRAW
    );

    // Build the element array buffer; this specifies the indices
    // into the vertex arrays for each face's vertices.

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.

    const indices = [
      0,
      1,
      2,
      0,
      2,
      3, // front
      4,
      5,
      6,
      4,
      6,
      7, // back
      8,
      9,
      10,
      8,
      10,
      11, // top
      12,
      13,
      14,
      12,
      14,
      15, // bottom
      16,
      17,
      18,
      16,
      18,
      19, // right
      20,
      21,
      22,
      20,
      22,
      23 // left
    ];

    // Now send the element array to GL

    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      gl.STATIC_DRAW
    );

    return {
      position: positionBuffer,
      textureCoord: textureCoordBuffer,
      indices: indexBuffer
    };
  }
  public getMatrix(): mat4 {
    let trans = mat4.create();
    let trans1 = this.position;
    mat4.translate(
      trans, // destination matrix
      trans, // matrix to translate
      trans1
    );
    return trans;
  }
  //
  // Draw the scene.
  //
  drawScene() {
    if (this.stopped || !this.texture) {
      return;
    }
    let gl = this.viewer.gl;
    let programInfo = this.program;
    let buffers = this.buffers;
    let texture = this.texture;
    let cubeRotation = 0.0;

    gl.enable(gl.DEPTH_TEST); // Enable depth testing

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    let modelViewMatrix = this.getMatrix();

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute
    {
      const numComponents = 3;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
      gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset
      );
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the texture coordinates from
    // the texture coordinate buffer into the textureCoord attribute.
    {
      const numComponents = 2;
      const type = gl.FLOAT;
      const normalize = false;
      const stride = 0;
      const offset = 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
      gl.vertexAttribPointer(
        programInfo.attribLocations.textureCoord,
        numComponents,
        type,
        normalize,
        stride,
        offset
      );
      gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
    }

    // Tell WebGL which indices to use to index the vertices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

    // Tell WebGL to use our program when drawing

    gl.useProgram(programInfo.program);

    // Set the shader uniforms

    gl.uniformMatrix4fv(
      programInfo.uniformLocations.mvMatrix,
      false,
      this.viewer.mvMatrix
    );
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      this.viewer.pMatrix
    );
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix
    );

    // Specify the texture to map onto the faces.

    // Tell WebGL we want to affect texture unit 0
    gl.activeTexture(gl.TEXTURE0);

    // Bind the texture to texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Tell the shader we bound the texture to texture unit 0
    gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

    {
      const vertexCount = 36;
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }

    // Update the rotation for the next draw

    // cubeRotation += deltaTime;
  }

  //
  // Initialize a shader program, so WebGL knows how to draw our data
  //
  initShaderProgram(gl: any, vsSource: any, fsSource: any) {
    const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert(
        "Unable to initialize the shader program: " +
          gl.getProgramInfoLog(shaderProgram)
      );
      return null;
    }

    return shaderProgram;
  }

  //
  // creates a shader of the given type, uploads the source and
  // compiles it.
  //
  loadShader(gl: any, type: any, source: any) {
    const shader = gl.createShader(type);

    // Send the source to the shader object

    gl.shaderSource(shader, source);

    // Compile the shader program

    gl.compileShader(shader);

    // See if it compiled successfully

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(
        "An error occurred compiling the shaders: " +
          gl.getShaderInfoLog(shader)
      );
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }
}
