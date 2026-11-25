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

// Original 2000×667 wave/filmstrip artwork: keep its real moon in open space.
export function originalOceanComposition(width,height,headerBottom=160,forceSky=false){
 const portrait=width<=700,reserveSky=forceSky||width<=1100;
 const mediaHeight=portrait?Math.max(660,height*.85):Math.max(640,height-headerBottom+20);
 const mediaWidth=mediaHeight*2000/667,radius=mediaHeight*47/667;
 const moonX=reserveSky?width*(portrait?.77:.74):Math.min(width-radius-36,width/2+515);
 const moonY=headerBottom+32+radius;
 return {portrait,mediaWidth,mediaHeight,left:moonX-mediaWidth*.684,top:moonY-mediaHeight*82/667,moonX,moonY,radius,skyGap:reserveSky?radius*2+65:0};
}
