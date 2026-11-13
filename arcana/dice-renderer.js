/* Fantasy Dice Animation — deterministic software 3D renderer. MIT License. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FantasyDiceRenderer = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SUPPORTED = [4, 6, 8, 10, 12, 20];
  var CACHE = Object.create(null);
  var PI = Math.PI;
  var CAMERA = 6;
  var LIGHT = unit([-0.55, 0.75, 1.5]);
  var TARGET_NORMAL = unit([-0.32, 0.27, 0.91]);
  var TARGET_UP = unit([0, 1, -TARGET_NORMAL[1] / TARGET_NORMAL[2]]);
  var TARGET_RIGHT = unit(cross(TARGET_UP, TARGET_NORMAL));

  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function length(a) { return Math.sqrt(dot(a, a)); }
  function unit(a) { var l = length(a); return l ? mul(a, 1 / l) : [0, 0, 0]; }
  function mean(points) { return mul(points.reduce(add, [0, 0, 0]), 1 / points.length); }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function rgb(r, g, b) { return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')'; }
  function fract(x) { return x - Math.floor(x); }
  function pattern(index) { return fract(Math.sin(index * 127.1 + 311.7) * 43758.5453123); }

  // Find supporting planes and merge every coplanar triangle into one polygon.
  // In particular, D10 is the polar dual of a pentagonal antiprism: ten kites.
  function hull(vertices) {
    var planes = Object.create(null);
    for (var a = 0; a < vertices.length - 2; a++) {
      for (var b = a + 1; b < vertices.length - 1; b++) {
        for (var c = b + 1; c < vertices.length; c++) {
          var normal = cross(sub(vertices[b], vertices[a]), sub(vertices[c], vertices[a]));
          if (length(normal) < 1e-7) continue;
          normal = unit(normal);
          var d = dot(normal, vertices[a]);
          var pos = false, neg = false;
          vertices.forEach(function (v) {
            var side = dot(normal, v) - d;
            if (side > 1e-6) pos = true;
            if (side < -1e-6) neg = true;
          });
          if (pos && neg) continue;
          if (d < 0) { normal = mul(normal, -1); d = -d; }
          var indices = [];
          vertices.forEach(function (v, i) {
            if (Math.abs(dot(normal, v) - d) < 1e-6) indices.push(i);
          });
          planes[indices.join(',')] = { indices: indices, normal: normal, distance: d };
        }
      }
    }
    return Object.keys(planes).map(function (key) {
      var plane = planes[key];
      var center = mean(plane.indices.map(function (i) { return vertices[i]; }));
      var axis = unit(sub(vertices[plane.indices[0]], center));
      var up = cross(plane.normal, axis);
      plane.indices.sort(function (a, b) {
        var pa = sub(vertices[a], center), pb = sub(vertices[b], center);
        return Math.atan2(dot(pa, up), dot(pa, axis)) - Math.atan2(dot(pb, up), dot(pb, axis));
      });
      return plane;
    });
  }

  function rawVertices(sides) {
    var p = (1 + Math.sqrt(5)) / 2;
    var vertices = [], i, j, k;
    if (sides === 4) return [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
    if (sides === 6) {
      for (i = -1; i <= 1; i += 2) for (j = -1; j <= 1; j += 2) for (k = -1; k <= 1; k += 2) vertices.push([i, j, k]);
      return vertices;
    }
    if (sides === 8) return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    if (sides === 10) {
      var antiprism = [];
      for (i = 0; i < 5; i++) {
        var angle = i * PI * 2 / 5;
        antiprism.push([Math.cos(angle), Math.sin(angle), 0.65]);
        antiprism.push([Math.cos(angle + PI / 5), Math.sin(angle + PI / 5), -0.65]);
      }
      return hull(antiprism).map(function (plane) { return mul(plane.normal, 1 / plane.distance); });
    }
    if (sides === 12) {
      for (i = -1; i <= 1; i += 2) for (j = -1; j <= 1; j += 2) for (k = -1; k <= 1; k += 2) vertices.push([i, j, k]);
      for (i = -1; i <= 1; i += 2) for (j = -1; j <= 1; j += 2) {
        vertices.push([0, i / p, j * p], [i / p, j * p, 0], [i * p, 0, j / p]);
      }
      return vertices;
    }
    for (i = -1; i <= 1; i += 2) for (j = -1; j <= 1; j += 2) {
      vertices.push([0, i, j * p], [i, j * p, 0], [i * p, 0, j]);
    }
    return vertices;
  }

  function getGeometry(sides) {
    if (SUPPORTED.indexOf(sides) < 0) throw new RangeError('Unsupported die: D' + sides);
    if (CACHE[sides]) return CACHE[sides];
    var vertices = rawVertices(sides);
    var radius = Math.max.apply(Math, vertices.map(length));
    vertices = vertices.map(function (v) { return mul(v, 1 / radius); });
    var planes = hull(vertices);
    // Standard opposite-face sums where the solid permits them (D4 excepted).
    if (sides !== 4) {
      var ordered = new Array(sides), available = planes.slice(), next = 0;
      while (available.length) {
        var first = available.shift(), opposite = -1, best = 2;
        available.forEach(function (candidate, index) {
          var score = dot(first.normal, candidate.normal);
          if (score < best) { best = score; opposite = index; }
        });
        ordered[next] = first;
        ordered[sides - next - 1] = available.splice(opposite, 1)[0];
        next++;
      }
      planes = ordered;
    }
    var faces = planes.map(function (plane) { return plane.indices.slice(); });
    var data = faces.map(function (face, index) {
      var points = face.map(function (i) { return vertices[i]; });
      var center = mean(points), normal = planes[index].normal;
      // A point-up triangle, kite and pentagon; a level-edged square.
      var up = unit(sub(points[0], center));
      if (sides === 6) up = unit(sub(mul(add(points[0], points[1]), 0.5), center));
      if (sides === 10) {
        var longest = points[0];
        points.forEach(function (point) { if (length(sub(point, center)) > length(sub(longest, center)) + 1e-5) longest = point; });
        up = unit(sub(longest, center));
      }
      var right = unit(cross(up, normal));
      var inradius = Infinity;
      points.forEach(function (point, i) {
        var edge = sub(points[(i + 1) % points.length], point);
        inradius = Math.min(inradius, length(cross(sub(center, point), edge)) / length(edge));
      });
      return { center: center, normal: normal, up: up, right: right, inradius: inradius };
    });
    var mesh = { sides: sides, vertices: vertices, faces: faces, faceData: data };
    CACHE[sides] = mesh;
    return mesh;
  }

  // Closed bevel topology: inset faces + shared edge quads + sealed vertex caps.
  // The old renderer outlined disconnected face polygons; this mesh has no gaps.
  var BEVEL_CACHE = Object.create(null);
  function getBeveledGeometry(sides) {
    if (BEVEL_CACHE[sides]) return BEVEL_CACHE[sides];
    var core = getGeometry(sides), inset = sides === 20 ? .10 : .075;
    var vertices = [], polygons = [], cornerIds = [], edges = Object.create(null), caps = core.vertices.map(function(){return [];});
    function polygon(ids, kind, value) {
      var center = mean(ids.map(function(i){return vertices[i];}));
      var normal = unit(cross(sub(vertices[ids[1]], vertices[ids[0]]), sub(vertices[ids[2]], vertices[ids[0]])));
      if(dot(normal,center)<0){ids=ids.slice().reverse();normal=mul(normal,-1);}
      polygons.push({indices:ids,kind:kind,value:value||0,center:center,normal:normal});
    }
    core.faces.forEach(function(face,f){
      var fd=core.faceData[f],ids=face.map(function(v){var id=vertices.length;vertices.push(add(mul(core.vertices[v],1-inset),mul(fd.center,inset)));caps[v].push(id);return id;});
      cornerIds[f]=ids;polygon(ids,'face',f+1);
      face.forEach(function(a,i){var b=face[(i+1)%face.length],key=Math.min(a,b)+':'+Math.max(a,b);(edges[key]||(edges[key]=[])).push({a:a,b:b,ia:ids[i],ib:ids[(i+1)%face.length]});});
    });
    Object.keys(edges).forEach(function(key){var pair=edges[key],a=pair[0],b=pair[1];polygon([a.ia,a.ib,b.a===a.b?b.ia:b.ib,b.a===a.a?b.ia:b.ib],'bevel');});
    caps.forEach(function(ids,v){var n=unit(core.vertices[v]),center=mean(ids.map(function(i){return vertices[i];})),right=unit(sub(vertices[ids[0]],center)),up=cross(n,right);
      ids.sort(function(a,b){var aa=sub(vertices[a],center),bb=sub(vertices[b],center);return Math.atan2(dot(aa,up),dot(aa,right))-Math.atan2(dot(bb,up),dot(bb,right));});polygon(ids,'cap');});
    return BEVEL_CACHE[sides]={sides:sides,vertices:vertices,polygons:polygons,inset:inset};
  }
  function projectBeveled(sides,value,rx,ry,rz,rotation) {
    if(!Number.isInteger(value)||value<1||value>sides)throw new RangeError('Invalid D'+sides+' result');
    var core=getGeometry(sides),mesh=getBeveledGeometry(sides),transform=orientation(core.faceData[value-1],rx||0,ry||0,rz||0,sides,rotation),vertices=mesh.vertices.map(transform);
    return {points:vertices.map(perspective),polygons:mesh.polygons.map(function(poly){
      var center=transform(poly.center),normal=transform(poly.normal),fd=poly.value?core.faceData[poly.value-1]:null;
      return {kind:poly.kind,value:poly.value,points:poly.indices.map(function(i){return perspective(vertices[i]);}),center:center,normal:normal,depth:center[2],visible:dot(normal,sub([0,0,CAMERA],center))>1e-8,screenCenter:perspective(center),right:fd?transform(fd.right):null,up:fd?transform(fd.up):null,inradius:fd?fd.inradius*(1-mesh.inset):0};
    })};
  }

  function rotate(v, rx, ry, rz) {
    var cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    var x = v[0], y = v[1] * cx - v[2] * sx, z = v[1] * sx + v[2] * cx;
    var xx = x * cy + z * sy, zz = -x * sy + z * cy;
    return [xx * cz - y * sz, xx * sz + y * cz, zz];
  }

  function orientation(face, rx, ry, rz, sides, rotation) {
    var targetNormal = sides === 4 ? unit([-0.30, 0.54, 0.82]) : TARGET_NORMAL;
    var targetUp = sides === 4 ? unit([0, 1, -targetNormal[1] / targetNormal[2]]) : TARGET_UP;
    var targetRight = sides === 4 ? unit(cross(targetUp, targetNormal)) : TARGET_RIGHT;
    return function (v) {
      var x = dot(v, face.right), y = dot(v, face.up), z = dot(v, face.normal);
      var v=rotate(add(add(mul(targetRight, x), mul(targetUp, y)), mul(targetNormal, z)), rx, ry, rz);
      if(!rotation)return v;
      // Rodrigues rotation keeps one axis throughout travel, without Euler-axis reversals.
      var axis=unit(rotation.axis),c=Math.cos(rotation.angle),s=Math.sin(rotation.angle);
      v=add(add(mul(v,c),mul(cross(axis,v),s)),mul(axis,dot(axis,v)*(1-c)));
      if(rotation.secondaryAxis){axis=unit(rotation.secondaryAxis);c=Math.cos(rotation.secondaryAngle||0);s=Math.sin(rotation.secondaryAngle||0);v=add(add(mul(v,c),mul(cross(axis,v),s)),mul(axis,dot(axis,v)*(1-c)));}
      return v;
    };
  }

  function perspective(point) {
    var scale = CAMERA / (CAMERA - point[2]);
    return [point[0] * scale, -point[1] * scale];
  }

  function project(sides, value, rx, ry, rz, rotation) {
    var mesh = getGeometry(sides);
    if (!Number.isInteger(value) || value < 1 || value > sides) throw new RangeError('D' + sides + ' result must be an integer from 1 to ' + sides);
    var transform = orientation(mesh.faceData[value - 1], rx || 0, ry || 0, rz || 0, sides, rotation);
    var vertices = mesh.vertices.map(transform);
    var projected = vertices.map(perspective);
    var faces = mesh.faces.map(function (indices, index) {
      var fd = mesh.faceData[index];
      var center = transform(fd.center), normal = transform(fd.normal);
      return {
        value: index + 1, indices: indices, points: indices.map(function (i) { return projected[i]; }),
        center: center, screenCenter: perspective(center), normal: normal,
        right: transform(fd.right), up: transform(fd.up), inradius: fd.inradius,
        visible: dot(normal, sub([0, 0, CAMERA], center)) > 1e-8,
        depth: center[2]
      };
    });
    return { vertices: vertices, points: projected, faces: faces };
  }

  function inspect(sides, value) {
    var mesh = getGeometry(sides), projected = project(sides, value), edges = Object.create(null);
    mesh.faces.forEach(function (face) {
      face.forEach(function (a, i) {
        var b = face[(i + 1) % face.length], key = Math.min(a, b) + ':' + Math.max(a, b);
        edges[key] = (edges[key] || 0) + 1;
      });
    });
    var mostFront = projected.faces.slice().sort(function (a, b) { return b.normal[2] - a.normal[2]; })[0];
    return {
      sides: sides, value: value, frontFace: mostFront.value,
      visibleFaces: projected.faces.filter(function (face) { return face.visible; }).map(function (face) { return face.value; }),
      targetNormal: projected.faces[value - 1].normal.slice(),
      vertexCount: mesh.vertices.length, edgeCount: Object.keys(edges).length, faceCount: mesh.faces.length,
      faceSizes: mesh.faces.map(function (face) { return face.length; }),
      manifold: Object.keys(edges).every(function (key) { return edges[key] === 2; }),
      outwardNormals: mesh.faceData.every(function (face) { return dot(face.normal, face.center) > 0; })
    };
  }

  function path(ctx, points, inset) {
    var center = points.reduce(function (sum, point) { return [sum[0] + point[0] / points.length, sum[1] + point[1] / points.length]; }, [0, 0]);
    ctx.beginPath();
    points.forEach(function (point, index) {
      var x = center[0] + (point[0] - center[0]) * inset;
      var y = center[1] + (point[1] - center[1]) * inset;
      if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.closePath();
  }

  function facePoint(face, x, y) {
    return perspective(add(face.center, add(mul(face.right, x), mul(face.up, y))));
  }

  function drawNumber(ctx, face, size, selected, skin) {
    var center = face.screenCenter;
    var right = facePoint(face, 0.1, 0), up = facePoint(face, 0, 0.1);
    var ux = (right[0] - center[0]) * 10, uy = (right[1] - center[1]) * 10;
    var vx = (up[0] - center[0]) * -10, vy = (up[1] - center[1]) * -10;
    var f = face.inradius * 1.20;
    if (face.value > 9) f *= 0.80;
    ctx.save();
    path(ctx, face.points, 0.85); ctx.clip();
    // Use a large font in local space: subpixel font sizes have inconsistent
    // metrics between browser engines when scaled up by the canvas transform.
    var fontScale = f / 100;
    ctx.transform(ux * fontScale, uy * fontScale, vx * fontScale, vy * fontScale, center[0], center[1]);
    ctx.font = 'bold 100px '+skin.font;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    var metrics = ctx.measureText(String(face.value));
    var baseline = typeof metrics.actualBoundingBoxAscent === 'number'
      ? (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2 : 35;
    ctx.lineJoin = 'round'; ctx.lineWidth = 1.8;
    ctx.strokeStyle = skin.numberOutline;
    ctx.strokeText(String(face.value), 0, baseline);
    ctx.fillStyle = selected ? skin.numberSelected : skin.number;
    ctx.shadowColor = 'rgba(255,223,160,0.24)'; ctx.shadowBlur = selected ? 4 / size : 0;
    ctx.fillText(String(face.value), 0, baseline);
    ctx.shadowBlur = 0;
    if (face.value === 6 || face.value === 9) {
      ctx.beginPath(); ctx.arc(0, 51, 3.5, 0, PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Surface artwork uses the same flat, padded UV layout as the supplied templates.
  // This code changes only paint; projection, mesh and motion are untouched.
  var surfaceTintCache=new WeakMap();
  function tintedSurface(image,color){
    var variants=surfaceTintCache.get(image);if(!variants){variants=new Map();surfaceTintCache.set(image,variants);}
    if(variants.has(color))return variants.get(color);
    var canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;var c=canvas.getContext('2d');
    c.drawImage(image,0,0,512,512);c.globalCompositeOperation='multiply';c.fillStyle=color;c.fillRect(0,0,512,512);
    c.globalCompositeOperation='destination-in';c.drawImage(image,0,0,512,512);c.globalCompositeOperation='source-over';
    // Bound cache growth when many colors are tried in one session.
    if(variants.size>=4)variants.delete(variants.keys().next().value);variants.set(color,canvas);return canvas;
  }
  function drawSurface(ctx,face,sides,image,color){
    var mesh=getGeometry(sides),fd=mesh.faceData[face.value-1];
    var uv=mesh.faces[face.value-1].map(function(i){var p=sub(mesh.vertices[i],fd.center);return [dot(p,fd.right),dot(p,fd.up)];});
    var us=uv.map(function(p){return p[0];}),vs=uv.map(function(p){return p[1];});
    var loU=Math.min.apply(Math,us),hiU=Math.max.apply(Math,us),loV=Math.min.apply(Math,vs),hiV=Math.max.apply(Math,vs);
    var span=Math.max(hiU-loU,hiV-loV)/.875,left=(loU+hiU-span)/2,top=-(loV+hiV+span)/2;
    var center=face.screenCenter,right=facePoint(face,.1,0),up=facePoint(face,0,.1);
    ctx.save();ctx.transform((right[0]-center[0])*10,(right[1]-center[1])*10,-(up[0]-center[0])*10,-(up[1]-center[1])*10,center[0],center[1]);
    ctx.drawImage(tintedSurface(image,color),left,top,span,span);ctx.restore();
  }

  var COLOR_CACHE=Object.create(null);
  function parseColor(value,ctx) {
    if(COLOR_CACHE[value])return COLOR_CACHE[value];
    var key=value;ctx.save();ctx.fillStyle='#aab3b4';ctx.fillStyle=value;value=ctx.fillStyle;ctx.restore();
    if(/^#[0-9a-f]{6}$/i.test(value))return COLOR_CACHE[key]=[1,3,5].map(function(i){return parseInt(value.slice(i,i+2),16);});
    var match=String(value).match(/[\d.]+/g);return COLOR_CACHE[key]=match&&match.length>=3?match.slice(0,3).map(Number):[170,175,180];
  }
  function drawFace(ctx,face,sides,selected,size,detail,skin) {
    var metal=face.kind!=='face',base=metal?parseColor(skin.rim[2],ctx):skin.face;
    var diffuse=Math.max(0,dot(face.normal,LIGHT)),spec=Math.pow(Math.max(0,dot(face.normal,unit(add(LIGHT,[0,0,1])))),metal?28:38);
    // A warm ambient floor avoids hard black seams even on the unlit bevels.
    var exposure=metal?.62+diffuse*.55:.63+diffuse*.64;
    var color=base.map(function(c){return clamp(c*exposure+spec*(metal?80:36),0,255);});
    var gradient=ctx.createLinearGradient(-.65,-.9,.8,1);
    gradient.addColorStop(0,rgb(color[0]+(metal?24:10),color[1]+(metal?24:10),color[2]+(metal?24:10)));
    gradient.addColorStop(.55,rgb(color[0],color[1],color[2]));
    gradient.addColorStop(1,rgb(color[0]*.88,color[1]*.88,color[2]*.88));
    path(ctx,face.points,1);ctx.fillStyle=gradient;ctx.fill();
    if(metal)return;
    var surface=skin.surfacePack?.faces?.[String(sides)];
    ctx.save();path(ctx,face.points,.997);ctx.clip();
    if(skin.texture&&!surface?.face){var center=face.screenCenter,right=facePoint(face,.1,0),up=facePoint(face,0,.1);ctx.save();ctx.transform((right[0]-center[0])*10,(right[1]-center[1])*10,-(up[0]-center[0])*10,-(up[1]-center[1])*10,center[0],center[1]);ctx.globalAlpha=skin.textureOpacity*.55;ctx.drawImage(skin.texture,-1,-1,2,2);ctx.restore();}
    if(surface?.face){ctx.save();ctx.globalAlpha=.88;drawSurface(ctx,face,sides,surface.face,rgb(skin.face[0],skin.face[1],skin.face[2]));ctx.restore();}
    if(surface?.rim)drawSurface(ctx,face,sides,surface.rim,skin.rim[2]);
    var sheen=ctx.createRadialGradient(face.screenCenter[0]-.12,face.screenCenter[1]-.18,.02,face.screenCenter[0],face.screenCenter[1],.9);
    sheen.addColorStop(0,'rgba(255,241,211,'+(.035+spec*.18)+')');sheen.addColorStop(1,'rgba(255,241,211,0)');ctx.fillStyle=sheen;ctx.fillRect(-2,-2,4,4);
    ctx.restore();drawNumber(ctx,face,size,selected,skin);
  }
  function silhouette(points) {
    var sorted=points.slice().sort(function(a,b){return a[0]-b[0]||a[1]-b[1];});
    function turn(o,a,b){return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);}
    var lower=[],upper=[];sorted.forEach(function(p){while(lower.length>1&&turn(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop();lower.push(p);});sorted.reverse().forEach(function(p){while(upper.length>1&&turn(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop();upper.push(p);});lower.pop();upper.pop();return lower.concat(upper);
  }

  function render(ctx, width, height, items, options) {
    options = options || {};
    if (!ctx || !Array.isArray(items)) throw new TypeError('A Canvas 2D context and an array of dice are required');
    var skin=options.skin||{face:[35,43,49],rim:['#ddc49a','#897451','#b69a6d','#3b342c'],number:'#e5dfd0',numberSelected:'#fff2c9',numberOutline:'#04070a',font:'Georgia, serif',inset:.86,grain:.055,wear:0};
    var results = [];
    // Preserve caller-owned transforms, styles, clipping and stage background.
    ctx.save();
    try {
      items.forEach(function (item) {
        var size = typeof item.size === 'number' ? item.size : 70;
        if (!(size > 0)) return;
        var x = typeof item.x === 'number' ? item.x : width / 2;
        var y = typeof item.y === 'number' ? item.y : height / 2;
        var lift = typeof item.lift === 'number' ? item.lift : 0;
        var glow = clamp(typeof item.glow === 'number' ? item.glow : 0, 0, 1);
        var projection = projectBeveled(item.sides, item.value, item.rx, item.ry, item.rz, item.rotation);
        ctx.save();
        var bottom=Math.max.apply(Math,projection.points.map(function(p){return p[1];}));
        var groundY=y+size*.9;
        var centerY=item.grounded?groundY-bottom*size:y;
        ctx.translate(x, groundY);
        ctx.save(); ctx.scale(1, 0.24);
        var spread = size * (0.9 + Math.max(0, lift) / (size * 3));
        var shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, spread);
        shadow.addColorStop(0, 'rgba(0,0,0,' + (0.50 / (1 + Math.max(0, lift) / size)) + ')');
        shadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadow; ctx.fillRect(-spread, -spread, spread * 2, spread * 2); ctx.restore();
        ctx.translate(0,centerY-groundY-lift); ctx.scale(size, size);
        if (glow > 0) {
          var halo = ctx.createRadialGradient(0, 0, 0.4, 0, 0, 1.5);
          halo.addColorStop(0, 'rgba(208,160,71,' + glow * 0.12 + ')');
          halo.addColorStop(1, 'rgba(208,160,71,0)');
          ctx.fillStyle = halo; ctx.fillRect(-1.5, -1.5, 3, 3);
        }
        // One undercoat behind the complete closed solid prevents AA pinholes.
        path(ctx,silhouette(projection.points),1);ctx.fillStyle=skin.rim[2];ctx.fill();
        projection.polygons.filter(function(face){return face.visible;}).sort(function(a,b){return a.depth-b.depth;}).forEach(function(face){drawFace(ctx,face,item.sides,face.value===item.value,size,options.detail,skin);});
        ctx.restore();
        results.push({ value: item.value, sides: item.sides, faces: project(item.sides,item.value,item.rx,item.ry,item.rz,item.rotation).faces, x: x, y: centerY - lift, size: size });
      });
    } finally { ctx.restore(); }
    return results;
  }

  return { render: render, getGeometry: getGeometry, getBeveledGeometry:getBeveledGeometry, projectBeveled:projectBeveled, inspect: inspect, project: project, supportedDice: SUPPORTED.slice() };
}));
