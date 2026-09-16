/* РОЙ · симуляции, часть пятая
   ------------------------------------------------------------------
   Плоское дно облака, пламя свечи, ручеёк по стеклу, мыльная плёнка.
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

  /* ============================================================ ОБЛАКО */

  /* Поднимаясь, воздух расширяется и остывает — всегда с одной и той же
     скоростью. Значит, высота, на которой пар превращается в капли, зависит
     только от того, что было у земли. У всех струй условия одинаковые, поэтому
     и порог один — отсюда идеально ровное дно облака. */
  ROY.registerSim('clouds', {
    title: 'Уровень конденсации',
    lead: 'Облако начинается ровно на той высоте, где воздух остыл до точки росы.',
    params: [
      { key: 'humid', label: 'влажность у земли', hint: 'чем влажнее, тем ниже начинается облако', min: 0.15, max: 0.95, step: 0.01, value: 0.55, decimals: 2 },
      { key: 'warm',  label: 'прогрев земли',     hint: 'сила восходящих струй', min: 0.2, max: 2, step: 0.02, value: 1, decimals: 2 },
      { key: 'wind',  label: 'ветер',             hint: 'сносит облако вбок', min: -1, max: 1, step: 0.02, value: 0.2, decimals: 2 },
      { key: 'gusts', label: 'неровность прогрева', hint: 'насколько струи отличаются друг от друга', min: 0, max: 1, step: 0.01, value: 0.35, decimals: 2 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var p = [];
      var LCL = 0;

      function level() {
        /* Уровень конденсации: чем влажнее у земли, тем он ниже.
           Одинаков для всех струй — в этом весь урок. */
        LCL = scene.H * (0.86 - scene.p.humid * 0.55);
      }

      function spawn() {
        return {
          x: Math.random() * scene.W,
          y: scene.H - 4,
          vy: -(0.5 + Math.random() * 0.5) * scene.p.warm,
          vx: (Math.random() - 0.5) * 0.3,
          /* Разброс струй по силе — но не по уровню конденсации. */
          gust: 1 + (Math.random() - 0.5) * scene.p.gusts,
          life: 0, r: 4 + Math.random() * 7
        };
      }

      function build() {
        p.length = 0;
        var n = ROY.count(240, 60);
        for (var i = 0; i < n; i++) {
          var q = spawn();
          q.y = scene.H - Math.random() * scene.H * 0.9;
          p.push(q);
        }
      }

      return {
        reset: function () { level(); build(); },
        resize: function () { level(); build(); },
        onQuality: function () { build(); },
        onParam: function (key) { if (key === 'humid') level(); },

        step: function () {
          var wind = scene.p.wind;
          for (var i = 0; i < p.length; i++) {
            var q = p[i];
            q.life++;

            var condensed = q.y < LCL;

            /* Выше уровня конденсации выделяется тепло, и струя ускоряется —
               поэтому у кучевого облака бугристый верх и ровное дно. */
            q.vy -= (condensed ? 0.012 : 0.004) * q.gust * scene.p.warm;
            q.vx += wind * 0.010 + (Math.random() - 0.5) * (condensed ? 0.06 : 0.02);
            q.vx *= 0.99; q.vy *= 0.992;

            q.x += q.vx; q.y += q.vy;
            if (condensed) q.r += 0.05;

            if (q.y < scene.H * 0.06 || q.life > 900 || q.x < -40 || q.x > scene.W + 40) {
              p[i] = spawn();
            }
          }
        },

        draw: function () {
          clearPaper(ctx, scene.W, scene.H);

          ctx.fillStyle = 'rgba(110,114,120,0.10)';
          ctx.fillRect(0, scene.H - 10, scene.W, 10);

          for (var i = 0; i < p.length; i++) {
            var q = p[i];
            if (q.y < LCL) {
              /* Капли: видимая часть облака. */
              ctx.fillStyle = 'rgba(110,114,120,0.16)';
              ctx.beginPath();
              ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
              ctx.fill();
            } else {
              /* Ниже уровня пар прозрачен — рисуем еле заметный штрих,
                 чтобы было видно: воздух поднимается и там. */
              ctx.strokeStyle = 'rgba(185,188,182,0.5)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(q.x, q.y);
              ctx.lineTo(q.x - q.vx * 4, q.y - q.vy * 4);
              ctx.stroke();
            }
          }

          ctx.strokeStyle = 'rgba(37,69,230,0.55)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          ctx.moveTo(0, LCL); ctx.lineTo(scene.W, LCL);
          ctx.stroke();
          ctx.setLineDash([]);

          if (scene.W > 420) {
            ctx.fillStyle = '#2545E6';
            ctx.font = '10px "IBM Plex Mono", monospace';
            ctx.fillText('уровень конденсации', 8, LCL - 6);
          }
        },

        describe: function () {
          var up = 0;
          for (var i = 0; i < p.length; i++) if (p[i].y < LCL) up++;
          return 'Уровень конденсации на высоте ' + Math.round(scene.H - LCL) +
            ' точек над землёй. В облаке сейчас ' + up + ' струй из ' + p.length + '.';
        }
      };
    }
  });

  /* ============================================================= ПЛАМЯ */

  /* Горячий газ легче холодного и поднимается, а по бокам к нему подсасывается
     свежий воздух. Поток сужается кверху — отсюда каплевидная форма, одна и та
     же у любой свечи. Форму задаёт не горение, а тяга. */
  ROY.registerSim('flame', {
    title: 'Тяга',
    lead: 'Форму пламени задаёт не горение, а подъём горячего газа.',
    params: [
      { key: 'draft',  label: 'тяга',       hint: 'насколько сильно горячий газ рвётся вверх', min: 0.2, max: 2.4, step: 0.02, value: 1, decimals: 2 },
      { key: 'intake', label: 'приток воздуха', hint: 'как сильно по бокам подсасывается холодный воздух', min: 0, max: 2, step: 0.02, value: 0.9, decimals: 2 },
      { key: 'wick',   label: 'фитиль',     hint: 'ширина основания пламени', min: 2, max: 26, step: 1, value: 11 },
      { key: 'breeze', label: 'сквозняк',   hint: 'боковой поток воздуха', min: -1, max: 1, step: 0.02, value: 0, decimals: 2 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var p = [];

      function baseY() { return scene.H * 0.86; }

      function spawn() {
        /* Фитиль задан в долях сцены: на маленьком холсте пламя иначе
           вырождается в нитку. */
        var w = scene.p.wick * (Math.min(scene.W, scene.H) / 260);
        return {
          x: scene.W * 0.5 + (Math.random() - 0.5) * w,
          y: baseY() + Math.random() * 4,
          vx: 0, vy: 0,
          heat: 0.8 + Math.random() * 0.2
        };
      }

      function build() {
        p.length = 0;
        var n = ROY.count(420, 90);
        for (var i = 0; i < n; i++) p.push(spawn());
      }

      return {
        reset: function () { build(); },
        resize: function () { build(); },
        onQuality: function () { build(); },

        step: function () {
          var draft = scene.p.draft, intake = scene.p.intake;
          var cx = scene.W * 0.5, by = baseY();

          for (var i = 0; i < p.length; i++) {
            var q = p[i];

            /* Подъёмная сила пропорциональна температуре: остывший газ
               перестаёт подниматься и уходит в стороны. */
            q.vy -= q.heat * draft * 0.055;

            var dx = cx - q.x;
            var h = Math.max(0, (by - q.y)) / Math.max(1, by);

            /* Ширину у основания задаёт фитиль, а не выдуманное расширение:
               попытка расталкивать газ у корня разрывает пламя надвое.
               Кверху приток холодного воздуха поджимает поток — квадрат по
               высоте оставляет низ широким, а верх сводит в остриё. */
            q.vx += dx * intake * 0.020 * h * h;

            /* Дрожание тем сильнее, чем выше: отсюда живой кончик пламени. */
            q.vx += scene.p.breeze * 0.03 + (Math.random() - 0.5) * (0.02 + h * 0.10);
            q.vx *= 0.93; q.vy *= 0.94;

            q.x += q.vx; q.y += q.vy;
            q.heat -= 0.007 + h * 0.004;   /* медленнее остывает — пламя выше и заметнее */

            if (q.heat <= 0.05 || q.y < scene.H * 0.05) p[i] = spawn();
          }
        },

        draw: function () {
          clearPaper(ctx, scene.W, scene.H);

          var by = baseY();

          /* Свеча. */
          ctx.fillStyle = 'rgba(185,188,182,0.55)';
          ctx.fillRect(scene.W * 0.5 - 16, by + 4, 32, scene.H - by - 4);
          ctx.strokeStyle = 'rgba(22,24,26,0.7)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(scene.W * 0.5, by + 12);
          ctx.lineTo(scene.W * 0.5, by - 2);
          ctx.stroke();

          for (var i = 0; i < p.length; i++) {
            var q = p[i];
            if (q.heat <= 0.05) continue;
            /* Горячее ядро — охра, остывающий край — серые чернила. */
            var hot = Math.max(0, Math.min(1, q.heat));
            ctx.fillStyle = hot > 0.45
              ? 'rgba(196,144,60,' + (hot * 0.30).toFixed(3) + ')'
              : 'rgba(110,114,120,' + (hot * 0.22).toFixed(3) + ')';
            ctx.beginPath();
            ctx.arc(q.x, q.y, 3 + (1 - hot) * 7, 0, Math.PI * 2);
            ctx.fill();
          }
        },

        describe: function () {
          var top = scene.H, cnt = 0;
          for (var i = 0; i < p.length; i++) { if (p[i].y < top) top = p[i].y; cnt++; }
          return 'Высота пламени ' + Math.round(scene.H * 0.86 - top) +
            ' точек при тяге ' + scene.p.draft.toFixed(2) + ' и притоке воздуха ' +
            scene.p.intake.toFixed(2) + '.';
        }
      };
    }
  });

  /* =========================================================== РУЧЕЁК */

  /* Капля катится вниз и оставляет мокрый след. Следующая капля охотнее идёт
     по мокрому — сопротивление там меньше. Поэтому случайная первая дорожка
     становится руслом, а стекло разлиновывается несколькими ручейками вместо
     равномерной плёнки. */
  ROY.registerSim('rivulet', {
    title: 'Мокрый след',
    lead: 'Вода не растекается ровно: она выбирает уже мокрое.',
    params: [
      { key: 'rough',  label: 'неровность стекла', hint: 'насколько поверхность сбивает каплю в сторону', min: 0, max: 1, step: 0.01, value: 0.42, decimals: 2 },
      { key: 'memory', label: 'память следа',      hint: 'как долго держится мокрая дорожка', min: 0.9, max: 0.9995, step: 0.0005, value: 0.995, decimals: 4 },
      { key: 'follow', label: 'тяга к мокрому',    hint: 'насколько капля предпочитает мокрый путь', min: 0, max: 1, step: 0.01, value: 0.62, decimals: 2 },
      { key: 'drops',  label: 'поток капель',      hint: 'сколько капель идёт одновременно', min: 4, max: 90, step: 2, value: 34 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var GW = 0, GH = 0, CELL = 3;
      var wet = null;
      var drops = [];
      var off = null, octx = null, img = null, buf = null;

      function alloc() {
        CELL = ROY.cell(3);
        GW = Math.max(60, Math.floor(scene.W / CELL));
        GH = Math.max(45, Math.floor(scene.H / CELL));
        wet = new Float32Array(GW * GH);
        off = document.createElement('canvas');
        off.width = GW; off.height = GH;
        octx = off.getContext('2d');
        img = octx.createImageData(GW, GH);
        buf = img.data;
        build();
      }

      function build() {
        drops.length = 0;
        var n = Math.round(scene.p.drops);
        for (var i = 0; i < n; i++) {
          drops.push({ x: Math.random() * GW, y: Math.random() * GH * 0.3 });
        }
      }

      function sample(x, y) {
        var gx = Math.round(x), gy = Math.round(y);
        if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return 0;
        return wet[gy * GW + gx];
      }

      return {
        reset: function () { alloc(); },
        resize: function () { alloc(); },
        onQuality: function () { alloc(); },
        onParam: function (key) { if (key === 'drops') build(); },

        step: function () {
          if (!wet) return;
          var i, n = GW * GH;
          var decay = scene.p.memory;
          for (i = 0; i < n; i++) wet[i] *= decay;

          var rough = scene.p.rough, follow = scene.p.follow;

          for (i = 0; i < drops.length; i++) {
            var d = drops[i];

            /* Три пробы: вниз-влево, вниз, вниз-вправо. Капля идёт туда,
               где мокрее, плюс случайный толчок от неровности стекла. */
            var best = 0, bestV = -1;
            for (var s = -1; s <= 1; s++) {
              var v = sample(d.x + s, d.y + 1) * follow + Math.random() * rough * 0.5;
              if (v > bestV) { bestV = v; best = s; }
            }

            d.x += best * 0.9;
            d.y += 1;

            if (d.x < 0) d.x = 0; if (d.x > GW - 1) d.x = GW - 1;

            var gx = Math.round(d.x), gy = Math.round(d.y);
            if (gx >= 0 && gy >= 0 && gx < GW && gy < GH) {
              wet[gy * GW + gx] = Math.min(1.4, wet[gy * GW + gx] + 0.55);
              if (gx > 0) wet[gy * GW + gx - 1] = Math.min(1.2, wet[gy * GW + gx - 1] + 0.18);
              if (gx < GW - 1) wet[gy * GW + gx + 1] = Math.min(1.2, wet[gy * GW + gx + 1] + 0.18);
            }

            if (d.y >= GH - 1) { d.y = 0; d.x = Math.random() * GW; }
          }
        },

        draw: function () {
          if (!buf) return;
          var n = GW * GH;
          for (var i = 0; i < n; i++) inkAt(buf, i, Math.min(0.7, wet[i] * 0.55));
          octx.putImageData(img, 0, 0);
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(off, 0, 0, scene.W, scene.H);

          ctx.fillStyle = 'rgba(37,69,230,0.85)';
          for (var k = 0; k < drops.length; k++) {
            ctx.beginPath();
            ctx.arc(drops[k].x * CELL, drops[k].y * CELL, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        },

        describe: function () {
          var n = GW * GH, c = 0;
          for (var i = 0; i < n; i++) if (wet[i] > 0.25) c++;
          return 'Мокрая площадь ' + (c / n * 100).toFixed(1) +
            '% при ' + drops.length + ' каплях. Память следа ' + scene.p.memory.toFixed(4) + '.';
        }
      };
    }
  });

  /* ====================================================== МЫЛЬНАЯ ПЛЁНКА */

  /* Плёнка тянет каждый узел к соседям одинаково сильно — ей всё равно, как
     далеко до них. Поэтому равновесие наступает там, где три тяги уравновешены,
     а это возможно только при углах в 120 градусов. Сеть получается кратчайшей
     из возможных — сама, без вычислений. */
  ROY.registerSim('soapfilm', {
    title: 'Кратчайшая сеть',
    lead: 'Плёнка не считает длину. Она просто тянет — и выходит минимум.',
    params: [
      { key: 'pins',  label: 'сколько опор', hint: 'между какими точками натянута плёнка', min: 3, max: 8, step: 1, value: 4 },
      { key: 'pull',  label: 'натяжение',    hint: 'как быстро плёнка стягивается', min: 0.02, max: 0.6, step: 0.01, value: 0.22, decimals: 2 },
      { key: 'spin',  label: 'поворот опор', hint: 'разворачивает расстановку опор', min: 0, max: 6.28, step: 0.02, value: 0.3, decimals: 2 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var pins = [], nodes = [], edges = [];

      function build() {
        var K = Math.round(scene.p.pins);
        var cx = scene.W * 0.5, cy = scene.H * 0.5;
        var R = Math.min(scene.W, scene.H) * 0.34;

        pins = [];
        for (var i = 0; i < K; i++) {
          var a = scene.p.spin + (i / K) * Math.PI * 2;
          pins.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R });
        }

        /* Топология Штейнера «цепочкой»: K опор соединяются через K-2
           подвижных узла. Именно на таких узлах и появляются углы по 120°. */
        nodes = [];
        edges = [];
        var M = Math.max(1, K - 2);
        for (var m = 0; m < M; m++) {
          nodes.push({
            x: cx + (Math.random() - 0.5) * R * 0.4,
            y: cy + (Math.random() - 0.5) * R * 0.4
          });
        }

        edges.push([{ p: 0 }, { n: 0 }]);
        edges.push([{ p: 1 }, { n: 0 }]);
        for (var j = 0; j < M - 1; j++) {
          edges.push([{ n: j }, { n: j + 1 }]);
          edges.push([{ p: j + 2 }, { n: j + 1 }]);
        }
        edges.push([{ p: K - 1 }, { n: M - 1 }]);
      }

      function pos(ref) { return ref.p !== undefined ? pins[ref.p] : nodes[ref.n]; }

      return {
        reset: function () { build(); },
        resize: function () { build(); },
        onParam: function () { build(); },

        step: function () {
          if (!nodes.length) return;
          var pull = scene.p.pull;

          /* Каждый подвижный узел тянется к соседям с одинаковой силой,
             независимо от расстояния: это и есть постоянное натяжение плёнки. */
          for (var i = 0; i < nodes.length; i++) {
            var sx = 0, sy = 0, cnt = 0;
            for (var e = 0; e < edges.length; e++) {
              var a = edges[e][0], b = edges[e][1];
              var other = null;
              if (a.n === i) other = pos(b);
              else if (b.n === i) other = pos(a);
              if (!other) continue;
              var dx = other.x - nodes[i].x, dy = other.y - nodes[i].y;
              var d = Math.sqrt(dx * dx + dy * dy) || 1;
              sx += dx / d; sy += dy / d;      // единичный вектор — сила не зависит от длины
              cnt++;
            }
            if (!cnt) continue;
            nodes[i].x += sx * pull * 2.2;
            nodes[i].y += sy * pull * 2.2;
          }
        },

        draw: function () {
          clearPaper(ctx, scene.W, scene.H);

          ctx.strokeStyle = 'rgba(37,69,230,0.75)';
          ctx.lineWidth = 2.2;
          ctx.lineCap = 'round';
          for (var e = 0; e < edges.length; e++) {
            var a = pos(edges[e][0]), b = pos(edges[e][1]);
            if (!a || !b) continue;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }

          ctx.fillStyle = '#16181A';
          for (var i = 0; i < pins.length; i++) {
            ctx.beginPath();
            ctx.arc(pins[i].x, pins[i].y, 5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = '#A65543';
          for (var k = 0; k < nodes.length; k++) {
            ctx.beginPath();
            ctx.arc(nodes[k].x, nodes[k].y, 3.4, 0, Math.PI * 2);
            ctx.fill();
          }
        },

        describe: function () {
          var total = 0;
          for (var e = 0; e < edges.length; e++) {
            var a = pos(edges[e][0]), b = pos(edges[e][1]);
            if (!a || !b) continue;
            total += Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
          }
          return 'Опор ' + pins.length + ', подвижных узлов ' + nodes.length +
            '. Общая длина плёнки ' + Math.round(total) + ' точек.';
        }
      };
    }
  });

})(window);
