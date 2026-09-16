/* РОЙ · симуляции, часть четвёртая
   ------------------------------------------------------------------
   Меандры реки, рост раковины, движение дюны, марш саранчи, строй роя.
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

  /* ============================================================== РЕКА */

  /* Русло — ломаная. На повороте вода жмётся к внешнему берегу и подмывает
     его, поэтому каждая точка сдвигается наружу тем сильнее, чем круче здесь
     изгиб. Петля растёт, пока её концы не сомкнутся, — и река спрямляется,
     оставив старицу. */
  ROY.registerSim('river', {
    title: 'Меандры',
    lead: 'Река не может течь прямо: любой изгиб усиливает сам себя.',
    params: [
      { key: 'erode',  label: 'размыв',        hint: 'как быстро подмывается внешний берег', min: 0, max: 1, step: 0.01, value: 0.42, decimals: 2 },
      { key: 'smooth', label: 'сглаживание',   hint: 'вязкость русла: мешает мелким зазубринам', min: 0, max: 1, step: 0.01, value: 0.42, decimals: 2 },
      { key: 'cutoff', label: 'порог спрямления', hint: 'на каком сближении петля отсекается в старицу', min: 4, max: 40, step: 1, value: 15 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var pts = [];
      var oxbows = [];
      var SPACING = 9;

      function build() {
        pts.length = 0; oxbows.length = 0;
        var n = 90;
        for (var i = 0; i < n; i++) {
          var t = i / (n - 1);
          pts.push({
            x: 20 + t * (scene.W - 40),
            y: scene.H * 0.5 + Math.sin(t * 7) * 7 + (Math.random() - 0.5) * 3
          });
        }
      }

      /* Держим равномерный шаг между точками: без этого русло на растущих
         петлях «рвётся», а на спрямлениях сгущается в комок. */
      function resample() {
        if (pts.length < 3) return;
        var out = [pts[0]];
        var acc = 0;
        for (var i = 1; i < pts.length; i++) {
          var dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
          var d = Math.sqrt(dx * dx + dy * dy);
          acc += d;
          if (acc >= SPACING) {
            out.push({ x: pts[i].x, y: pts[i].y });
            acc = 0;
          }
        }
        out.push(pts[pts.length - 1]);
        if (out.length > 3 && out.length < 900) pts = out;
      }

      function cutoffs() {
        var lim = scene.p.cutoff, lim2 = lim * lim;
        for (var i = 0; i < pts.length - 12; i++) {
          for (var j = i + 10; j < pts.length; j++) {
            var dx = pts[j].x - pts[i].x, dy = pts[j].y - pts[i].y;
            if (dx * dx + dy * dy < lim2) {
              /* Отрезанная петля остаётся на карте старицей. */
              oxbows.push(pts.slice(i, j + 1).map(function (p) { return { x: p.x, y: p.y }; }));
              if (oxbows.length > 14) oxbows.shift();
              pts.splice(i + 1, j - i - 1);
              return;
            }
          }
        }
      }

      return {
        reset: function () { build(); },
        resize: function () { build(); },

        step: function () {
          var n = pts.length;
          if (n < 5) return;
          var erode = scene.p.erode, smooth = scene.p.smooth;

          var nx = new Float32Array(n), ny = new Float32Array(n);

          for (var i = 1; i < n - 1; i++) {
            var a = pts[i - 1], b = pts[i], c = pts[i + 1];

            /* Кривизна: насколько середина отклонена от хорды. */
            var mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2;
            var curvX = b.x - mx, curvY = b.y - my;

            /* Нормаль к руслу. Сдвигаем точку наружу изгиба. */
            var tx = c.x - a.x, ty = c.y - a.y;
            var tl = Math.sqrt(tx * tx + ty * ty) || 1;
            var normX = -ty / tl, normY = tx / tl;

            var side = curvX * normX + curvY * normY;

            /* Скорость размыва пропорциональна кривизне, а не смещению:
               без нормировки на шаг разбиения петли растут без предела и
               русло за минуту превращается в клубок. Сдвиг за шаг ограничен. */
            var move = erode * (side / (SPACING * SPACING)) * 14;
            if (move > 0.22) move = 0.22; else if (move < -0.22) move = -0.22;

            nx[i] = b.x + normX * move + (Math.random() - 0.5) * 0.12;
            ny[i] = b.y + normY * move + (Math.random() - 0.5) * 0.12;

            /* Сглаживание не даёт русл превратиться в пилу. */
            nx[i] += (mx - b.x) * smooth * 0.11;
            ny[i] += (my - b.y) * smooth * 0.11;
          }

          for (var k = 1; k < n - 1; k++) {
            pts[k].x = nx[k]; pts[k].y = ny[k];
            if (pts[k].y < 12) pts[k].y = 12;
            if (pts[k].y > scene.H - 12) pts[k].y = scene.H - 12;
            if (pts[k].x < 8) pts[k].x = 8;
            if (pts[k].x > scene.W - 8) pts[k].x = scene.W - 8;
          }

          resample();
          cutoffs();
        },

        draw: function () {
          clearPaper(ctx, scene.W, scene.H);

          ctx.strokeStyle = 'rgba(110,114,120,0.45)';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          oxbows.forEach(function (o) {
            ctx.beginPath();
            ctx.moveTo(o[0].x, o[0].y);
            for (var i = 1; i < o.length; i++) ctx.lineTo(o[i].x, o[i].y);
            ctx.stroke();
          });

          ctx.strokeStyle = '#2545E6';
          ctx.lineWidth = 3.4;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
        },

        describe: function () {
          var len = 0;
          for (var i = 1; i < pts.length; i++) {
            var dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
            len += Math.sqrt(dx * dx + dy * dy);
          }
          var direct = Math.max(1, pts[pts.length - 1].x - pts[0].x);
          return 'Длина русла ' + Math.round(len) + ' точек при прямом расстоянии ' +
            Math.round(direct) + '. Извилистость ' + (len / direct).toFixed(2) +
            '. Стариц: ' + oxbows.length + '.';
        }
      };
    }
  });

  /* ========================================================== РАКОВИНА */

  /* Моллюск не перестраивает раковину — он только достраивает край. Если
     каждый новый виток крупнее предыдущего в одно и то же число раз, форма
     получается логарифмической спиралью: она растёт, не меняя очертаний. */
  ROY.registerSim('shell', {
    title: 'Спираль роста',
    lead: 'Раковина растёт только с краю — и поэтому не меняет формы.',
    params: [
      { key: 'growth', label: 'прирост за оборот', hint: 'во сколько раз раковина крупнеет за полный виток', min: 1.2, max: 4.5, step: 0.05, value: 2.4, decimals: 2 },
      { key: 'aperture', label: 'ширина устья',   hint: 'насколько широк край, которым идёт рост', min: 0.15, max: 0.75, step: 0.01, value: 0.42, decimals: 2 },
      { key: 'lean',   label: 'наклон оси',       hint: 'сдвиг витка вдоль оси: плоская спираль или башенка', min: 0, max: 1, step: 0.01, value: 0.34, decimals: 2 },
      { key: 'bands',  label: 'полосы роста',     hint: 'как часто виден след остановки роста', min: 0, max: 30, step: 1, value: 13 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var grown = 0;
      var STEPS = 260;

      return {
        reset: function () { grown = 0; },
        resize: function () { grown = 0; },
        onParam: function () { grown = 0; },

        step: function () { if (grown < STEPS) grown += 1; },

        draw: function () {
          clearPaper(ctx, scene.W, scene.H);

          var P = scene.p;
          var turns = 3.4;
          var k = Math.log(P.growth) / (Math.PI * 2);
          var base = Math.min(scene.W, scene.H) * 0.030;
          var cx = scene.W * 0.5, cy = scene.H * 0.54;

          ctx.lineJoin = 'round';

          /* Раковина рисуется как след устья: на каждом шаге откладываем
             окружность нужного радиуса и соединяем края. */
          var prev = null;
          for (var i = 0; i <= grown; i++) {
            var t = (i / STEPS) * turns * Math.PI * 2;
            var r = base * Math.exp(k * t);
            var ax = cx + Math.cos(t) * r;
            var ay = cy + Math.sin(t) * r * (1 - P.lean * 0.35);
            var rad = r * P.aperture;

            if (prev) {
              /* Заливка между соседними устьями даёт тело раковины. */
              ctx.beginPath();
              ctx.moveTo(prev.x, prev.y);
              ctx.lineTo(ax, ay);
              ctx.lineWidth = rad * 2;
              ctx.strokeStyle = 'rgba(196,144,60,0.30)';
              ctx.lineCap = 'round';
              ctx.stroke();
            }
            prev = { x: ax, y: ay, r: rad };
          }

          /* Контур спирали и полосы роста поверх тела. */
          ctx.strokeStyle = 'rgba(22,24,26,0.85)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (var j = 0; j <= grown; j++) {
            var t2 = (j / STEPS) * turns * Math.PI * 2;
            var r2 = base * Math.exp(k * t2);
            var x2 = cx + Math.cos(t2) * r2;
            var y2 = cy + Math.sin(t2) * r2 * (1 - P.lean * 0.35);
            if (j === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
          }
          ctx.stroke();

          var bands = Math.round(P.bands);
          if (bands > 0) {
            ctx.strokeStyle = 'rgba(166,85,67,0.75)';
            ctx.lineWidth = 1.3;
            for (var b = 1; b <= bands; b++) {
              var frac = b / bands;
              if (frac * STEPS > grown) break;
              var tb = frac * turns * Math.PI * 2;
              var rb = base * Math.exp(k * tb);
              var xb = cx + Math.cos(tb) * rb;
              var yb = cy + Math.sin(tb) * rb * (1 - P.lean * 0.35);
              var nb = tb + Math.PI / 2;
              var lb = rb * P.aperture;
              ctx.beginPath();
              ctx.moveTo(xb - Math.cos(nb) * lb, yb - Math.sin(nb) * lb);
              ctx.lineTo(xb + Math.cos(nb) * lb, yb + Math.sin(nb) * lb);
              ctx.stroke();
            }
          }
        },

        describe: function () {
          return 'Раковина за один оборот крупнеет в ' + scene.p.growth.toFixed(2) +
            ' раза. Форма при этом не меняется — это свойство логарифмической спирали.';
        }
      };
    }
  });

  /* ============================================================= ДЮНА */

  /* Разрез вдоль ветра. Ветер срывает песчинку и роняет её дальше по ветру;
     на песке она задерживается охотнее, чем на голом месте, поэтому случайный
     бугорок ловит больше, чем теряет, и вырастает в дюну. Внизу — та же
     полоса во времени: гребни ползут по ветру, хотя каждая песчинка только
     прыгает вперёд и остаётся на месте.

     Считаем в одном измерении сознательно: в двумерной версии поперечный
     разброс размазывает гряды в равномерный шум, и урок пропадает. */
  ROY.registerSim('dunes', {
    title: 'Перенос песка',
    lead: 'Песчинка прыгает вперёд и ложится. Дюна при этом ползёт целиком.',
    params: [
      { key: 'wind',   label: 'дальность прыжка', hint: 'на сколько ветер уносит сорванную песчинку', min: 2, max: 30, step: 1, value: 10 },
      { key: 'stick',  label: 'прилипание',       hint: 'насколько охотно песчинка остаётся на песке', min: 0.1, max: 1, step: 0.01, value: 0.6, decimals: 2 },
      { key: 'repose', label: 'крутизна склона',  hint: 'какой перепад держится до схода лавины', min: 1, max: 8, step: 1, value: 3 },
      { key: 'rate',   label: 'сила ветра',       hint: 'сколько песчинок срывается за шаг', min: 10, max: 300, step: 10, value: 90 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var N = 0, h = null;
      var ROWS = 0, hist = null, rowPtr = 0, filled = 0;
      var CELL = 3;

      function alloc() {
        CELL = ROY.cell(2);
        N = Math.max(120, Math.floor(scene.W / CELL));
        ROWS = Math.max(40, Math.floor((scene.H * 0.42) / 2));
        h = new Int16Array(N);
        hist = new Uint8Array(N * ROWS);
        rowPtr = 0; filled = 0;
        seed();
      }

      function seed() {
        /* Ровный слой с еле заметной рябью: дюны обязаны вырасти сами. */
        for (var i = 0; i < N; i++) h[i] = 6 + (Math.random() < 0.5 ? 0 : 1);
      }

      function avalanche(i) {
        var lim = Math.round(scene.p.repose);
        for (var pass = 0; pass < 6; pass++) {
          var l = (i - 1 + N) % N, r = (i + 1) % N;
          if (h[i] - h[l] > lim) { h[i]--; h[l]++; i = l; }
          else if (h[i] - h[r] > lim) { h[i]--; h[r]++; i = r; }
          else return;
        }
      }

      return {
        reset: function () { alloc(); },
        resize: function () { alloc(); },
        onQuality: function () { alloc(); },

        step: function () {
          if (!h) return;
          var jump = Math.round(scene.p.wind), stick = scene.p.stick;
          var n = Math.round(scene.p.rate);

          /* Сравнивать высоту надо со средней по разрезу, а не с числом из
             начальных условий: через тысячу шагов оно уже ничего не значит. */
          var mean = 0;
          for (var q = 0; q < N; q++) mean += h[q];
          mean /= N;

          for (var s = 0; s < n; s++) {
            var x = (Math.random() * N) | 0;
            if (h[x] <= 0) continue;
            h[x]--; avalanche(x);

            var cx = x, hops = 0;
            while (hops < 25) {
              cx = (cx + jump) % N;

              /* Ветровая тень за гребнем: там песок оседает почти наверняка,
                 отчего подветренный склон получается крутым. */
              var up = h[(cx - jump + N) % N];
              var shadow = up - h[cx] > 1;
              var chance = shadow ? 0.95 : (h[cx] > mean ? 0.55 : 0.42) * (stick * 1.55);

              if (Math.random() < chance) break;
              hops++;
            }
            h[cx]++; avalanche(cx);
          }

          /* Новая строка летописи: где сейчас высоко. */
          var lo = 1e9, hi = -1e9, i;
          for (i = 0; i < N; i++) { if (h[i] < lo) lo = h[i]; if (h[i] > hi) hi = h[i]; }
          var range = Math.max(1, hi - lo);
          var base = rowPtr * N;
          for (i = 0; i < N; i++) hist[base + i] = Math.round((h[i] - lo) / range * 255);
          rowPtr = (rowPtr + 1) % ROWS;
          if (filled < ROWS) filled++;
        },

        draw: function () {
          if (!h) return;
          clearPaper(ctx, scene.W, scene.H);

          var topH = scene.H * 0.52;
          var lo = 1e9, hi = -1e9, i;
          for (i = 0; i < N; i++) { if (h[i] < lo) lo = h[i]; if (h[i] > hi) hi = h[i]; }
          var range = Math.max(1, hi - lo);

          /* Профиль-разрез. */
          ctx.beginPath();
          ctx.moveTo(0, topH);
          for (i = 0; i < N; i++) {
            var y = topH - 18 - ((h[i] - lo) / range) * (topH * 0.62);
            ctx.lineTo(i * (scene.W / N), y);
          }
          ctx.lineTo(scene.W, topH);
          ctx.closePath();
          ctx.fillStyle = 'rgba(196,144,60,0.42)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(22,24,26,0.85)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.strokeStyle = '#2545E6';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(20, 22); ctx.lineTo(84, 22);
          ctx.lineTo(76, 17); ctx.moveTo(84, 22); ctx.lineTo(76, 27);
          ctx.stroke();
          ctx.fillStyle = '#6E7278';
          ctx.font = '10px "IBM Plex Mono", monospace';
          if (scene.W > 420) ctx.fillText('ветер', 92, 26);

          /* Летопись: время вниз, гребни уезжают вправо — дюна движется. */
          var top = topH + 10;
          var hPix = scene.H - top - 4;
          var visible = Math.min(filled, ROWS);
          if (!visible) return;

          var scale = hPix / ROWS;
          var destTop = (top + hPix) - visible * scale;
          var colW = scene.W / N;

          for (var r = 0; r < visible; r++) {
            var src = (rowPtr - visible + r + ROWS) % ROWS;
            var yy = destTop + r * scale;
            for (i = 0; i < N; i++) {
              var v = hist[src * N + i] / 255;
              if (v < 0.55) continue;                 // рисуем только гребни
              ctx.fillStyle = "rgba(22,24,26," + ((v - 0.55) * 2.1).toFixed(2) + ")";
              ctx.fillRect(i * colW, yy, colW + 0.5, scale + 0.5);
            }
          }
        },

        describe: function () {
          var lo = 1e9, hi = -1e9;
          for (var i = 0; i < N; i++) { if (h[i] < lo) lo = h[i]; if (h[i] > hi) hi = h[i]; }
          return 'Разрез из ' + N + ' столбиков. Перепад высот ' + (hi - lo) +
            '. Ветер уносит песчинку на ' + Math.round(scene.p.wind) + ' столбиков.';
        }
      };
    }
  });

  /* ========================================================== САРАНЧА */

  /* Насекомые в кольцевой арене. Каждое смотрит на соседей и подстраивает
     направление. Пока их мало — движение беспорядочное; после определённой
     плотности вся арена вдруг начинает маршировать в одну сторону и время
     от времени разом разворачивается. */
  ROY.registerSim('locust', {
    title: 'Марш',
    lead: 'До порога плотности — толкотня. После — общий марш и внезапные развороты.',
    params: [
      { key: 'count', label: 'сколько особей', hint: 'плотность в арене', min: 8, max: 200, step: 2, value: 70 },
      { key: 'noise', label: 'разброд',        hint: 'насколько особь ошибается, повторяя за соседями', min: 0, max: 1, step: 0.01, value: 0.30, decimals: 2 },
      { key: "arc",   label: "сектор обзора",  hint: "какую часть кольца особь видит", min: 0.02, max: 0.5, step: 0.01, value: 0.22, decimals: 2 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var a = [];              // положение на кольце, 0..1
      var dir = [];            // направление, +1 или -1
      var trace = [];          // история среднего направления

      function build() {
        var n = ROY.count(scene.p.count);
        a = new Float32Array(n);
        dir = new Int8Array(n);
        for (var i = 0; i < n; i++) {
          a[i] = Math.random();
          dir[i] = Math.random() < 0.5 ? -1 : 1;
        }
        trace.length = 0;
      }

      return {
        reset: function () { build(); },
        resize: function () { build(); },
        onQuality: function () { build(); },
        onParam: function (key) { if (key === 'count') build(); },

        step: function () {
          var n = a.length;
          if (!n) return;
          var arc = scene.p.arc, noise = scene.p.noise;
          var next = new Int8Array(n);

          for (var i = 0; i < n; i++) {
            var sum = 0;
            for (var j = 0; j < n; j++) {
              var d = Math.abs(a[j] - a[i]);
              if (d > 0.5) d = 1 - d;              // кольцо замкнуто
              if (d <= arc) sum += dir[j];
            }
            var want = sum === 0 ? dir[i] : (sum > 0 ? 1 : -1);
            next[i] = Math.random() < noise * 0.15 ? -want : want;   /* при множителе 0,5 порядок не складывается никогда */
          }

          for (var k = 0; k < n; k++) {
            dir[k] = next[k];
            a[k] = (a[k] + dir[k] * 0.0065 + 1) % 1;   /* медленные особи не перемешиваются и застревают встречными группами */
          }

          var s = 0;
          for (var m = 0; m < n; m++) s += dir[m];
          trace.push(s / n);
          if (trace.length > 260) trace.shift();
        },

        draw: function () {
          clearPaper(ctx, scene.W, scene.H);
          var cx = scene.W * 0.5, cy = scene.H * 0.40;
          var R = Math.min(scene.W, scene.H) * 0.30;

          ctx.strokeStyle = '#B9BCB6';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

          for (var i = 0; i < a.length; i++) {
            var ang = a[i] * Math.PI * 2;
            var x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
            var tx = -Math.sin(ang) * dir[i], ty = Math.cos(ang) * dir[i];
            ctx.strokeStyle = dir[i] > 0 ? 'rgba(22,24,26,0.85)' : 'rgba(166,85,67,0.85)';
            ctx.lineWidth = 1.7;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + tx * 9, y + ty * 9);
            ctx.stroke();
          }

          /* Лента внизу: среднее направление во времени. Развороты видно
             как переходы полосы через середину. */
          var top = scene.H - 62, hh = 46;
          ctx.strokeStyle = '#E4E2DA';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(20, top + hh / 2); ctx.lineTo(scene.W - 20, top + hh / 2);
          ctx.stroke();

          if (trace.length > 1) {
            ctx.strokeStyle = '#2545E6';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            for (var t = 0; t < trace.length; t++) {
              var px = 20 + (t / (trace.length - 1)) * (scene.W - 40);
              var py = top + hh / 2 - trace[t] * hh / 2;
              if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
          }
        },

        describe: function () {
          var s = 0;
          for (var i = 0; i < a.length; i++) s += dir[i];
          var order = a.length ? Math.abs(s / a.length) : 0;
          return a.length + ' особей. Слаженность марша ' + order.toFixed(2) +
            ' из 1: единица означает, что все идут в одну сторону.';
        }
      };
    }
  });

  /* ============================================================== РОЙ */

  /* Инженерное продолжение первого урока. Дроны держат строй по тем же
     правилам, что и стая: место в фигуре плюс дистанция до соседей. Ключевое
     свойство — при отказе части аппаратов строй перестраивается сам, потому
     что командира, который мог бы «сломаться», в системе нет. */
  ROY.registerSim('swarm', {
    title: 'Строй',
    lead: 'Выключите половину дронов — фигура соберётся заново.',
    params: [
      { key: 'count',  label: 'сколько дронов', hint: 'размер роя', min: 20, max: 260, step: 5, value: 120 },
      { key: 'hold',   label: 'жёсткость строя', hint: 'насколько дрон держится своего места в фигуре', min: 0.005, max: 0.09, step: 0.001, value: 0.03, decimals: 3 },
      { key: 'keep',   label: 'дистанция',      hint: 'на каком расстоянии дроны расходятся', min: 6, max: 40, step: 1, value: 15 },
      { key: 'fail',   label: 'доля отказавших', hint: 'сколько аппаратов выключено', min: 0, max: 0.8, step: 0.01, value: 0, decimals: 2 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var d = [];
      var slots = [];
      var shape = 0;
      var timer = 0;

      function makeSlots(n) {
        slots.length = 0;
        var cx = scene.W * 0.5, cy = scene.H * 0.46;
        var R = Math.min(scene.W, scene.H) * 0.30;

        for (var i = 0; i < n; i++) {
          var t = i / n;
          if (shape === 0) {
            /* кольцо */
            slots.push([cx + Math.cos(t * Math.PI * 2) * R, cy + Math.sin(t * Math.PI * 2) * R]);
          } else if (shape === 1) {
            /* решётка */
            var side = Math.ceil(Math.sqrt(n));
            var gx = i % side, gy = (i / side) | 0;
            slots.push([cx + (gx - side / 2 + 0.5) * (R * 2 / side),
                        cy + (gy - side / 2 + 0.5) * (R * 2 / side)]);
          } else {
            /* стрела */
            var row = Math.floor((Math.sqrt(8 * i + 1) - 1) / 2);
            var idx = i - row * (row + 1) / 2;
            slots.push([cx + (idx - row / 2) * (R * 0.20),
                        cy - R * 0.7 + row * (R * 0.17)]);
          }
        }
      }

      function build() {
        d.length = 0;
        var n = ROY.count(scene.p.count);
        for (var i = 0; i < n; i++) {
          d.push({
            x: scene.W * 0.5 + (Math.random() - 0.5) * scene.W * 0.7,
            y: scene.H * 0.5 + (Math.random() - 0.5) * scene.H * 0.7,
            vx: 0, vy: 0, alive: true, slot: i
          });
        }
        makeSlots(n);
        assign();
      }

      /* Живые дроны занимают первые места фигуры — поэтому при отказе части
         аппаратов оставшиеся сами перераспределяются и фигура не рвётся. */
      function assign() {
        var live = [];
        for (var i = 0; i < d.length; i++) if (d[i].alive) live.push(i);
        makeSlots(Math.max(1, live.length));
        for (var k = 0; k < live.length; k++) d[live[k]].slot = k;
      }

      return {
        reset: function () { shape = 0; timer = 0; build(); },
        resize: function () { build(); },
        onQuality: function () { build(); },

        onParam: function (key) {
          if (key === 'count') { build(); return; }
          if (key === 'fail') {
            var n = d.length;
            var off = Math.round(n * scene.p.fail);
            for (var i = 0; i < n; i++) d[i].alive = i >= off;
            assign();
          }
        },

        step: function () {
          timer++;
          /* Фигура меняется сама раз в несколько секунд. */
          if (timer % 420 === 0) { shape = (shape + 1) % 3; assign(); }

          var hold = scene.p.hold, keep = scene.p.keep, keep2 = keep * keep;

          for (var i = 0; i < d.length; i++) {
            var a = d[i];
            if (!a.alive) continue;

            var s = slots[a.slot] || slots[0];
            if (s) {
              a.vx += (s[0] - a.x) * hold;
              a.vy += (s[1] - a.y) * hold;
            }

            for (var j = 0; j < d.length; j++) {
              if (j === i || !d[j].alive) continue;
              var dx = d[j].x - a.x, dy = d[j].y - a.y;
              var dist2 = dx * dx + dy * dy;
              if (dist2 > keep2 || dist2 < 0.01) continue;
              var dd = Math.sqrt(dist2);
              a.vx -= dx / dd * 0.20;
              a.vy -= dy / dd * 0.20;
            }

            a.vx *= 0.86; a.vy *= 0.86;      // демпфирование, иначе строй звенит
            a.x += a.vx; a.y += a.vy;
          }
        },

        draw: function () {
          clearPaper(ctx, scene.W, scene.H);

          ctx.fillStyle = 'rgba(185,188,182,0.55)';
          for (var s = 0; s < slots.length; s++) {
            ctx.fillRect(slots[s][0] - 1, slots[s][1] - 1, 2, 2);
          }

          for (var i = 0; i < d.length; i++) {
            var a = d[i];
            if (!a.alive) {
              ctx.strokeStyle = 'rgba(185,188,182,0.8)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a.x - 3, a.y - 3); ctx.lineTo(a.x + 3, a.y + 3);
              ctx.moveTo(a.x + 3, a.y - 3); ctx.lineTo(a.x - 3, a.y + 3);
              ctx.stroke();
              continue;
            }
            ctx.fillStyle = 'rgba(22,24,26,0.88)';
            ctx.beginPath();
            ctx.arc(a.x, a.y, 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
        },

        describe: function () {
          var live = 0, err = 0;
          for (var i = 0; i < d.length; i++) {
            if (!d[i].alive) continue;
            live++;
            var s = slots[d[i].slot];
            if (s) err += Math.abs(s[0] - d[i].x) + Math.abs(s[1] - d[i].y);
          }
          return 'В строю ' + live + ' из ' + d.length +
            '. Среднее отклонение от места ' + (live ? (err / live).toFixed(1) : '0') + ' точек.';
        }
      };
    }
  });

})(window);
