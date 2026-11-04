(function(){var root=document.getElementById('sc');if(!root)return;
var items=root.querySelectorAll('.sc-item'),shots=root.querySelectorAll('.sc-shot'),ds=root.querySelectorAll('.sc-d'),url=document.getElementById('scUrl'),frame=root.querySelector('.sc-frame'),stage=root.querySelector('.sc-stage');
function go(i){[].forEach.call(items,function(e,k){e.classList.toggle('is-on',k===i)});
[].forEach.call(ds,function(e,k){e.classList.toggle('is-on',k===i)});
[].forEach.call(shots,function(e,k){var on=k===i;e.classList.toggle('is-on',on);if(on)e.scrollTop=0});
url.textContent=items[i].querySelector('b').textContent}
[].forEach.call(items,function(b,i){b.addEventListener('click',function(){go(i)})});
stage.addEventListener('pointermove',function(e){if(innerWidth<900)return;var r=stage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;frame.style.transform='perspective(1100px) rotateY('+(x*5)+'deg) rotateX('+(-y*3.5)+'deg)'});
stage.addEventListener('pointerleave',function(){frame.style.transform=''});
})();
