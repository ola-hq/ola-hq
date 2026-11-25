// Source-relative moon geometry: move the complete scene, including its reflection.
// Values measured from the supplied poster frames; no synthetic second moon layer.
export function oceanComposition(width,headerBottom=160){
 const portrait=width<=700;
 const mediaWidth=portrait?Math.min(width*.86,360):Math.min(width,1600);
 const mediaHeight=mediaWidth*(portrait?16/9:9/16);
 const radius=mediaWidth*(portrait?.30:.101);
 const moonX=portrait?width*.58:width<=1100?width*.72:Math.min(width-radius-36,width/2+515);
 const moonY=headerBottom+radius+32;
 return {portrait,mediaWidth,mediaHeight,left:moonX-mediaWidth*(portrait?.433:.476),top:moonY-mediaHeight*(portrait?.28:.262),moonX,moonY,radius,skyGap:width<=1100?radius*2+65:0};
}
