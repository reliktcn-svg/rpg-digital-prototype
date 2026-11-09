const assert=require('node:assert/strict');
const Motion=require('../arcana/dice-motion.js'),Renderer=require('../arcana/dice-renderer.js');
let trajectories=0,results=0;
for(const width of [140,175,320,390,600,1080])for(const sides of Renderer.supportedDice){
 const size=Math.max(20,Math.min(width<460?64:78,(width-20)*.23)),layout={x:width/2,y:size+28,size,cellW:width};
 assert(Math.abs(Motion.sample(0,layout).rotation.angle)>=Math.PI*6,'At least three full rotations');
 assert.deepEqual(Motion.sample(0,layout).rotation.axis,[1,0,0]);
 assert.deepEqual(Motion.sample(0,layout).rotation.secondaryAxis,[0,1,0]);
 assert(Math.abs(Motion.sample(0,layout).rotation.secondaryAngle/(Math.PI*2)+1.75)<1e-8);
 let lastX=-Infinity,lastAngle=Infinity,lastSecondary=-Infinity,lastVelocity=Infinity;
 for(let i=0;i<=180;i++){
  const pose=Motion.sample(i/180,layout);assert(pose.x>=lastX-1e-8,'No reverse travel');assert(pose.rotation.angle<=lastAngle+1e-8,'X spins clockwise without reversing');
  if(i){const velocity=pose.x-lastX;assert(velocity<=lastVelocity+1e-8,'Roll slows monotonically');lastVelocity=velocity;}
  const projection=Renderer.project(sides,sides,0,0,0,pose.rotation);
  for(const point of projection.points)assert(Number.isFinite(point[0])&&Number.isFinite(point[1]));
  assert(Math.min(...projection.points.map(p=>pose.x+p[0]*size))>=-1,'No clipping at lane entry');
  assert(Math.max(...projection.points.map(p=>pose.x+p[0]*size))<=width+1,'No clipping at lane exit');
  assert(pose.rotation.secondaryAngle>=lastSecondary-1e-8,'No reverse Y spin');lastSecondary=pose.rotation.secondaryAngle;assert(pose.lift>=0);assert(Math.abs(pose.rotation.secondaryAngle)<=1.75*Math.PI*2+1e-8);assert.equal(Motion.sample(i/180,layout,0,'roll').lift,0);assert(Math.abs((Motion.sample(0,layout).rotation.angle-pose.rotation.angle)-pose.worldTravel/(size*.83))<1e-8);lastX=pose.x;lastAngle=pose.rotation.angle;
 }
 const end=Motion.sample(1,layout);assert.equal(end.x,layout.x);assert.equal(end.lift,0);assert.equal(end.rotation.angle,0);assert.equal(end.rotation.secondaryAngle,0);trajectories++;
}
for(const sides of Renderer.supportedDice)for(let value=1;value<=sides;value++){
 const info=Renderer.inspect(sides,value);assert.equal(info.frontFace,value);assert(info.manifold);assert.equal(info.faceCount,sides);results++;
}
// Check rendered vertices, not only angle signs. Looking toward the origin
// from +X, use (Y,Z); from +Y, use (Z,X). Signed area measures direction.
for(const [axis,components,sign] of [[[1,0,0],[1,2],-1],[[0,1,0],[2,0],1]]){
 const a=Motion.sample(.3,{x:200,y:100,size:64,cellW:400});
 const b=Motion.sample(.30001,{x:200,y:100,size:64,cellW:400});
 const angle=p=>axis[0]?p.rotation.angle:p.rotation.secondaryAngle;
 const before=Renderer.project(20,20,0,0,0,{axis,angle:angle(a)}).vertices;
 const after=Renderer.project(20,20,0,0,0,{axis,angle:angle(b)}).vertices;
 const [u,v]=components;
 const area=before.reduce((sum,p,i)=>sum+p[u]*after[i][v]-p[v]*after[i][u],0);
 assert(area*sign>0,'Rendered rotation must match the requested axis direction');
}
console.log(JSON.stringify({pass:true,trajectories,frames:trajectories*181,finalResults:results}));
