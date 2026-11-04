(function(){var root=document.getElementById('sc');if(!root)return;
var items=root.querySelectorAll('.sc-item'),shots=root.querySelectorAll('.sc-shot'),ds=root.querySelectorAll('.sc-d'),url=document.getElementById('scUrl'),frame=root.querySelector('.sc-frame'),stage=root.querySelector('.sc-stage');
var cur=-1,timer=0,paused=false,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,DUR=6500;
function go(i){if(i===cur)return;cur=i;
[].forEach.call(items,function(e,k){e.classList.toggle('is-on',k===i)});
[].forEach.call(ds,function(e,k){e.classList.toggle('is-on',k===i)});
[].forEach.call(shots,function(e,k){var on=k===i;e.classList.toggle('is-on',on);var im=e.firstElementChild;
 if(on){im.style.transition='none';im.style.transform='translateY(0)';void im.offsetHeight;
  var view=e.parentNode.clientHeight,dist=Math.max(0,im.offsetHeight-view);dist=Math.min(dist,view*1.6);
  im.style.transition=reduce?'none':'transform '+(DUR/1000+1.5)+'s cubic-bezier(.45,.05,.3,1)';im.style.transform='translateY(-'+dist+'px)'}});
url.textContent=items[i].querySelector('b').textContent}
function loop(){clearTimeout(timer);timer=setTimeout(function(){if(!paused)go((cur+1)%items.length);loop()},DUR)}
[].forEach.call(items,function(b,i){b.addEventListener('click',function(){go(i);loop()});b.addEventListener('mouseenter',function(){go(i);paused=true});b.addEventListener('mouseleave',function(){paused=false})});
stage.addEventListener('mouseenter',function(){paused=true});stage.addEventListener('mouseleave',function(){paused=false;frame.style.transform=''});
stage.addEventListener('pointermove',function(e){if(innerWidth<900)return;var r=stage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;frame.style.transform='perspective(1100px) rotateY('+(x*7)+'deg) rotateX('+(-y*5)+'deg)'});
var started=false;new IntersectionObserver(function(en){if(en[0].isIntersecting&&!started){started=true;go(0);loop()}},{threshold:.25}).observe(root);
})();
