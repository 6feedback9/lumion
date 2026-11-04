(function(){var els=document.querySelectorAll('.cx-live');if(!els.length)return;
function fit(e){var f=e.querySelector('iframe'),w=e.clientWidth;if(!w)return;var k=w/1440;f.style.transform='scale('+k+')';f.style.height=(e.clientHeight/k)+'px'}
els.forEach(function(e){fit(e);var on=false;var io=new IntersectionObserver(function(en){if(en[0].isIntersecting&&!on&&innerWidth>700){on=true;var f=e.querySelector('iframe');f.onload=function(){e.classList.add('is-on')};f.src=e.dataset.live;io.disconnect()}},{rootMargin:'200px'});io.observe(e)});
addEventListener('resize',function(){els.forEach(fit)})})();
