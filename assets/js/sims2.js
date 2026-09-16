/* РОЙ · симуляции, часть вторая
   ------------------------------------------------------------------
   Продолжение sims.js. Отдельный файл, потому что первый уже большой,
   а не потому, что эти системы чем-то отличаются: интерфейс тот же.
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

  /* ====================================================== ПРОБКА ИЗ НИЧЕГО */

  /* Модель Нагеля—Шрекенберга. Кольцевая дорога, четыре правила на машину.
     Главное здесь — не сама дорога, а диаграмма под ней: по горизонтали
     положение, сверху вниз время. Пробка на ней видна как полоса, которая
     ползёт НАВСТРЕЧУ движению, хотя каждая машина едет вперёд. */
  ROY.registerSim('traffic', {
    title: 'Пробка из ничего',
    lead: 'Никто не тормозил, никто не сталкивался — а пробка есть.',
    params: [
      { key: 'density', label: 'плотность',  hint: 'какая доля дороги занята машинами', min: 0.04, max: 0.55, step: 0.01, value: 0.20, decimals: 2 },
      { key: 'vmax',    label: 'разрешённая скорость', hint: 'на сколько клеток машина проезжает за шаг', min: 1, max: 8, step: 1, value: 5 },
      { key: 'dawdle',  label: 'рассеянность', hint: 'как часто водитель тормозит без всякой причины', min: 0, max: 0.7, step: 0.01, value: 0.25, decimals: 2 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var CELL = 3;
      var N = 0, ROWS = 0;
      var occ = null;                 // в клетке номер машины или -1
      var pos = null, vel = null;     // положение и скорость каждой машины
      var cars = 0;
      var off = null, octx = null, img = null, buf = null;
      var rowPtr = 0, filled = 0;

      function alloc() {
        CELL = ROY.cell(3);
        N = Math.max(60, Math.floor(scene.W / CELL));
        ROWS = Math.max(40, Math.floor((scene.H * 0.72) / CELL));

        occ = new Int32Array(N);
        off = document.createElement('canvas');
        off.width = N; off.height = ROWS;
        octx = off.getContext('2d');
        img = octx.createImageData(N, ROWS);
        buf = img.data;
        for (var i = 0; i < N * ROWS; i++) inkAt(buf, i, 0);
        rowPtr = 0; filled = 0;
        seed();
      }

      function seed() {
        cars = Math.max(2, Math.round(N * scene.p.density));
        pos = new Int32Array(cars);
        vel = new Int32Array(cars);
        occ.fill(-1);

        /* Машины расставляются равномерно и все с одной скоростью: никакой
           пробки в начальных условиях нет, она обязана возникнуть сама. */
        var stepGap = N / cars;
        for (var i = 0; i < cars; i++) {
          var p = Math.floor(i * stepGap) % N;
          if (occ[p] !== -1) { p = (p + 1) % N; }
          pos[i] = p; vel[i] = Math.round(scene.p.vmax);
          occ[p] = i;
        }
      }

      return {
        reset: function () { alloc(); },
        resize: function () { alloc(); },
        onQuality: function () { alloc(); },
        onParam: function (key) { if (key === 'density') seed(); },

        step: function () {
          if (!pos) return;
          var vmax = Math.round(scene.p.vmax), dawdle = scene.p.dawdle, i;

          for (i = 0; i < cars; i++) {
            /* 1. разгон */
            if (vel[i] < vmax) vel[i]++;

            /* 2. торможение до свободного места впереди */
            var gap = 0;
            while (gap < vmax + 1 && occ[(pos[i] + gap + 1) % N] === -1) gap++;
            if (vel[i] > gap) vel[i] = gap;

            /* 3. рассеянность: без всякой причины на клетку медленнее */
            if (vel[i] > 0 && Math.random() < dawdle) vel[i]--;
          }

          /* 4. движение — только после того, как все приняли решение */
          for (i = 0; i < cars; i++) occ[pos[i]] = -1;
          for (i = 0; i < cars; i++) {
            pos[i] = (pos[i] + vel[i]) % N;
            occ[pos[i]] = i;
          }

          /* новая строка диаграммы «пространство — время» */
          var base = rowPtr * N;
          for (i = 0; i < N; i++) {
            inkAt(buf, base + i, occ[i] === -1 ? 0.05 : 0.85);
          }
          rowPtr = (rowPtr + 1) % ROWS;
          if (filled < ROWS) filled++;
        },

        draw: function () {
          if (!buf) return;
          clearPaper(ctx, scene.W, scene.H);

          var roadY = scene.H * 0.12;

          /* сама дорога */
          ctx.strokeStyle = '#B9BCB6';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, roadY + 11.5); ctx.lineTo(scene.W, roadY + 11.5);
          ctx.stroke();

          ctx.fillStyle = 'rgba(22,24,26,0.88)';
          for (var i = 0; i < cars; i++) {
            ctx.fillRect(pos[i] * CELL, roadY, Math.max(2, CELL - 0.6), 9);
          }

          /* На миниатюре подпись превращается в нечитаемую грязь. */
          if (scene.W > 420) {
            ctx.fillStyle = '#6E7278';
            ctx.font = '10px "IBM Plex Mono", monospace';
            ctx.fillText('дорога замкнута в кольцо · время идёт вниз', 2, roadY - 8);
          }

          /* диаграмма: сверху свежая строка, ниже всё более старые */
          octx.putImageData(img, 0, 0);
          ctx.imageSmoothingEnabled = false;

          var top = roadY + 26;
          var hPix = scene.H - top;
          var visible = Math.min(filled, ROWS);
          if (!visible) return;

          /* Масштаб строки постоянный. Если растягивать имеющиеся строки на всю
             высоту, то первые секунды диаграмма выглядит как несколько толстых
             полос во весь экран, а потом резко сжимается. */
          var scale = hPix / ROWS;
          var bottom = top + hPix;
          var destTop = bottom - visible * scale;

          var srcStart = (rowPtr - visible + ROWS) % ROWS;
          var chunk = Math.min(visible, ROWS - srcStart);

          /* Буфер кольцевой, поэтому рисуем его двумя кусками:
             сверху более старые строки, снизу самая свежая. */
          ctx.drawImage(off, 0, srcStart, N, chunk,
                        0, destTop, scene.W, chunk * scale);
          if (chunk < visible) {
            ctx.drawImage(off, 0, 0, N, visible - chunk,
                          0, destTop + chunk * scale, scene.W, (visible - chunk) * scale);
          }
        },

        describe: function () {
          var sum = 0;
          for (var i = 0; i < cars; i++) sum += vel[i];
          return cars + ' машин на кольцевой дороге из ' + N + ' клеток. Средняя скорость ' +
            (cars ? (sum / cars).toFixed(2) : '0') + ' клеток за шаг при разрешённой ' +
            Math.round(scene.p.vmax) + '.';
        }
      };
    }
  });

  /* ======================================================== СВЕТЛЯЧКИ */

  /* Импульсно-связанные осцилляторы. У каждого светлячка свой таймер; когда
     он доходит до конца, светлячок вспыхивает и подталкивает таймеры соседей.
     Из полного разнобоя система приходит к единому ритму — сама. */
  ROY.registerSim('fireflies', {
    title: 'Синхронизация',
    lead: 'Каждый светлячок смотрит только на соседей — а мигает вся поляна разом.',
    params: [
      { key: 'count',    label: 'сколько светлячков', hint: 'плотность поляны', min: 20, max: 260, step: 5, value: 130 },
      { key: 'rate',     label: 'темп',      hint: 'как быстро набирается собственный таймер', min: 0.002, max: 0.02, step: 0.0005, value: 0.008, decimals: 4 },
      { key: 'coupling', label: 'сила связи', hint: 'насколько чужая вспышка подгоняет твой таймер', min: 0, max: 0.35, step: 0.005, value: 0.09, decimals: 3 },
      { key: 'radius',   label: 'радиус видимости', hint: 'как далеко светлячок видит соседей', min: 30, max: 300, step: 5, value: 130 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var f = [];

      function build() {
        f.length = 0;
        var n = ROY.count(scene.p.count);
        for (var i = 0; i < n; i++) {
          f.push({
            x: 24 + Math.random() * (scene.W - 48),
            y: 24 + Math.random() * (scene.H - 48),
            phase: Math.random(),      // разнобой на старте — обязателен
            lit: 0,
            r: 2.1 + Math.random() * 1.6
          });
        }
      }

      return {
        reset: function () { build(); },
        resize: function () { build(); },
        onQuality: function () { build(); },
        onParam: function (key) { if (key === 'count') build(); },

        step: function () {
          var n = f.length, i, j;
          var rate = scene.p.rate, k = scene.p.coupling, R2 = scene.p.radius * scene.p.radius;
          var flashed = [];

          for (i = 0; i < n; i++) {
            f[i].phase += rate;
            if (f[i].lit > 0) f[i].lit -= 0.06;
            if (f[i].phase >= 1) { f[i].phase = 0; f[i].lit = 1; flashed.push(i); }
          }

          /* Вспышка подталкивает соседей. Каскад ограничен по длине, иначе при
             сильной связи система уйдёт в бесконечную цепную реакцию. */
          var guard = 0;
          while (flashed.length && guard < 4) {
            var next = [];
            for (var q = 0; q < flashed.length; q++) {
              var a = f[flashed[q]];
              for (j = 0; j < n; j++) {
                var b = f[j];
                if (b === a) continue;
                var dx = b.x - a.x, dy = b.y - a.y;
                if (dx * dx + dy * dy > R2) continue;
                b.phase += k;
                if (b.phase >= 1) { b.phase = 0; b.lit = 1; next.push(j); }
              }
            }
            flashed = next;
            guard++;
          }
        },

        draw: function () {
          clearPaper(ctx, scene.W, scene.H);

          for (var i = 0; i < f.length; i++) {
            var b = f[i];
            /* Пока таймер набирается — светлячок едва виден; на вспышке
               становится чернильным пятном с ореолом. */
            var glow = b.lit > 0 ? b.lit : Math.pow(b.phase, 6) * 0.5;

            if (glow > 0.08) {
              ctx.fillStyle = 'rgba(196,144,60,' + (glow * 0.30).toFixed(3) + ')';
              ctx.beginPath();
              ctx.arc(b.x, b.y, b.r + glow * 9, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = 'rgba(22,24,26,' + (0.16 + glow * 0.74).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
          }
        },

        describe: function () {
          /* Разброс фаз — числовая мера синхронности: у слаженной поляны он мал. */
          var n = f.length, sx = 0, sy = 0;
          for (var i = 0; i < n; i++) {
            sx += Math.cos(f[i].phase * Math.PI * 2);
            sy += Math.sin(f[i].phase * Math.PI * 2);
          }
          var order = n ? Math.sqrt(sx * sx + sy * sy) / n : 0;
          return n + ' светлячков. Слаженность ' + order.toFixed(2) +
            ' из 1: единица означает, что вся поляна мигает одновременно.';
        }
      };
    }
  });

  /* ============================================================ ПЕСОК */

  /* Клеточный автомат. Правило одно: если под песчинкой пусто — падай, если
     занято — пробуй съехать вбок по диагонали. Из этого сама собой берётся
     постоянная крутизна откоса, которой у воды не бывает. */
  ROY.registerSim('sand', {
    title: 'Сыпучее',
    lead: 'Песок течёт как жидкость, но выстраивает склон и останавливается.',
    params: [
      { key: 'slip',  label: 'сыпучесть', hint: 'охотно ли песчинка съезжает вбок', min: 0, max: 1, step: 0.01, value: 0.55, decimals: 2 },
      { key: 'flow',  label: 'поток',     hint: 'сколько песка сыплется сверху за шаг', min: 0, max: 12, step: 1, value: 4 },
      { key: 'wind',  label: 'ветер',     hint: 'сносит падающие песчинки вбок', min: -1, max: 1, step: 0.02, value: 0, decimals: 2 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var GW = 0, GH = 0, CELL = 3;
      var g = null;
      var off = null, octx = null, img = null, buf = null;

      function alloc() {
        CELL = ROY.cell(3);
        GW = Math.max(60, Math.floor(scene.W / CELL));
        GH = Math.max(45, Math.floor(scene.H / CELL));
        g = new Uint8Array(GW * GH);
        off = document.createElement('canvas');
        off.width = GW; off.height = GH;
        octx = off.getContext('2d');
        img = octx.createImageData(GW, GH);
        buf = img.data;
      }

      function pour(cx, cy, r) {
        for (var y = -r; y <= r; y++) {
          for (var x = -r; x <= r; x++) {
            if (x * x + y * y > r * r) continue;
            var px = cx + x, py = cy + y;
            if (px < 0 || py < 0 || px >= GW || py >= GH) continue;
            g[py * GW + px] = 1;
          }
        }
      }

      var painting = false;
      function at(e) {
        var rect = scene.canvas.getBoundingClientRect();
        pour(Math.round((e.clientX - rect.left) / rect.width * GW),
             Math.round((e.clientY - rect.top) / rect.height * GH), 3);
      }
      scene.canvas.addEventListener('mousedown', function (e) { painting = true; at(e); });
      window.addEventListener('mouseup', function () { painting = false; });
      scene.canvas.addEventListener('mousemove', function (e) { if (painting) at(e); });

      return {
        reset: function () { alloc(); },
        resize: function () { alloc(); },
        onQuality: function () { alloc(); },

        step: function () {
          if (!g) return;
          var slip = scene.p.slip, wind = scene.p.wind;

          /* Источник сверху по центру. */
          var flow = Math.round(scene.p.flow);
          for (var s = 0; s < flow; s++) {
            var sx = (GW * 0.5 + (Math.random() - 0.5) * 6) | 0;
            if (sx > 0 && sx < GW) g[1 * GW + sx] = 1;
          }

          /* Идём снизу вверх: иначе одна песчинка успеет упасть на несколько
             клеток за один шаг и падение будет выглядеть рывками. */
          for (var y = GH - 2; y >= 0; y--) {
            var dir = Math.random() < 0.5 ? 1 : -1;   // без этого куча кренится
            for (var k = 0; k < GW; k++) {
              var x = dir > 0 ? k : GW - 1 - k;
              var i = y * GW + x;
              if (!g[i]) continue;

              var below = i + GW;
              if (!g[below]) { g[i] = 0; g[below] = 1; continue; }

              if (Math.random() > slip) continue;

              var bias = wind * 0.5;
              var first = Math.random() < 0.5 + bias ? 1 : -1;
              var nx = x + first;
              if (nx >= 0 && nx < GW && !g[below + first]) { g[i] = 0; g[below + first] = 1; continue; }
              nx = x - first;
              if (nx >= 0 && nx < GW && !g[below - first]) { g[i] = 0; g[below - first] = 1; }
            }
          }
        },

        draw: function () {
          if (!buf) return;
          var n = GW * GH;
          for (var i = 0; i < n; i++) inkAt(buf, i, g[i] ? 0.82 : 0.04);
          octx.putImageData(img, 0, 0);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(off, 0, 0, scene.W, scene.H);
        },

        describe: function () {
          var n = GW * GH, c = 0;
          for (var i = 0; i < n; i++) if (g[i]) c++;
          return 'Поле ' + GW + ' на ' + GH + ' клеток, засыпано ' +
            (c / n * 100).toFixed(1) + '%. Сыпучесть ' + scene.p.slip.toFixed(2) + '.';
        }
      };
    }
  });

  /* ========================================================== МУРАВЬИ */

  /* Два пахучих следа: «к дому» оставляют те, кто ищет, «к еде» — те, кто
     возвращается с добычей. Никто не измеряет длину пути; короткий просто
     успевает получить больше пахучего вещества до того, как оно выветрится. */
  ROY.registerSim('ants', {
    title: 'След',
    lead: 'Муравей не умеет измерять расстояние. Короткий путь выигрывает сам.',
    params: [
      { key: 'count',      label: 'сколько муравьёв', hint: 'размер колонии', min: 40, max: 400, step: 10, value: 180 },
      { key: 'evaporate',  label: 'выветривание',     hint: 'как быстро пропадает запах', min: 0.001, max: 0.05, step: 0.001, value: 0.012, decimals: 3 },
      { key: 'follow',     label: 'доверие следу',    hint: 'насколько муравей слушается запаха', min: 0, max: 1, step: 0.01, value: 0.62, decimals: 2 },
      { key: 'wander',     label: 'своеволие',        hint: 'насколько муравей сворачивает наугад', min: 0, max: 1, step: 0.01, value: 0.35, decimals: 2 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var GW = 0, GH = 0, CELL = 4;
      var toHome = null, toFood = null;
      var ants = [];
      var nest = { x: 0, y: 0 }, food = [];
      var off = null, octx = null, img = null, buf = null;

      function alloc() {
        CELL = ROY.cell(4);
        GW = Math.max(40, Math.floor(scene.W / CELL));
        GH = Math.max(30, Math.floor(scene.H / CELL));
        toHome = new Float32Array(GW * GH);
        toFood = new Float32Array(GW * GH);
        off = document.createElement('canvas');
        off.width = GW; off.height = GH;
        octx = off.getContext('2d');
        img = octx.createImageData(GW, GH);
        buf = img.data;

        nest.x = scene.W * 0.2; nest.y = scene.H * 0.5;
        food = [
          { x: scene.W * 0.78, y: scene.H * 0.26, left: 900 },
          { x: scene.W * 0.72, y: scene.H * 0.78, left: 900 }
        ];
        build();
      }

      function build() {
        ants.length = 0;
        var n = ROY.count(scene.p.count);
        for (var i = 0; i < n; i++) {
          ants.push({
            x: nest.x, y: nest.y,
            a: Math.random() * Math.PI * 2,
            carrying: false
          });
        }
      }

      function sample(field, x, y) {
        var gx = (x / CELL) | 0, gy = (y / CELL) | 0;
        if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return 0;
        return field[gy * GW + gx];
      }

      function deposit(field, x, y, amount) {
        var gx = (x / CELL) | 0, gy = (y / CELL) | 0;
        if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return;
        var i = gy * GW + gx;
        field[i] = Math.min(1.6, field[i] + amount);
      }

      return {
        reset: function () { alloc(); },
        resize: function () { alloc(); },
        onQuality: function () { alloc(); },
        onParam: function (key) { if (key === 'count') build(); },

        step: function () {
          if (!ants.length) return;
          var ev = 1 - scene.p.evaporate, follow = scene.p.follow, wander = scene.p.wander;
          var i, n = GW * GH;

          for (i = 0; i < n; i++) { toHome[i] *= ev; toFood[i] *= ev; }

          for (i = 0; i < ants.length; i++) {
            var a = ants[i];
            var field = a.carrying ? toHome : toFood;

            /* Три пробы: влево, прямо, вправо. Муравей идёт туда, где запаха
               больше, но с изрядной долей своеволия. */
            var best = a.a, bestV = -1;
            for (var s = -1; s <= 1; s++) {
              var ang = a.a + s * 0.6;
              var v = sample(field, a.x + Math.cos(ang) * 9, a.y + Math.sin(ang) * 9);
              v += Math.random() * 0.02;
              if (v > bestV) { bestV = v; best = ang; }
            }

            a.a = a.a + (best - a.a) * follow + (Math.random() - 0.5) * wander * 0.8;

            /* Возвращаясь, муравей всё же держит направление на дом: иначе
               колония работает только когда след уже проложен. */
            if (a.carrying) {
              var hx = nest.x - a.x, hy = nest.y - a.y;
              var ha = Math.atan2(hy, hx);
              var d = ((ha - a.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
              a.a += d * 0.16;
            }

            a.x += Math.cos(a.a) * 1.5;
            a.y += Math.sin(a.a) * 1.5;

            if (a.x < 4) { a.x = 4; a.a = Math.PI - a.a; }
            if (a.x > scene.W - 4) { a.x = scene.W - 4; a.a = Math.PI - a.a; }
            if (a.y < 4) { a.y = 4; a.a = -a.a; }
            if (a.y > scene.H - 4) { a.y = scene.H - 4; a.a = -a.a; }

            deposit(a.carrying ? toFood : toHome, a.x, a.y, a.carrying ? 0.09 : 0.035);

            if (!a.carrying) {
              for (var k = 0; k < food.length; k++) {
                var fdx = a.x - food[k].x, fdy = a.y - food[k].y;
                if (fdx * fdx + fdy * fdy < 200 && food[k].left > 0) {
                  a.carrying = true; food[k].left--;
                  a.a += Math.PI;
                  break;
                }
              }
            } else {
              var ndx = a.x - nest.x, ndy = a.y - nest.y;
              if (ndx * ndx + ndy * ndy < 200) { a.carrying = false; a.a += Math.PI; }
            }
          }
        },

        draw: function () {
          if (!buf) return;
          var n = GW * GH;
          for (var i = 0; i < n; i++) {
            inkAt(buf, i, Math.min(0.55, toFood[i] * 0.5 + toHome[i] * 0.16));
          }
          octx.putImageData(img, 0, 0);
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(off, 0, 0, scene.W, scene.H);

          for (var k = 0; k < food.length; k++) {
            ctx.strokeStyle = food[k].left > 0 ? '#4A6B4F' : '#B9BCB6';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(food[k].x, food[k].y, 11, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.strokeStyle = '#A65543';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(nest.x, nest.y, 13, 0, Math.PI * 2);
          ctx.stroke();

          for (var i2 = 0; i2 < ants.length; i2++) {
            var a = ants[i2];
            ctx.fillStyle = a.carrying ? 'rgba(74,107,79,0.95)' : 'rgba(22,24,26,0.75)';
            ctx.fillRect(a.x - 1, a.y - 1, 2.2, 2.2);
          }
        },

        describe: function () {
          var carrying = 0;
          for (var i = 0; i < ants.length; i++) if (ants[i].carrying) carrying++;
          return ants.length + ' муравьёв, из них ' + carrying +
            ' несут добычу. Выветривание ' + scene.p.evaporate.toFixed(3) + ' за шаг.';
        }
      };
    }
  });

  /* ========================================================= СНЕЖИНКА */

  /* Модель Райтера на шестиугольной решётке. Пар оседает на кристалл, лёд
     растёт, и все шесть лучей выходят одинаковыми не потому, что они друг
     с другом сверяются, а потому, что условия у них общие. */
  ROY.registerSim('snowflake', {
    title: 'Кристалл',
    lead: 'Шесть лучей не сговариваются. Просто условия у них одни и те же.',
    params: [
      { key: 'beta',  label: 'влажность',  hint: 'сколько пара в воздухе вокруг кристалла', min: 0.3, max: 0.9, step: 0.005, value: 0.55, decimals: 3 },
      { key: 'alpha', label: 'подвижность пара', hint: 'как охотно пар растекается', min: 0.5, max: 2.0, step: 0.01, value: 1.0, decimals: 2 },
      { key: 'gamma', label: 'подпитка',   hint: 'сколько пара добавляется к растущему краю', min: 0, max: 0.006, step: 0.0001, value: 0.0015, decimals: 4 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var GW = 0, GH = 0, CELL = 3;
      var s = null, u = null, v = null, recep = null;
      var off = null, octx = null, img = null, buf = null;

      function alloc() {
        CELL = ROY.cell(3);
        GW = Math.max(60, Math.floor(scene.W / CELL));
        GH = Math.max(50, Math.floor(scene.H / CELL));
        var n = GW * GH;
        s = new Float32Array(n); u = new Float32Array(n);
        v = new Float32Array(n); recep = new Uint8Array(n);
        off = document.createElement('canvas');
        off.width = GW; off.height = GH;
        octx = off.getContext('2d');
        img = octx.createImageData(GW, GH);
        buf = img.data;
        seed();
      }

      function seed() {
        var n = GW * GH;
        for (var i = 0; i < n; i++) s[i] = scene.p.beta;
        s[((GH / 2) | 0) * GW + ((GW / 2) | 0)] = 1;   // одна льдинка в центре
      }

      /* Шестиугольная решётка на прямоугольном массиве: у чётных и нечётных
         строк соседи смещены. Без этого получатся квадраты, а не снежинка. */
      function neighbours(x, y, out) {
        var odd = y & 1;
        out[0] = [x - 1, y]; out[1] = [x + 1, y];
        out[2] = [x - 1 + odd, y - 1]; out[3] = [x + odd, y - 1];
        out[4] = [x - 1 + odd, y + 1]; out[5] = [x + odd, y + 1];
        return out;
      }

      var nb = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];

      return {
        reset: function () { alloc(); },
        resize: function () { alloc(); },
        onQuality: function () { alloc(); },
        onParam: function (key) { if (key === 'beta') { seed(); } },

        step: function () {
          if (!s) return;
          var alpha = scene.p.alpha, gamma = scene.p.gamma;
          var x, y, i, k;

          /* какие клетки «восприимчивы»: сами лёд или рядом со льдом */
          for (y = 0; y < GH; y++) {
            for (x = 0; x < GW; x++) {
              i = y * GW + x;
              var r = s[i] >= 1 ? 1 : 0;
              if (!r) {
                neighbours(x, y, nb);
                for (k = 0; k < 6; k++) {
                  var nx = nb[k][0], ny = nb[k][1];
                  if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
                  if (s[ny * GW + nx] >= 1) { r = 1; break; }
                }
              }
              recep[i] = r;
              if (r) { v[i] = s[i] + gamma; u[i] = 0; }
              else   { u[i] = s[i]; v[i] = 0; }
            }
          }

          /* пар растекается только по невосприимчивой части */
          for (y = 0; y < GH; y++) {
            for (x = 0; x < GW; x++) {
              i = y * GW + x;
              var sum = 0, cnt = 0;
              neighbours(x, y, nb);
              for (k = 0; k < 6; k++) {
                var mx = nb[k][0], my = nb[k][1];
                if (mx < 0 || my < 0 || mx >= GW || my >= GH) { sum += u[i]; cnt++; continue; }
                sum += u[my * GW + mx]; cnt++;
              }
              s[i] = v[i] + u[i] + (alpha / 2) * (sum / cnt - u[i]);
            }
          }
        },

        draw: function () {
          if (!buf) return;
          var n = GW * GH;
          for (var i = 0; i < n; i++) {
            /* Лёд — чернила, пар — почти чистая бумага с лёгким градиентом. */
            var val = s[i] >= 1 ? 0.88 : Math.max(0, (s[i] - 0.2)) * 0.18;
            inkAt(buf, i, val);
          }
          octx.putImageData(img, 0, 0);
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(off, 0, 0, scene.W, scene.H);
        },

        describe: function () {
          var n = GW * GH, ice = 0;
          for (var i = 0; i < n; i++) if (s[i] >= 1) ice++;
          return 'Шестиугольная решётка ' + GW + ' на ' + GH + '. Замёрзло ' + ice +
            ' клеток при влажности ' + scene.p.beta.toFixed(3) + '.';
        }
      };
    }
  });

})(window);
