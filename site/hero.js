(function(){
  var hero=document.getElementById('lhHero'),cv=document.getElementById('lhCanvas');
  if(!hero||!cv)return;
  var gl=cv.getContext('webgl',{antialias:false,alpha:false});
  if(!gl)return;
  var root=document.documentElement,run=true,vis=true,t0=performance.now();
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FS='precision highp float;uniform vec2 R;uniform float T;uniform float L;'+
  'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}'+
  'void main(){vec2 p=(gl_FragCoord.xy-.5*R)/R.y;float y0=R.x<R.y?-.35:-.26;'+
  'vec3 bgD=vec3(.067,.075,.098),bgL=vec3(.961,.965,.980);vec3 bg=mix(bgD,bgL,L);'+
  'vec3 c1=mix(vec3(.45,.72,1.),vec3(.18,.44,.95),L),c2=mix(vec3(.62,.55,1.),vec3(.42,.32,.9),L);'+
  'vec3 col=bg;float sx=smoothstep(-.7,.7,p.x);vec3 cc=mix(c1,c2,sx);'+
  'col+=(cc-bg*0.)*exp(-abs(p.y-y0)*9.)*mix(.5,.22,L);'+
  'col+=cc*exp(-max(p.y-y0,0.)*3.2)*mix(.10,.06,L);'+
  'if(p.y<y0){float z=1./(y0-p.y);float x=p.x*z;float gx=abs(fract(x*.5)-.5),gz=abs(fract(z*.45+T*.3)-.5);'+
  'float w=.012+.0025*z;float ln=smoothstep(w,0.,gx)+smoothstep(w*.9,0.,gz);ln*=smoothstep(28.,4.,z)*mix(.8,1.,smoothstep(.02,.25,y0-p.y));'+
  'col=mix(col,cc,clamp(ln*mix(.7,.55,L),0.,1.));}'+
  'col+=(hash(gl_FragCoord.xy+fract(T)*97.)-.5)*mix(.03,.015,L);gl_FragColor=vec4(col,1.);}';
  function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o}
  var pr=gl.createProgram();
  gl.attachShader(pr,sh(gl.VERTEX_SHADER,'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'));
  gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return;
  gl.useProgram(pr);
  var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  var a=gl.getAttribLocation(pr,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  var uR=gl.getUniformLocation(pr,'R'),uT=gl.getUniformLocation(pr,'T'),uL=gl.getUniformLocation(pr,'L');
  function size(){var r=hero.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,1.5);cv.width=Math.max(2,r.width*d);cv.height=Math.max(2,r.height*d);gl.viewport(0,0,cv.width,cv.height);draw(performance.now())}
  function draw(ts){
    gl.uniform2f(uR,cv.width,cv.height);gl.uniform1f(uT,reduce?2:(ts-t0)/1000);
    gl.uniform1f(uL,root.getAttribute('data-theme')==='light'?1:0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}
  function loop(ts){if(run&&vis&&!reduce)draw(ts);requestAnimationFrame(loop)}
  if('IntersectionObserver' in window)new IntersectionObserver(function(e){vis=e[0].isIntersecting}).observe(hero);
  document.addEventListener('visibilitychange',function(){run=!document.hidden});
  new MutationObserver(function(){draw(performance.now())}).observe(root,{attributes:true,attributeFilter:['data-theme']});
  window.addEventListener('resize',size);window.addEventListener('load',size);size();requestAnimationFrame(loop);
})();

(function(){function s(){var h=document.querySelector('.site-header');if(h)document.documentElement.style.setProperty('--hh',(h.offsetHeight+parseFloat(getComputedStyle(h).marginTop||0)+(parseFloat(getComputedStyle(h).top)||0)-0)+'px')}s();addEventListener('resize',s);addEventListener('load',s)})();
