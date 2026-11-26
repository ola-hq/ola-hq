// A lazy insert on the existing MediaElementSource. No second audio transport.
export const effectDefaults=()=>({lowpass:false,lowpassHz:6000,highpass:false,highpassHz:200,delay:false,delayMix:.25,delayTime:.3,reverb:false,reverbMix:.2,wah:false,wahRate:.8,wahDepth:.65});
export const effectLimits={lowpassHz:[300,18000],highpassHz:[20,4000],delayMix:[0,.5],delayTime:[.08,.65],reverbMix:[0,.5],wahRate:[.25,5],wahDepth:[.1,1]};
export function effectiveEffects(settings,pads){
 const p={...settings};
 if(pads.has('cut'))Object.assign(p,{lowpass:true,lowpassHz:750});
 if(pads.has('echo'))Object.assign(p,{delay:true,delayMix:.42});
 if(pads.has('space'))Object.assign(p,{reverb:true,reverbMix:.4});
 if(pads.has('sweep'))Object.assign(p,{wah:true,wahRate:2.2});
 return p;
}
export const anyEffect=s=>['lowpass','highpass','delay','reverb','wah'].some(k=>s[k]);
export function createEffectsRack(c){
 const nodes=[],node=n=>(nodes.push(n),n),input=node(c.createGain()),output=node(c.createGain());let lfo=null,depth=null,impulse=null;
 const smooth=(p,v)=>{p.cancelScheduledValues(c.currentTime);p.setTargetAtTime(v,c.currentTime,.025)};
 const limiter=node(c.createDynamicsCompressor());limiter.threshold.value=-3;limiter.knee.value=6;limiter.ratio.value=12;limiter.attack.value=.003;limiter.release.value=.15;output.connect(limiter);
 function filter(type){const inlet=node(c.createGain()),outlet=node(c.createGain()),dry=node(c.createGain()),wet=node(c.createGain()),f=node(c.createBiquadFilter());f.type=type;f.Q.value=.7;dry.gain.value=1;wet.gain.value=0;inlet.connect(dry);dry.connect(outlet);inlet.connect(f);f.connect(wet);wet.connect(outlet);return{inlet,outlet,dry,wet,f}}
 const hp=filter('highpass'),lp=filter('lowpass'),wah=filter('bandpass');input.connect(hp.inlet);hp.outlet.connect(lp.inlet);lp.outlet.connect(wah.inlet);wah.outlet.connect(output);
 const delay=node(c.createDelay(1)),feedback=node(c.createGain()),echo=node(c.createGain()),reverb=node(c.createConvolver()),space=node(c.createGain());
 feedback.gain.value=.28;echo.gain.value=space.gain.value=0;wah.outlet.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(echo);echo.connect(output);wah.outlet.connect(reverb);reverb.connect(space);space.connect(output);
 function update(s){
  for(const [stage,on,hz]of [[hp,s.highpass,s.highpassHz],[lp,s.lowpass,s.lowpassHz],[wah,s.wah,2400]]){smooth(stage.dry.gain,on?0:1);smooth(stage.wet.gain,on?1:0);smooth(stage.f.frequency,hz)}
  smooth(delay.delayTime,s.delayTime);smooth(echo.gain,s.delay?s.delayMix:0);smooth(space.gain,s.reverb?s.reverbMix:0);
  if(s.reverb&&!impulse){impulse=c.createBuffer(2,Math.floor(c.sampleRate*1.2),c.sampleRate);for(let ch=0;ch<2;ch++){const d=impulse.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3)*.35}reverb.buffer=impulse}
  if(s.wah&&!lfo){lfo=c.createOscillator();depth=c.createGain();lfo.connect(depth);depth.connect(wah.f.frequency);lfo.start()}
  if(lfo){if(s.wah){smooth(lfo.frequency,s.wahRate);smooth(depth.gain,2000*s.wahDepth)}else{lfo.stop();lfo.disconnect();depth.disconnect();lfo=depth=null}}
 }
 return{input,output:limiter,update,dispose(){if(lfo){lfo.stop();lfo.disconnect();depth.disconnect()}for(const n of nodes)n.disconnect();impulse=null}};
}
