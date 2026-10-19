/* eslint-disable @typescript-eslint/no-unused-expressions -- engine kept verbatim from the design project */
// Procedural painting engine for concept-preview artworks (not Jana's work).
// Ported unchanged from the Claude Design project's tools/brush.js.
export default function Engine(W,H,seed,createCanvas){
  let s=seed>>>0; const r=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  const c=createCanvas(W,H), x=c.getContext('2d'), hc=createCanvas(W,H), hx=hc.getContext('2d');
  hx.fillStyle='#000';hx.fillRect(0,0,W,H);
  const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const jit=(col,a)=>{const[R,G,B]=hex(col);const k=(r()-.5)*a;return `rgb(${Math.max(0,Math.min(255,R+k+(r()-.5)*a*.4))|0},${Math.max(0,Math.min(255,G+k+(r()-.5)*a*.4))|0},${Math.max(0,Math.min(255,B+k+(r()-.5)*a*.4))|0})`;};
  function bez(p0,p1,p2,n){const o=[];for(let i=0;i<=n;i++){const t=i/n,u=1-t;o.push([u*u*p0[0]+2*u*t*p1[0]+t*t*p2[0],u*u*p0[1]+2*u*t*p1[1]+t*t*p2[1]]);}return o;}
  function path(pts,w,col,o={}){
    const n=Math.max(4,Math.round(w/3.2)), alpha=o.alpha??.9, dry=o.dry??.3, load=o.load??1, jt=o.jit??22;
    const N=pts.length;
    if(o.body!==false){const bl=Math.floor(N*(.8+r()*.2));x.strokeStyle=jit(col,jt*.4);x.globalAlpha=alpha*.85;x.lineWidth=w*.78;x.lineCap='butt';x.lineJoin='round';x.beginPath();for(let i=0;i<bl;i++){const p=pts[i];i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]);}x.stroke();
      hx.strokeStyle=`rgba(255,255,255,${.06*load})`;hx.lineWidth=w*.7;hx.lineCap='round';hx.globalCompositeOperation='lighter';hx.beginPath();for(let i=0;i<bl;i++){const p=pts[i];i?hx.lineTo(p[0],p[1]):hx.moveTo(p[0],p[1]);}hx.stroke();hx.globalCompositeOperation='source-over';}
    for(let b=0;b<n;b++){
      const off=(b/(n-1)-.5)*w, end=Math.floor(N*(r()<dry?(.35+r()*.55):(.88+r()*.12))), st=Math.floor(N*(r()*.06));
      const lw=Math.max(1.2,w/n*(.9+r()*.9)), cl=jit(col,jt), a=alpha*(.55+r()*.45), wob=r()*1000;
      x.strokeStyle=cl;x.globalAlpha=a;x.lineWidth=lw;x.lineCap='round';x.beginPath();
      hx.strokeStyle=`rgba(255,255,255,${.05*load})`;hx.lineWidth=lw;hx.lineCap='round';hx.beginPath();
      for(let i=st;i<end;i++){const p=pts[i],q=pts[Math.min(N-1,i+1)],pp=pts[Math.max(0,i-1)];let dx=q[0]-pp[0],dy=q[1]-pp[1];const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;
        const taper=Math.sin(Math.PI*Math.min(1,(i+1)/N*1.15))**.35, ww=off*(.75+.25*taper)+Math.sin(i*.3+wob)*w*.015;
        const X=p[0]-dy*ww,Y=p[1]+dx*ww; if(i===st){x.moveTo(X,Y);hx.moveTo(X,Y);}else{x.lineTo(X,Y);hx.lineTo(X,Y);}}
      x.stroke();hx.globalCompositeOperation='lighter';hx.stroke();hx.globalCompositeOperation='source-over';
    }
    x.globalAlpha=1;
  }
  function stroke(x0,y0,x1,y1,w,col,o={}){const bend=o.bend??.15;const mx=(x0+x1)/2+(r()-.5)*Math.hypot(x1-x0,y1-y0)*bend,my=(y0+y1)/2+(r()-.5)*Math.hypot(x1-x0,y1-y0)*bend;const n=Math.max(12,Math.round(Math.hypot(x1-x0,y1-y0)/4));path(bez([x0,y0],[mx,my],[x1,y1],n),w,col,o);}
  function dab(cx,cy,R,col,o={}){const n=o.n??Math.round(3+R/10);for(let i=0;i<n;i++){const a=(o.angle??r()*Math.PI)+(r()-.5)*.6,l=R*(.8+r()*.8);const sx=cx+(r()-.5)*R*.8,sy=cy+(r()-.5)*R*.8;stroke(sx-Math.cos(a)*l/2,sy-Math.sin(a)*l/2,sx+Math.cos(a)*l/2,sy+Math.sin(a)*l/2,R*(.5+r()*.5),col,{dry:o.dry??.6,alpha:o.alpha??.92,load:o.load??1.2,bend:.1,jit:o.jit});}}
  function knife(cx,cy,w,h,ang,col,o={}){x.save();x.translate(cx,cy);x.rotate(ang);hx.save();hx.translate(cx,cy);hx.rotate(ang);
    const lines=Math.round(w/1.2);for(let i=0;i<lines;i++){const px=-w/2+i*(w/lines);const l=h*(.7+r()*.3),y0=-h/2+r()*h*.15;x.strokeStyle=jit(col,o.jit??26);x.globalAlpha=(o.alpha??.95)*(.6+r()*.4);x.lineWidth=1.6+r()*1.4;x.beginPath();x.moveTo(px,y0);x.lineTo(px+(r()-.5)*3,y0+l);x.stroke();
      hx.strokeStyle=`rgba(255,255,255,${.12*(o.load??1)})`;hx.lineWidth=2;hx.globalCompositeOperation='lighter';hx.beginPath();hx.moveTo(px,y0);hx.lineTo(px,y0+l);hx.stroke();hx.globalCompositeOperation='source-over';}
    // ridge at end
    hx.fillStyle=`rgba(255,255,255,${.25*(o.load??1)})`;hx.globalCompositeOperation='lighter';hx.fillRect(-w/2,h/2-4,w,5);hx.globalCompositeOperation='source-over';
    x.restore();hx.restore();x.globalAlpha=1;}
  function ground(col,col2){x.fillStyle=col;x.fillRect(0,0,W,H);for(let i=0;i<Math.round(W*H/9000);i++){const px=r()*W,py=r()*H,a=(r()-.5)*.8,l=60+r()*180;stroke(px,py,px+Math.cos(a)*l,py+Math.sin(a)*l,30+r()*50,r()<.5?col:(col2||col),{alpha:.35,dry:.7,load:.4,jit:14});}}
  function finish(o={}){
    const img=x.getImageData(0,0,W,H),d=img.data,hd=hx.getImageData(0,0,W,H).data;const k=o.relief??2.2;
    const hgt=new Float32Array(W*H);for(let i=0;i<W*H;i++)hgt[i]=hd[i*4];
    // light blur on height
    const hb=new Float32Array(W*H);for(let yy=1;yy<H-1;yy++)for(let xx=1;xx<W-1;xx++){const i=yy*W+xx;hb[i]=(hgt[i]*4+hgt[i-1]+hgt[i+1]+hgt[i-W]+hgt[i+W])/8;}
    for(let yy=1;yy<H-1;yy++)for(let xx=1;xx<W-1;xx++){const i=yy*W+xx;const gx=hb[i+1]-hb[i-1],gy=hb[i+W]-hb[i-W];let sh=1+(-gx-gy)*k/255;const spec=Math.max(0,(-gx-gy)/255*k-.25)*60;
      const weave=(Math.sin(xx*1.9)*Math.sin(yy*1.9))*3;
      for(let ch=0;ch<3;ch++){d[i*4+ch]=Math.max(0,Math.min(255,d[i*4+ch]*sh+spec+weave));}}
    x.putImageData(img,0,0);return c;}
  return {W,H,r,x,stroke,path,dab,knife,ground,finish,bez};
}
