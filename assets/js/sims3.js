/* РОЙ · симуляции, часть третья
   ------------------------------------------------------------------
   Решение стаи, соты, трещины, крона дерева и разряд молнии.
*/
(function (window) {
  'use strict';

  var ROY = window.ROY;

  var PAPER = '#FBFAF6';
  var PAPER_RGB = [251, 250, 246];
  var INK_RGB = [28, 31, 34];

  function clearPaper(ctx, W, H) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
  }

  function inkAt(buf, i, v) {
    if (v < 0) v = 0; else if (v > 0.92) v = 0.92;
    var j = i << 2;
    buf[j]     = PAPER_RGB[0] + (INK_RGB[0] - PAPER_RGB[0]) * v;
    buf[j + 1] = PAPER_RGB[1] + (INK_RGB[1] - PAPER_RGB[1]) * v;
    buf[j + 2] = PAPER_RGB[2] + (INK_RGB[2] - PAPER_RGB[2]) * v;
    buf[j + 3] = 255;
  }

  /* ==================================================== РЕШЕНИЕ СТАИ */

  /* Рыбы выбирают между двумя кормушками. У каждой есть слабое личное
     предпочтение, но она смотрит и на соседей. Стая приходит к общему решению
     без голосования и без вожака — и почти всегда выбирает одно место
     целиком, а не делится пополам. */
  ROY.registerSim('fish', {
    title: 'Решение без голосования',
    lead: 'Двести рыб выбирают одну кормушку из двух. Никто не считает голоса.',
    params: [
      { key: 'count',   label: 'сколько рыб',       hint: 'размер стаи', min: 40, max: 320, step: 10, value: 170 },
      { key: 'social',  label: 'влияние соседей',   hint: 'насколько рыба прислушивается к тем, кто рядом', min: 0, max: 0.09, step: 0.001, value: 0.055, decimals: 3 },
      { key: 'private', label: 'своё мнение',       hint: 'насколько рыба держится собственного предпочтения', min: 0, max: 0.05, step: 0.001, value: 0.008, decimals: 3 },
      { key: 'spread',  label: 'расстояние до кормушек', hint: 'как далеко разнесены цели', min: 60, max: 340, step: 5, value: 190 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var fish = [];
      var A = { x: 0, y: 0 }, B = { x: 0, y: 0 };

      function places() {
        A.x = scene.W * 0.5 - scene.p.spread * 0.5; A.y = scene.H * 0.42;
        B.x = scene.W * 0.5 + scene.p.spread * 0.5; B.y = scene.H * 0.42;
      }

      function build() {
        fish.length = 0;
        var n = ROY.count(scene.p.count);
        for (var i = 0; i < n; i++) {
          var a = Math.random() * Math.PI * 2;
          fish.push({
            x: scene.W * 0.5 + (Math.random() - 0.5) * 90,
            y: scene.H * 0.78 + (Math.random() - 0.5) * 70,
            vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 1.4,
            /* Личное предпочтение слабое и у всех разное — именно поэтому
               интересно, что стая всё равно сходится на одном решении. */
            bias: (Math.random() - 0.5) * 2,
            lean: (Math.random() - 0.5) * 0.2
          });
        }
      }

      return {
        reset: function () { places(); build(); },
        resize: function () { places(); build(); },
        onQuality: function () { build(); },
        onParam: function (key) {
          if (key === 'count') build();
          if (key === 'spread') places();
        },

        step: function () {
          var n = fish.length, i, j;
          if (!n) return;
          var social = scene.p.social, priv = scene.p.private;

          for (i = 0; i < n; i++) {
            var f = fish[i];
            var sumLean = 0, cnt = 0, sx = 0, sy = 0, ax = 0, ay = 0;

            for (j = 0; j < n; j++) {
              if (j === i) continue;
              var o = fish[j];
              var dx = o.x - f.x, dy = o.y - f.y;
              var d2 = dx * dx + dy * dy;
              if (d2 > 15000) continue;   /* видеть надо далеко, иначе разошедшиеся группы теряют связь */
              sumLean += o.lean; cnt++;
              ax += o.vx; ay += o.vy;
              if (d2 < 260 && d2 > 0.01) {
                var d = Math.sqrt(d2);
                sx -= dx / d; sy -= dy / d;
              }
            }

            /* Мнение подтягивается к среднему по соседям плюс собственный уклон. */
            if (cnt) f.lean += social * (sumLean / cnt - f.lean);
            f.lean += priv * f.bias * 0.5;
            if (f.lean > 1) f.lean = 1; else if (f.lean < -1) f.lean = -1;

            var target = f.lean < 0 ? A : B;
            var tx = target.x - f.x, ty = target.y - f.y;
            var td = Math.sqrt(tx * tx + ty * ty) || 1;
            var pull = 0.03 + Math.abs(f.lean) * 0.09;

            /* Доплыв до кормушки, рыба не втыкается в неё, а выходит на орбиту:
               иначе стая слипается в точку и упирается в край экрана.
               Радиус орбиты считаем от размера сцены, а вектор всегда
               нормируем — иначе вблизи цели скорость улетает вверх. */
            var R = Math.min(72, Math.min(scene.W, scene.H) * 0.17);
            var ux, uy;
            if (td > R) {
              ux = tx / td; uy = ty / td;
            } else {
              var radial = (td - R * 0.62) / R;
              ux = -ty / td + (tx / td) * radial;
              uy =  tx / td + (ty / td) * radial;
              var m = Math.sqrt(ux * ux + uy * uy) || 1;
              ux /= m; uy /= m;
            }

            f.vx += ux * pull + sx * 0.06 + (cnt ? ax / cnt * 0.02 : 0) + (Math.random() - 0.5) * 0.10;
            f.vy += uy * pull + sy * 0.06 + (cnt ? ay / cnt * 0.02 : 0) + (Math.random() - 0.5) * 0.10;

            var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
            var max = 2.1;
            if (sp > max) { f.vx = f.vx / sp * max; f.vy = f.vy / sp * max; }

            /* Мягкие стены: жёсткий отскок сбивает рыб в полосу вдоль края. */
            var m2 = 26;
            if (f.x < m2) f.vx += (m2 - f.x) * 0.010;
            else if (f.x > scene.W - m2) f.vx -= (f.x - (scene.W - m2)) * 0.010;
            if (f.y < m2) f.vy += (m2 - f.y) * 0.010;
            else if (f.y > scene.H - m2) f.vy -= (f.y - (scene.H - m2)) * 0.010;

            f.x += f.vx; f.y += f.vy;
            if (f.x < 2) f.x = 2; else if (f.x > scene.W - 2) f.x = scene.W - 2;
            if (f.y < 2) f.y = 2; else if (f.y > scene.H - 2) f.y = scene.H - 2;
          }
        },

        draw: function () {
          clearPaper(ctx, scene.W, scene.H);

          [A, B].forEach(function (p) {
            ctx.strokeStyle = '#4A6B4F';
            ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.stroke();
          });

          ctx.lineCap = 'round';
          for (var i = 0; i < fish.length; i++) {
            var f = fish[i];
            var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy) || 1;
            /* Цвет показывает решение: чем определённее, тем темнее штрих. */
            var certain = Math.abs(f.lean);
            ctx.strokeStyle = f.lean < 0
              ? 'rgba(22,24,26,' + (0.28 + certain * 0.6).toFixed(2) + ')'
              : 'rgba(166,85,67,' + (0.28 + certain * 0.6).toFixed(2) + ')';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(f.x, f.y);
            ctx.lineTo(f.x - f.vx / sp * 7, f.y - f.vy / sp * 7);
            ctx.stroke();
          }

          /* Полоска внизу: сколько рыб на какой стороне. */
          var left = 0;
          for (var k = 0; k < fish.length; k++) if (fish[k].lean < 0) left++;
          var frac = fish.length ? left / fish.length : 0.5;
          var barY = scene.H - 12, barW = scene.W - 44;
          ctx.fillStyle = "#E4E2DA";
          ctx.fillRect(22, barY, barW, 3);
          ctx.fillStyle = "#16181A";
          ctx.fillRect(22, barY, barW * frac, 3);
          ctx.fillStyle = "#6E7278";
          ctx.fillRect(22 + barW / 2 - 0.5, barY - 3, 1, 9);   // отметка «поровну»
        },

        describe: function () {
          var left = 0;
          for (var i = 0; i < fish.length; i++) if (fish[i].lean < 0) left++;
          return fish.length + ' рыб. Левую кормушку выбрали ' + left +
            ', правую ' + (fish.length - left) + '.';
        }
      };
    }
  });

  /* ============================================================= СОТЫ */

  /* Ячейка Вороного строится отсечением: берём большой прямоугольник и режем
     его серединными перпендикулярами к ближайшим соседям. На треугольной
     решётке это в точности шестиугольник. */
  function voronoiCell(px, py, pts, W, H) {
    var poly = [[-20, -20], [W + 20, -20], [W + 20, H + 20], [-20, H + 20]];

    for (var k = 0; k < pts.length; k++) {
      var qx = pts[k][0], qy = pts[k][1];
      if (qx === px && qy === py) continue;
      var dx = qx - px, dy = qy - py;
      var mx = (px + qx) / 2, my = (py + qy) / 2;
      var c = dx * mx + dy * my;

      var next = [];
      for (var i = 0; i < poly.length; i++) {
        var a = poly[i], b = poly[(i + 1) % poly.length];
        var da = dx * a[0] + dy * a[1] - c;
        var db = dx * b[0] + dy * b[1] - c;
        if (da <= 0) next.push(a);
        if ((da <= 0) !== (db <= 0)) {
          var t = da / (da - db);
          next.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
      }
      poly = next;
      if (poly.length < 3) break;
    }
    return poly;
  }

  ROY.registerSim('bees', {
    title: 'Соты',
    lead: 'Пчела не измеряет углы. Шестиугольник получается сам, если ячейки плотно прижаты.',
    params: [
      { key: 'cells',   label: 'сколько ячеек',  hint: 'плотность сот', min: 20, max: 220, step: 5, value: 90 },
      { key: 'push',    label: 'расталкивание',  hint: 'насколько сильно ячейки давят друг на друга', min: 0, max: 1, step: 0.01, value: 0.55, decimals: 2 },
      { key: 'disorder', label: 'беспорядок',    hint: 'сколько случайности мешает выравниванию', min: 0, max: 1, step: 0.01, value: 0.12, decimals: 2 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var pts = [];

      function build() {
        pts.length = 0;
        var n = ROY.count(scene.p.cells);
        for (var i = 0; i < n; i++) {
          pts.push([20 + Math.random() * (scene.W - 40), 20 + Math.random() * (scene.H - 40)]);
        }
      }

      function neighboursOf(i, k) {
        var out = [], px = pts[i][0], py = pts[i][1];
        var d = [];
        for (var j = 0; j < pts.length; j++) {
          if (j === i) continue;
          var dx = pts[j][0] - px, dy = pts[j][1] - py;
          d.push([dx * dx + dy * dy, j]);
        }
        d.sort(function (a, b) { return a[0] - b[0]; });
        for (var m = 0; m < Math.min(k, d.length); m++) out.push(pts[d[m][1]]);
        return out;
      }

      return {
        reset: function () { build(); },
        resize: function () { build(); },
        onQuality: function () { build(); },
        onParam: function (key) { if (key === 'cells') build(); },

        step: function () {
          var n = pts.length, i, j;
          if (!n) return;
          var push = scene.p.push, dis = scene.p.disorder;

          /* Каждая ячейка отталкивается от ближних и получает немного шума.
             Из чистого расталкивания сама собой рождается треугольная
             упаковка центров, а значит — шестиугольные ячейки. */
          var fx = new Float32Array(n), fy = new Float32Array(n);
          var ideal = Math.sqrt((scene.W * scene.H) / Math.max(1, n)) * 1.02;

          for (i = 0; i < n; i++) {
            for (j = i + 1; j < n; j++) {
              var dx = pts[j][0] - pts[i][0], dy = pts[j][1] - pts[i][1];
              var d2 = dx * dx + dy * dy;
              if (d2 > ideal * ideal * 2.6 || d2 < 0.0001) continue;
              var d = Math.sqrt(d2);
              var f = (ideal - d) / ideal;
              if (f < 0) f *= 0.25;                 // притяжение слабее отталкивания
              var ux = dx / d * f, uy = dy / d * f;
              fx[i] -= ux; fy[i] -= uy;
              fx[j] += ux; fy[j] += uy;
            }
          }

          for (i = 0; i < n; i++) {
            pts[i][0] += fx[i] * push * 0.9 + (Math.random() - 0.5) * dis * 1.6;
            pts[i][1] += fy[i] * push * 0.9 + (Math.random() - 0.5) * dis * 1.6;
            if (pts[i][0] < 12) pts[i][0] = 12;
            if (pts[i][0] > scene.W - 12) pts[i][0] = scene.W - 12;
            if (pts[i][1] < 12) pts[i][1] = 12;
            if (pts[i][1] > scene.H - 12) pts[i][1] = scene.H - 12;
          }
        },

        draw: function () {
          clearPaper(ctx, scene.W, scene.H);
          ctx.strokeStyle = 'rgba(22,24,26,0.8)';
          ctx.lineWidth = 1.4;
          ctx.lineJoin = 'round';

          for (var i = 0; i < pts.length; i++) {
            var poly = voronoiCell(pts[i][0], pts[i][1], neighboursOf(i, 10), scene.W, scene.H);
            if (poly.length < 3) continue;
            ctx.beginPath();
            ctx.moveTo(poly[0][0], poly[0][1]);
            for (var k = 1; k < poly.length; k++) ctx.lineTo(poly[k][0], poly[k][1]);
            ctx.closePath();
            ctx.fillStyle = 'rgba(196,144,60,0.10)';
            ctx.fill();
            ctx.stroke();
          }
        },

        describe: function () {
          /* Считаем, сколько ячеек имеют ровно шесть сторон: это и есть
             числовая мера «сотовости». */
          var six = 0;
          for (var i = 0; i < pts.length; i++) {
            var poly = voronoiCell(pts[i][0], pts[i][1], neighboursOf(i, 10), scene.W, scene.H);
            if (poly.length === 6) six++;
          }
          return pts.length + ' ячеек, из них шестиугольных ' + six + '.';
        }
      };
    }
  });

  /* ========================================================== ТРЕЩИНЫ */

  /* Грязь высыхает и сжимается. Трещина идёт туда, где натяжение выше, и
     останавливается, упёршись в уже готовую трещину. Если всё трескается
     разом, стыки выходят тройными по 120 градусов; если одна трещина
     появляется позже другой — она подходит к ней под прямым углом. */
  ROY.registerSim('cracks', {
    title: 'Трещины',
    lead: 'Угол на стыке трещин выдаёт, разом они появились или по очереди.',
    params: [
      { key: "seeds",    label: "сколько очагов",  hint: "откуда начинают идти трещины", min: 3, max: 40, step: 1, value: 20 },
      { key: 'together', label: 'одновременность', hint: '1 — всё трескается разом, 0 — по очереди', min: 0, max: 1, step: 0.01, value: 1, decimals: 2 },
      { key: 'wiggle',   label: 'извилистость',    hint: 'насколько трещина виляет', min: 0, max: 1, step: 0.01, value: 0.28, decimals: 2 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var GW = 0, GH = 0, CELL = 2;
      var grid = null;
      var tips = [];
      var age = 0;
      var pending = [];

      function alloc() {
        CELL = ROY.cell(2);
        GW = Math.max(80, Math.floor(scene.W / CELL));
        GH = Math.max(60, Math.floor(scene.H / CELL));
        grid = new Uint8Array(GW * GH);
        seed();
      }

      function seed() {
        grid.fill(0);
        tips.length = 0; pending.length = 0; age = 0;
        var n = Math.round(scene.p.seeds);
        for (var i = 0; i < n; i++) {
          var x = 6 + Math.random() * (GW - 12);
          var y = 6 + Math.random() * (GH - 12);
          /* Часть очагов стартует сразу, часть — позже. Это и есть
             «одновременность». */
          var delay = Math.random() < scene.p.together ? 0 : Math.round(Math.random() * 260) + 40;
          for (var b = 0; b < 3; b++) {
            var a = Math.random() * Math.PI * 2 + b * Math.PI * 2 / 3;
            var tip = { x: x, y: y, a: a, alive: true };
            if (delay === 0) tips.push(tip); else pending.push({ t: delay, tip: tip });
          }
        }
      }

      function mark(x, y) {
        var gx = Math.round(x), gy = Math.round(y);
        if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return;
        grid[gy * GW + gx] = 1;
      }

      function occupied(x, y) {
        var gx = Math.round(x), gy = Math.round(y);
        if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return true;
        return grid[gy * GW + gx] === 1;
      }

      return {
        reset: function () { alloc(); },
        resize: function () { alloc(); },
        onQuality: function () { alloc(); },
        onParam: function () { seed(); },

        step: function () {
          if (!grid) return;
          age++;

          for (var p = pending.length - 1; p >= 0; p--) {
            if (age >= pending[p].t) { tips.push(pending[p].tip); pending.splice(p, 1); }
          }

          for (var i = 0; i < tips.length; i++) {
            var t = tips[i];
            if (!t.alive) continue;

            t.a += (Math.random() - 0.5) * scene.p.wiggle * 0.5;
            var nx = t.x + Math.cos(t.a) * 1.15;
            var ny = t.y + Math.sin(t.a) * 1.15;

            /* Упёрлись в чужую трещину или в край — останавливаемся.
               Именно поэтому сеть получается замкнутой, а не бесконечной. */
            if (occupied(nx, ny)) { t.alive = false; continue; }

            t.x = nx; t.y = ny;
            mark(t.x, t.y);

            /* Изредка трещина раздваивается. */
            if (Math.random() < 0.006 && tips.length < 400) {
              tips.push({ x: t.x, y: t.y, a: t.a + (Math.random() < 0.5 ? 0.9 : -0.9), alive: true });
            }
          }
        },

        draw: function () {
          clearPaper(ctx, scene.W, scene.H);
          ctx.fillStyle = 'rgba(196,144,60,0.13)';
          ctx.fillRect(0, 0, scene.W, scene.H);

          ctx.fillStyle = 'rgba(22,24,26,0.85)';
          for (var y = 0; y < GH; y++) {
            for (var x = 0; x < GW; x++) {
              if (grid[y * GW + x]) ctx.fillRect(x * CELL, y * CELL, CELL + 0.4, CELL + 0.4);
            }
          }
        },

        describe: function () {
          var alive = 0;
          for (var i = 0; i < tips.length; i++) if (tips[i].alive) alive++;
          return 'Трещин в росте ' + alive + ' из ' + tips.length +
            '. Одновременность ' + scene.p.together.toFixed(2) + '.';
        }
      };
    }
  });

  /* ============================================================ КРОНА */

  /* Алгоритм колонизации пространства. Свет разбросан точками; ветка тянется
     туда, где света больше, и «съедает» его, подойдя близко. Дерево не
     планирует крону — оно просто занимает освещённое место. */
  ROY.registerSim('canopy', {
    title: 'Крона',
    lead: 'Дерево не проектирует крону. Оно занимает свет, а форма получается сама.',
    params: [
      { key: 'light',    label: 'сколько света',   hint: 'плотность освещённых точек', min: 120, max: 1400, step: 20, value: 620 },
      { key: 'reach',    label: 'радиус влияния',  hint: 'как далеко ветка чувствует свет', min: 20, max: 140, step: 2, value: 64 },
      { key: 'eat',      label: 'радиус поглощения', hint: 'на каком расстоянии свет считается использованным', min: 6, max: 40, step: 1, value: 15 },
      { key: 'stepLen',  label: 'шаг роста',       hint: 'длина одного отрезка ветки', min: 2, max: 12, step: 0.5, value: 4.5, decimals: 1 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var lights = [];
      var nodes = [];
      var done = false;

      function build() {
        lights.length = 0; nodes.length = 0; done = false;
        var n = ROY.count(scene.p.light);

        /* Свет только в кроне — эллипсом над стволом. */
        var cx = scene.W * 0.5, cy = scene.H * 0.36;
        var rx = scene.W * 0.36, ry = scene.H * 0.30;
        for (var i = 0; i < n; i++) {
          var a = Math.random() * Math.PI * 2;
          var r = Math.sqrt(Math.random());
          lights.push({ x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r, live: true });
        }

        nodes.push({ x: cx, y: scene.H - 6, parent: -1, w: 0 });
      }

      return {
        reset: function () { build(); },
        resize: function () { build(); },
        onQuality: function () { build(); },
        onParam: function () { build(); },

        step: function () {
          if (done || nodes.length > 4000) return;
          var reach = scene.p.reach, eat = scene.p.eat, len = scene.p.stepLen;

          /* Для каждой ветки складываем направления на близкий свет. */
          var pull = {};
          var any = false;

          for (var i = 0; i < lights.length; i++) {
            var L = lights[i];
            if (!L.live) continue;
            var best = -1, bestD = reach * reach;
            for (var j = 0; j < nodes.length; j++) {
              var dx = nodes[j].x - L.x, dy = nodes[j].y - L.y;
              var d2 = dx * dx + dy * dy;
              if (d2 < bestD) { bestD = d2; best = j; }
            }
            if (best < 0) continue;
            any = true;
            var vx = L.x - nodes[best].x, vy = L.y - nodes[best].y;
            var vd = Math.sqrt(vx * vx + vy * vy) || 1;
            if (!pull[best]) pull[best] = [0, 0];
            pull[best][0] += vx / vd;
            pull[best][1] += vy / vd;
          }

          /* Пока крона не найдена, ствол просто растёт вверх. */
          if (!any) {
            var top = nodes[nodes.length - 1];
            var reachedLight = false;
            for (var q = 0; q < lights.length; q++) if (lights[q].live) { reachedLight = true; break; }
            if (!reachedLight) { done = true; return; }
            nodes.push({ x: top.x, y: top.y - len, parent: nodes.length - 1, w: 0 });
            return;
          }

          Object.keys(pull).forEach(function (key) {
            var idx = key | 0;
            var d = pull[key];
            var m = Math.sqrt(d[0] * d[0] + d[1] * d[1]) || 1;
            nodes.push({
              x: nodes[idx].x + d[0] / m * len,
              y: nodes[idx].y + d[1] / m * len,
              parent: idx, w: 0
            });
          });

          /* Свет, до которого дотянулись, гаснет. */
          for (var k = 0; k < lights.length; k++) {
            var Lk = lights[k];
            if (!Lk.live) continue;
            for (var m2 = 0; m2 < nodes.length; m2++) {
              var ex = nodes[m2].x - Lk.x, ey = nodes[m2].y - Lk.y;
              if (ex * ex + ey * ey < eat * eat) { Lk.live = false; break; }
            }
          }
        },

        draw: function () {
          clearPaper(ctx, scene.W, scene.H);

          ctx.fillStyle = 'rgba(196,144,60,0.5)';
          for (var i = 0; i < lights.length; i++) {
            if (!lights[i].live) continue;
            ctx.fillRect(lights[i].x - 0.8, lights[i].y - 0.8, 1.6, 1.6);
          }

          /* Толщина ветки — сколько потомков через неё проходит. */
          for (var k = 0; k < nodes.length; k++) nodes[k].w = 0;
          for (var j = nodes.length - 1; j > 0; j--) {
            var p = nodes[j].parent;
            if (p >= 0) nodes[p].w += nodes[j].w + 1;
          }

          ctx.strokeStyle = 'rgba(22,24,26,0.85)';
          ctx.lineCap = 'round';
          for (var n = 1; n < nodes.length; n++) {
            var a = nodes[n], b = nodes[a.parent];
            if (!b) continue;
            ctx.lineWidth = Math.min(6, 0.6 + Math.sqrt(a.w) * 0.28);
            ctx.beginPath();
            ctx.moveTo(b.x, b.y); ctx.lineTo(a.x, a.y);
            ctx.stroke();
          }
        },

        describe: function () {
          var live = 0;
          for (var i = 0; i < lights.length; i++) if (lights[i].live) live++;
          return 'Ветвей ' + nodes.length + ', неиспользованного света ' + live +
            ' точек из ' + lights.length + '.';
        }
      };
    }
  });

  /* =========================================================== МОЛНИЯ */

  /* Модель диэлектрического пробоя. Между тучей и землёй считается
     электрическое поле; разряд прирастает в случайную точку на своей границе,
     но с вероятностью тем большей, чем сильнее там поле. Один параметр —
     показатель степени — превращает прямую стрелу в ветвистое дерево. */
  ROY.registerSim('lightning', {
    title: 'Пробой',
    lead: 'Разряд идёт не по прямой, а туда, где поле сильнее. Отсюда ветви.',
    params: [
      { key: "eta",    label: "ветвистость",  hint: "насколько разряд предпочитает самое сильное поле", min: 0.5, max: 6, step: 0.1, value: 2.0, decimals: 1 },
      { key: 'speed',  label: 'скорость роста', hint: 'сколько шагов пробоя за кадр', min: 1, max: 8, step: 1, value: 3 },
      { key: 'relax',  label: 'точность поля', hint: 'сколько проходов пересчёта поля за шаг', min: 2, max: 30, step: 1, value: 12 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var GW = 0, GH = 0, CELL = 4;
      var phi = null, solid = null;
      var off = null, octx = null, img = null, buf = null;
      var candidates = [];
      var finished = false;

      function alloc() {
        CELL = ROY.cell(4);
        GW = Math.max(50, Math.floor(scene.W / CELL));
        GH = Math.max(40, Math.floor(scene.H / CELL));
        phi = new Float32Array(GW * GH);
        solid = new Uint8Array(GW * GH);
        off = document.createElement('canvas');
        off.width = GW; off.height = GH;
        octx = off.getContext('2d');
        img = octx.createImageData(GW, GH);
        buf = img.data;
        seed();
      }

      function seed() {
        finished = false;
        candidates.length = 0;
        for (var y = 0; y < GH; y++) {
          for (var x = 0; x < GW; x++) {
            solid[y * GW + x] = 0;
            phi[y * GW + x] = y / (GH - 1);      // грубое начальное приближение
          }
        }
        /* Разряд начинается из одной точки под тучей. */
        var sx = (GW / 2) | 0;
        solid[0 * GW + sx] = 1;
        solid[1 * GW + sx] = 1;
      }

      function relax(times) {
        for (var t = 0; t < times; t++) {
          for (var y = 1; y < GH - 1; y++) {
            for (var x = 1; x < GW - 1; x++) {
              var i = y * GW + x;
              if (solid[i]) { phi[i] = 0; continue; }   // разряд — проводник
              phi[i] = 0.25 * (phi[i - 1] + phi[i + 1] + phi[i - GW] + phi[i + GW]);
            }
          }
          /* Туча сверху и земля снизу держат разность потенциалов. */
          for (var x2 = 0; x2 < GW; x2++) {
            phi[x2] = solid[x2] ? 0 : 0;
            phi[(GH - 1) * GW + x2] = 1;
          }
          for (var y2 = 0; y2 < GH; y2++) {
            phi[y2 * GW] = phi[y2 * GW + 1];
            phi[y2 * GW + GW - 1] = phi[y2 * GW + GW - 2];
          }
        }
      }

      function grow() {
        candidates.length = 0;
        var sum = 0, eta = scene.p.eta;

        for (var y = 0; y < GH; y++) {
          for (var x = 0; x < GW; x++) {
            var i = y * GW + x;
            if (solid[i]) continue;
            var touch = (x > 0 && solid[i - 1]) || (x < GW - 1 && solid[i + 1]) ||
                        (y > 0 && solid[i - GW]) || (y < GH - 1 && solid[i + GW]);
            if (!touch) continue;
            var w = Math.pow(Math.max(0, phi[i]), eta);
            if (w <= 0) continue;
            candidates.push([i, w]);
            sum += w;
          }
        }
        if (!candidates.length || sum <= 0) { finished = true; return; }

        var r = Math.random() * sum, acc = 0;
        for (var k = 0; k < candidates.length; k++) {
          acc += candidates[k][1];
          if (acc >= r) {
            solid[candidates[k][0]] = 1;
            if (candidates[k][0] >= (GH - 2) * GW) finished = true;   // достигли земли
            return;
          }
        }
      }

      return {
        reset: function () { alloc(); },
        resize: function () { alloc(); },
        onQuality: function () { alloc(); },
        onParam: function (key) { if (key === 'eta') seed(); },

        step: function () {
          if (!phi || finished) return;
          relax(Math.round(scene.p.relax));
          for (var s = 0; s < Math.round(scene.p.speed); s++) {
            if (finished) break;
            grow();
          }
        },

        draw: function () {
          if (!buf) return;
          var n = GW * GH;
          for (var i = 0; i < n; i++) {
            /* Поле рисуем очень бледно, разряд — чернилами. */
            inkAt(buf, i, solid[i] ? 0.9 : (1 - phi[i]) * 0.10);
          }
          octx.putImageData(img, 0, 0);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(off, 0, 0, scene.W, scene.H);

          ctx.fillStyle = '#6E7278';
          ctx.fillRect(0, scene.H - 2, scene.W, 2);
        },

        describe: function () {
          var n = GW * GH, c = 0;
          for (var i = 0; i < n; i++) if (solid[i]) c++;
          return 'Разряд занял ' + c + ' клеток. Ветвистость ' + scene.p.eta.toFixed(1) +
            (finished ? '. Канал достиг земли.' : '. Пробой продолжается.');
        }
      };
    }
  });

})(window);
