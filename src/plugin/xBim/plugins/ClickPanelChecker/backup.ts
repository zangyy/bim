// export default class Back{
//   go(){
//     var vertices:any[] = []
//     vertices=vertices.concat(A,B,F,E,C,D,H,G,E,F,G,H,A,B,C,D,F,B,C,G,A,E,H,D);
//     var colors = [
//       [1.0,  1.0,  1.0,  1.0],    // Front face: white
//       [1.0,  0.0,  0.0,  1.0],    // Back face: red
//       [0.0,  1.0,  0.0,  1.0],    // Top face: green
//       [0.0,  0.0,  1.0,  1.0],    // Bottom face: blue
//       [1.0,  1.0,  0.0,  1.0],    // Right face: yellow
//       [1.0,  0.0,  1.0,  1.0]     // Left face: purple
//     ];
    
//     let generatedColors:any[] = [];
    
//     for (let j=0; j<6; j++) {
//       var c = colors[j];
    
//       for (var i=0; i<4; i++) {
//         generatedColors = generatedColors.concat(c);
//       }
//     }
    
//     var cubeVerticesColorBuffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesColorBuffer);
//     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(generatedColors), gl.STATIC_DRAW);
//     var cubeVerticesIndexBuffer = gl.createBuffer();
//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVerticesIndexBuffer);
    
    
//     var cubeVertexIndices = [
//       0,  1,  2,      0,  2,  3,    // front
//       4,  5,  6,      4,  6,  7,    // back
//       8,  9,  10,     8,  10, 11,   // top
//       12, 13, 14,     12, 14, 15,   // bottom
//       16, 17, 18,     16, 18, 19,   // right
//       20, 21, 22,     20, 22, 23    // left
//     ];
    
//     // Now send the element array to GL
    
//     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
//         new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
//         gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVerticesIndexBuffer);
// // setMatrixUniforms();
// gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
//   }
// }