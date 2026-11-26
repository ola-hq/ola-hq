// Artwork coordinates are source-image pixels, never viewport pixels.
export const artwork = Object.freeze({width:1672,height:941,
 leftSpeaker:[34,339,400,400],rightSpeaker:[1250,339,400,400],
 display:[452,290,766,490],keys:[576,801,506,70],volume:[1410,94,140,70]});
export function anchor(rect){
 return {left:rect[0]/artwork.width*100,top:rect[1]/artwork.height*100,
  width:rect[2]/artwork.width*100,height:rect[3]/artwork.height*100};
}
export function bandLevel(data,sampleRate,fftSize,low,high){
 const start=Math.max(1,Math.ceil(low*fftSize/sampleRate));
 const end=Math.min(data.length-1,Math.floor(high*fftSize/sampleRate));
 if(end<start)return 0;
 let power=0;
 for(let i=start;i<=end;i++)if(Number.isFinite(data[i]))power+=10**(data[i]/10);
 const rms=Math.sqrt(power/(end-start+1));
 // A gentle measured-signal compression makes quiet musical bands visible; silence stays zero.
 return rms<.0003?0:Math.min(1,Math.pow(rms*8,.62));
}
export function logBands(data,sampleRate,count){
 return Array.from({length:count},(_,i)=>bandLevel(data,sampleRate,2048,
  40*(14000/40)**(i/count),40*(14000/40)**((i+1)/count)));
}
