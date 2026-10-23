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
    ctx.lineJoin = 'round'; ctx.lineWidth = 5;
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

  function drawFace(ctx, face, sides, selected, size, detail, skin) {
    var diffuse = Math.max(0, dot(face.normal, LIGHT));
    var specular = Math.pow(Math.max(0, dot(face.normal, unit(add(LIGHT, [0, 0, 1])))), 18);
    var light=.5+diffuse*.85;
    var color=skin.face.map(function(c){return clamp(c*light+specular*24,0,255);});
    var points = face.points, center = face.screenCenter;
    var gradient = ctx.createLinearGradient(-0.9, -1.2, 0.9, 1.3);
    gradient.addColorStop(0, rgb(color[0]+12,color[1]+12,color[2]+12));
    gradient.addColorStop(0.5, rgb(color[0],color[1],color[2]));
    gradient.addColorStop(1, rgb(color[0]*.65,color[1]*.65,color[2]*.65));
    path(ctx, points, 1); ctx.fillStyle = gradient; ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineWidth = 0.024;
    ctx.strokeStyle = '#090e13'; ctx.stroke();

    // A raised metallic rim follows the actual projected polygon edges.
    var rim = ctx.createLinearGradient(-0.7, -0.8, 0.8, 1);
    rim.addColorStop(0, skin.rim[0]); rim.addColorStop(0.3, skin.rim[1]);
    rim.addColorStop(0.52, skin.rim[2]); rim.addColorStop(1, skin.rim[3]);
    path(ctx, points, .94); ctx.lineWidth = .035; ctx.strokeStyle = rim; ctx.stroke();
    // Texture coordinates follow the face basis, so the material rotates with the die.
    ctx.save(); path(ctx,points,skin.inset);ctx.clip();
    var right=facePoint(face,.1,0),up=facePoint(face,0,.1),cx=center[0],cy=center[1];
    ctx.save();ctx.transform((right[0]-cx)*10,(right[1]-cy)*10,(up[0]-cx)*10,(up[1]-cy)*10,cx,cy);
    if(skin.texture){ctx.globalAlpha=skin.textureOpacity;ctx.drawImage(skin.texture,-1,-1,2,2);ctx.globalAlpha=1;}
    if(detail!=='low')for(var i=0;i<32;i++){
      var seed=sides*109+face.value*71+i*3,x=pattern(seed)*2-1,y=pattern(seed+1)*2-1;
      ctx.fillStyle='rgba(230,233,235,'+skin.grain+')';ctx.fillRect(x,y,.012,.012);
      if(skin.wear>0){ctx.strokeStyle='rgba(215,210,194,'+skin.wear+')';ctx.lineWidth=.004;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+.04,y+.012);ctx.stroke();}
    }
    ctx.restore();
    var shine = ctx.createRadialGradient(center[0] - 0.3, center[1] - 0.4, 0, center[0], center[1], 0.85);
    shine.addColorStop(0, 'rgba(189,222,235,' + (0.10 + specular * 0.12) + ')');
    shine.addColorStop(1, 'rgba(17,27,37,0)'); ctx.fillStyle = shine;
    ctx.fillRect(-2, -2, 4, 4); ctx.restore();

    drawNumber(ctx, face, size, selected,skin);
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
        var projection = project(item.sides, item.value, item.rx, item.ry, item.rz, item.rotation);
        // A scrolling contact patch represents a longer tabletop: the camera follows
        // the die while preserving distance/radius rotation, even on a narrow phone.
        if(item.grounded){
          ctx.save();
          var lane=item.cellW||width,patch=size*1.4,offset=item.cameraX||0;
          ctx.beginPath();ctx.rect(Math.max(0,x-lane*.5),y+size*.45,lane,size*.8);ctx.clip();
          for(var j=-18;j<=18;j++){
            var px=(item.groundOrigin||x)+j*14-(offset%14),alpha=Math.max(0,1-Math.abs(px-x)/patch)*.16;
            ctx.strokeStyle='rgba(168,179,164,'+alpha+')';ctx.lineWidth=.6;
            for(var row=0;row<3;row++){
              var py=y+size*(.7+row*.12),len=3+pattern(j+Math.floor(offset/14)+row*77)*5;
              ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+len,py);ctx.stroke();
            }
          }
          ctx.restore();
        }
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
        projection.faces.filter(function (face) { return face.visible; }).sort(function (a, b) { return a.depth - b.depth; }).forEach(function (face) {
          drawFace(ctx, face, item.sides, face.value === item.value, size, options.detail, skin);
        });
        // A tiny fixed glint on the uppermost vertex adds a metal highlight.
        var top = projection.points.reduce(function (best, p) { return p[1] < best[1] ? p : best; }, projection.points[0]);
        ctx.globalAlpha = 0.45 + glow * 0.35; ctx.strokeStyle = skin.rim[0]; ctx.lineWidth = 0.008;
        ctx.beginPath(); ctx.moveTo(top[0] - 0.045, top[1]); ctx.lineTo(top[0] + 0.045, top[1]);
        ctx.moveTo(top[0], top[1] - 0.045); ctx.lineTo(top[0], top[1] + 0.045); ctx.stroke();
        ctx.restore();
        results.push({ value: item.value, sides: item.sides, faces: projection.faces, x: x, y: centerY - lift, size: size });
      });
    } finally { ctx.restore(); }
    return results;
  }

  return { render: render, getGeometry: getGeometry, inspect: inspect, project: project, supportedDice: SUPPORTED.slice() };
}));
