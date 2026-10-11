(() => {
'use strict';
const galleries={
 dinner:{title:'Welcome Dinner · Casa Sol',images:[
  ['assets/paris-dinner-menu-15.jpg','The printed welcome dinner menu and table setting'],
  ['assets/paris-dinner-06.jpg','A detail from the Casa Sol welcome dinner'],
  ['assets/paris-dinner-116.jpg','Family and friends gathered around the dinner table']
 ]},
 wedding:{title:'Paris Wedding Day',images:[
  ['assets/tuileries-cover.jpg','Walking together at the Tuileries on our wedding day'],
  ['assets/tuileries-group.jpg','Our larger group together at the Tuileries'],
  ['assets/paris-wedding-159.jpg','Wedding guests together overlooking Paris'],
  ['assets/paris-newspaper-176.jpg','Brianna and Jonathan holding their wedding newspaper'],
  ['assets/paris-wedding-229.jpg','A candid moment with family during the day'],

  ['assets/paris-wedding-404.jpg','A candid celebration photograph']
 ]},
 'disneyland-paris':{title:'Disneyland Paris · March 27',images:[['assets/disneyland-paris-group.jpg','Our group photo at Disneyland Paris']]},
 'riverboat':{title:'Our river wedding · The Seine',images:[
  ['assets/riverboat-a.jpg','A moment aboard the wedding celebration boat'],
  ['assets/riverboat-b.jpg','Together on the riverboat after dark']
 ]},
 'travel-orlando':{title:"Our World Trip · Orlando",images:[["assets/orlando-toystory.jpg","At Disney World · a photo from our Orlando days"],["assets/orlando-epcot.jpg","Together at EPCOT after dark"]]},
 'travel-atlantic':{title:"Our World Trip · Atlantic",images:[["assets/world-trip-atlantic-deck.jpg","An Atlantic ship-deck sunset"],["assets/cruise-depart-couple.jpg","Together aboard our cruise"],["assets/cruise-formal.jpg","Dressed up on the crossing"],["assets/cruise-sea-sunset.jpg","Sunlight over the open water"],["assets/azores-lake.jpg","Together by a lake in the Azores"],["assets/azores-hills.jpg","Our hillside view in the Azores"],["assets/casablanca-couple.jpg","Together on the ship near Casablanca"],["assets/casablanca-harbor.jpg","A harbor view from our Casablanca stop"],["assets/coruna-square.jpg","Together in the square at La Coruña"],["assets/coruna-stairs.jpg","A walk around La Coruña"]]},
 'travel-southampton':{title:"Our World Trip · Southampton",images:[["assets/southampton-pub.jpg","A Southampton evening together"],["assets/southampton-dinner.jpg","Another memory from our Southampton stop"]]},
 'travel-paris':{title:"Our World Trip · Paris",images:[["assets/paris-arrival.jpg","Arriving in Paris, before the wedding celebrations"]]},
 'travel-budapest':{title:"Our World Trip · Budapest",images:[["assets/budapest-c.jpg","Together beside the Danube in Budapest"],["assets/budapest-b.jpg","A Budapest evening in warm water"],["assets/budapest-a.jpg","One of our Budapest honeymoon adventures"]]},
 'travel-home':{title:"Our World Trip · Home",images:[["assets/flight-cabin.jpg","Together aboard our journey home"],["assets/flight-home.jpg","A quiet moment on the flight back"]]}
};
const dialog=document.createElement('dialog');dialog.id='loda-gallery';dialog.className='loda-gallery';
dialog.setAttribute('aria-labelledby','loda-gallery-title');
dialog.innerHTML=`<div class="loda-gallery-head"><div><h2 id="loda-gallery-title"></h2><span class="loda-gallery-counter" aria-live="polite"></span></div><button type="button" class="loda-gallery-button" data-close aria-label="Close photo gallery">Close ✕</button></div><div class="loda-gallery-stage"><button type="button" class="loda-gallery-button" data-prev aria-label="Previous photograph">←</button><img alt="" src="" decoding="async"><button type="button" class="loda-gallery-button" data-next aria-label="Next photograph">→</button></div><p class="loda-gallery-caption" aria-live="polite"></p>`;
document.body.append(dialog);
let active=null,index=0,trigger=null,touchStartX=null;
const pic=dialog.querySelector('img'),counter=dialog.querySelector('.loda-gallery-counter'),title=dialog.querySelector('h2'),caption=dialog.querySelector('.loda-gallery-caption');
function render(){if(!active)return;let item=active.images[index];pic.src=item[0];pic.alt=item[1];caption.textContent=item[1];counter.textContent=`${index+1} / ${active.images.length}`;title.textContent=active.title;}
function step(dir){if(!active)return;index=(index+dir+active.images.length)%active.images.length;render();}
document.addEventListener('click',e=>{let b=e.target.closest('[data-open-gallery]');if(!b)return;const g=galleries[b.dataset.openGallery];if(!g)return;trigger=b;active=g;index=0;render();dialog.showModal();dialog.querySelector('[data-close]').focus();});
dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
dialog.querySelector('[data-prev]').addEventListener('click',()=>step(-1));
dialog.querySelector('[data-next]').addEventListener('click',()=>step(1));
dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}if(e.key==='ArrowRight'){e.preventDefault();step(1);}});
dialog.addEventListener('close',()=>{active=null;pic.removeAttribute('src');if(trigger?.isConnected)trigger.focus({preventScroll:true});trigger=null;});
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
pic.addEventListener('touchstart',e=>{touchStartX=e.changedTouches[0].clientX;},{passive:true});
pic.addEventListener('touchend',e=>{if(touchStartX===null)return;const delta=e.changedTouches[0].clientX-touchStartX;touchStartX=null;if(Math.abs(delta)>45)step(delta>0?-1:1);},{passive:true});
window.addEventListener('hashchange',()=>{if(dialog.open)dialog.close();});
})();
