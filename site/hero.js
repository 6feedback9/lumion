(function(){
  var hero=document.getElementById('lhHero'),cv=document.getElementById('lhCanvas');
  if(!hero||!cv||!cv.getContext)return;
  var ctx=cv.getContext('2d'),root=document.documentElement,copy=hero.querySelector('.lh-hero__copy');
  var W=0,H=0,dpr=1,rows=[],zone=null,mx=-999,my=-999,t0=performance.now(),running=true,mob=false;
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TOK=['<section>','display:grid','const','await fetch(','</div>','@media','hreflang','200 OK','git push','flex','LCP 0.9s','schema.org','npm run build','sitemap.xml','canonical','aria-label','=>','return','import','loading="lazy"','WebP','CDN','/cases','GA4','CRM','API','<h1>','z-index','deploy ✓','robots.txt','{ }','404→301','og:image','INP 120ms','CLS 0.02'];
  function rnd(n){return Math.floor(Math.random()*n)}
  function mk(){var s='';while(s.length<420)s+=TOK[rnd(TOK.length)]+'   ';return s}
  function size(){
    var r=hero.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);W=r.width;H=r.height;
    cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
    mob=W<700;var fs=mob?12:15,gap=mob?28:30;
    rows=[];for(var y=gap,i=0;y<H;y+=gap,i++)rows.push({y:y,s:mk(),v:(18+rnd(34))*(i%2?1:-1),fs:fs,o:rnd(900)});
    var cp=copy.getBoundingClientRect(),pad=mob?18:56;
    zone={x1:cp.left-r.left-pad,x2:cp.right-r.left+pad,y1:cp.top-r.top-pad,y2:cp.bottom-r.top+pad};
    if(!mob){var cx=(zone.x1+zone.x2)/2,hw=Math.min((zone.x2-zone.x1)/2,560);zone.x1=cx-hw;zone.x2=cx+hw}
    draw(performance.now());
  }
  function fade(x,y){if(!zone)return 1;var dx=Math.max(zone.x1-x,0,x-zone.x2),dy=Math.max(zone.y1-y,0,y-zone.y2);return .42+.58*Math.min(Math.hypot(dx,dy)/110,1)}
  function draw(now){
    var t=(now-t0)/1000;ctx.clearRect(0,0,W,H);
    var cs=getComputedStyle(root),ink=cs.getPropertyValue('--ink').trim()||'255,255,255',hit=cs.getPropertyValue('--hit').trim()||'115,183,255';
    var k=root.getAttribute('data-theme')==='light'?.55:1,beam=((t*220)%(W+400))-200;
    ctx.font='400 '+(rows[0]?rows[0].fs:15)+'px "IBM Plex Mono",ui-monospace,monospace';ctx.textBaseline='middle';
    var cw=ctx.measureText('M').width;
    for(var i=0;i<rows.length;i++){
      var r=rows[i],total=r.s.length*cw,off=((t*r.v+r.o)%total+total)%total;
      for(var rep=-1;rep<=Math.ceil(W/total)+1;rep++){
        var x0=rep*total-off;
        for(var c=0;c<r.s.length;c+=6){
          var x=x0+c*cw;if(x>W||x<-cw*6)continue;
          var cx=x+cw*3,fm=fade(cx,r.y),a=.24*fm*k,d=Math.abs(cx-beam),md=Math.hypot(cx-mx,r.y-my),h=0;
          if(d<190)h=Math.max(h,1-d/190);if(md<150)h=Math.max(h,(1-md/150)*.9);h*=fm;
          ctx.fillStyle=h>0?'rgba('+hit+','+(a+h*.7)+')':'rgba('+ink+','+a+')';
          ctx.fillText(r.s.substr(c,6),x,r.y);
        }
      }
    }
  }
  function loop(now){if(running&&!reduce)draw(now);requestAnimationFrame(loop)}
  hero.addEventListener('pointermove',function(e){var b=cv.getBoundingClientRect();mx=e.clientX-b.left;my=e.clientY-b.top});
  hero.addEventListener('pointerleave',function(){mx=my=-999});
  if('IntersectionObserver' in window)new IntersectionObserver(function(e){running=e[0].isIntersecting}).observe(hero);
  if('ResizeObserver' in window)new ResizeObserver(size).observe(hero);else addEventListener('resize',size);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(size);
  new MutationObserver(function(){draw(performance.now())}).observe(root,{attributes:true,attributeFilter:['data-theme']});
  size();requestAnimationFrame(loop);
})();

(function(){function s(){var h=document.querySelector('.site-header');if(h)document.documentElement.style.setProperty('--hh',(h.offsetHeight+parseFloat(getComputedStyle(h).marginTop||0)+(parseFloat(getComputedStyle(h).top)||0)-0)+'px')}s();addEventListener('resize',s);addEventListener('load',s)})();

(function(){var els=document.querySelectorAll('.cx-live');if(!els.length)return;
function fit(e){var f=e.querySelector('iframe'),w=e.clientWidth;if(!w)return;var k=w/1440;f.style.transform='scale('+k+')';f.style.height=(e.clientHeight/k)+'px'}
els.forEach(function(e){fit(e);var on=false;var io=new IntersectionObserver(function(en){if(en[0].isIntersecting&&!on&&innerWidth>700){on=true;var f=e.querySelector('iframe');f.onload=function(){e.classList.add('is-on')};f.src=e.dataset.live;io.disconnect()}},{rootMargin:'200px'});io.observe(e)});
addEventListener('resize',function(){els.forEach(fit)})})();
