export const vshader = `
  attribute vec3 coordinates;
  uniform mediump float uColorCoding; 
  uniform float prodId; 

    attribute vec2 aTextureCoord;
    uniform mat4 uMvMatrix;
  uniform mat4 uPMatrix;
  varying vec4 vIdColor;

  vec4 getIdColor(){
    float product = floor(prodId + 0.5);
    float B = floor(product / (256.0*256.0));
    float G = floor((product - B * 256.0*256.0) / 256.0);
    float R = mod(product, 256.0);
    return vec4(R / 255.0, G / 255.0, B / 255.0, 1.0);
 }

  void main(void) {
    if (uColorCoding == 1.0)
  {
    vIdColor = getIdColor();
  } else if (uColorCoding == 2.0){
   vIdColor = vec4(255.0, 255.0, 0.0, 0.6);
  } else{
   vIdColor = vec4(0.0, 255.0, 0.0, 0.6);
  }

   gl_Position = uPMatrix * uMvMatrix * vec4(coordinates, 1.0);
   vTextureCoord = aTextureCoord;
  }`;
