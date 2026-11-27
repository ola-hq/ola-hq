const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),base='83484897d7e4373947891296fc6a526e3d95c1ab',assetRoot='https://ola-hq.github.io/ola-hq/';
function read(file){return file.startsWith('labs/lore-preview/')?fs.readFileSync(path.join(root,file),'utf8'):cp.execFileSync('git',['show',base+':'+file],{cwd:root,encoding:'utf8',maxBuffer:10*1024*1024})}
function local(ref){return path.posix.normalize('labs/lore-preview/'+ref.split('?')[0])}
const assets={};
for(const name of ['cabin.png','secret-rooms.png'])assets['assets/'+name]='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'assets',name)).toString('base64');
let html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,ref)=>'<style>'+read(local(ref))+'</style>');
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,ref)=>'<script>'+read(local(ref)).replaceAll('document.currentScript.src',JSON.stringify(assetRoot)).replace(/<\/script/gi,'<\\/script')+'</script>');
for(const [name,data]of Object.entries(assets))html=html.replaceAll(name,data);
const output=path.join(root,'preview-dist');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'OLA-HQ-hidden-currents-preview.html'),html);
fs.writeFileSync(path.join(output,'READ-ME.txt'),'UNRELEASED OLA LORE SAMPLE\n\nOpen OLA-HQ-hidden-currents-preview.html in a desktop browser. Internet is required for the accepted globe model, existing sky art and public-world pages. The two cabin images and sample code are bundled into this file.\n\nThis is a separate study, not the live homepage or app. No mileage, identity, leaderboard or service data is stored by this sample. Public world pages may retain their normal behavior and analytics when you deliberately visit them.\n\nThe cabin secrets are in the ordinary chair, bar and window. Preview controls below the world doors let you review the brief ship pass without waiting. The deployed site and app were not edited.\n\nPhysical phone and browser visual acceptance are still pending; automated state/build tests are not physical-device acceptance.\n');
console.log('Built standalone preview with pinned globe/sky sources:',html.length,'characters');
