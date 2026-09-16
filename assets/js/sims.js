/* РОЙ · симуляции
   ------------------------------------------------------------------
   Пять систем, каждая рисуется чернилами по бумаге. Ни одна анимация не
   проиграна по таймлайну: всё, что движется, вычисляется каждый шаг из правил,
   поэтому одна и та же сцена никогда не повторяется дважды.

   Каждая симуляция отдаёт:
     params   — что можно крутить, человеческим языком
     create   — фабрика: reset / step / draw / (resize, onParam, onQuality, describe)
*/
(function (window) {
  'use strict';

  var ROY = window.ROY;

  var PAPER = '#FBFAF6';
  var PAPER_RGB = [251, 250, 246];
  var INK_RGB = [28, 31, 34];

  /* Детерминированный генератор: без него сохранённый опыт не открылся бы
     таким же, каким его сохранили. */
  function rng(seed) {
    var s = (seed | 0) || 1;
    return function () {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };
  }

  function clearPaper(ctx, W, H) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
  }

  /* ================================================================= СТАЯ */

  ROY.registerSim('boids', {
    title: 'Мурмурация',
    lead: 'У стаи нет вожака. Каждая птица видит примерно семерых соседей и выполняет три правила.',
    params: [
      { key: 'sep',   label: 'дистанция',      hint: 'на сколько птица отталкивается от соседа', min: 5, max: 60, step: 1, value: 14 },
      { key: 'ali',   label: 'выравнивание',   hint: 'насколько сильно птица подстраивает направление под соседей', min: 0, max: 1, step: 0.01, value: 0.7, decimals: 2 },
      { key: 'coh',   label: 'сплочённость',   hint: 'насколько птица тянется к центру своих соседей', min: 0, max: 1, step: 0.01, value: 0.75, decimals: 2 },
      { key: 'view',  label: 'радиус обзора',  hint: 'как далеко птица вообще видит', min: 10, max: 120, step: 1, value: 115 },
      { key: 'fear',  label: 'страх курсора',  hint: 'курсор работает как ястреб', min: 0, max: 3, step: 0.05, value: 1.5, decimals: 2 },
      { key: 'count', label: 'количество',     hint: 'сколько птиц в стае', min: 50, max: 3000, step: 20, value: 600 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;

      var SEP_W = 1.15, MAXFORCE = 0.28, K = 7;
      /* Клетки обходим начиная со своей, а не с угла: ближайшие соседи почти
         всегда лежат в ней же. Порядок важен из-за потолка ниже — с обходом
         от угла потолок отсекал соседей всегда с одной стороны, симметрия
         ломалась, и стая схлопывалась в комок вместо того, чтобы держать
         дистанцию. Проверено: разброс падал с 224 пикселей до 31.

         Потолок нужен, чтобы цена кадра не зависела от плотности: соседей
         всё равно берём семь ближайших, и восьмидесяти просмотренных для
         этого с запасом. */
      var CELL_ORDER = [0,0, -1,0, 1,0, 0,-1, 0,1, -1,-1, 1,-1, -1,1, 1,1];
      var CAND_MAX = 80;
      var WANDER = 0.022, WANDER_DRIFT = 0.17;
      var HOME = 0.85, HOME_R = 0, LONELY = 0.25, FEAR_R = 140;
      /* Где висит насест по вертикали. На узком портретном холсте стая уходит
         выше, иначе она садится ровно на заголовок и текст не прочитать. */
      function homeY() {
        if (scene.opts && scene.opts.homeY) return scene.opts.homeY;
        return scene.H > scene.W * 1.1 ? 0.27 : 0.5;
      }

      /* На портретном холсте стая ещё и поджимается, чтобы не задевать текст. */
      function roostR() {
        return Math.min(scene.W, scene.H) * (scene.H > scene.W * 1.1 ? 0.30 : 0.40);
      }
      var TRAIL = 0.055;

      var boids = [], seedA = Math.random() * Math.PI * 2;
      var cell = 64, cols = 1, rows = 1, heads = null, nextIdx = null;
      var nd = new Float32Array(K), ni = new Int32Array(K);
      var cx0 = 0, cy0 = 0;
      var mouse = { x: -9999, y: -9999, on: false };

      /* Сборка в буквы. morphMix ведёт страница по прокрутке: 0 — обычная
         стая, 1 — птицы стоят по контуру надписи. Промежуточные значения
         дают именно то, что нужно: стая ещё живая, но уже читается. */
      var targets = null, morphMix = 0;

      /* Собственное время сцены: гоняет покачивание птиц в собранной надписи.
         Считаем в шагах, а не в миллисекундах, — шаг физики фиксирован. */
      var tick = 0;
      var WOBBLE = 1.7;      // пикселей, радиус личного круга вокруг своей точки

      function targetCount() {
        return Math.max(40, ROY.count(scene.p.count));
      }

      /* Скорость обязана зависеть от размера сцены. В пикселях за шаг она
         постоянна, и на миниатюре 290×180 птица пересекает холст за секунду:
         удерживающие силы не успевают её развернуть, и стая разлетается по
         углам. На большом холсте те же числа выглядят спокойно. */
      function speedScale() {
        var k = Math.min(scene.W, scene.H) / 700;
        return k < 0.34 ? 0.34 : k > 1.2 ? 1.2 : k;
      }

      function makeBoid() {
        /* Спавним по всему насесту, а не тесным узлом. Узел выглядел
           безобиднее, но стоил дорого: две с половиной тысячи птиц в круге
           радиусом в сотню пикселей — это сотни соседей в каждой клетке
           сетки, и первые кадры страницы обходились в 42 мс вместо восьми.
           Именно это и дёргалось при входе на главную. */
        var R = roostR() * 0.92;
        var t = Math.random() * Math.PI * 2;
        var r = Math.sqrt(Math.random()) * R;
        var a = seedA + (Math.random() - 0.5) * 1.1;
        var s = (3.0 + Math.random() * 1.1) * speedScale();
        return {
          x: scene.W * 0.5 + Math.cos(t) * r,
          y: scene.H * homeY() + Math.sin(t) * r,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          max: s, min: s * 0.55,
          wa: Math.random() * Math.PI * 2,
          /* Своя фаза для покачивания в собранной надписи: без неё все птицы
             качались бы в такт и буква ездила бы целиком. */
          ph: Math.random() * Math.PI * 2,
          g: (Math.random() * 3) | 0
        };
      }

      function setCount(n) {
        while (boids.length < n) boids.push(makeBoid());
        if (boids.length > n) boids.length = n;
        nextIdx = new Int32Array(boids.length);
      }

      function grid() {
        cell = Math.max(24, scene.p.view);
        cols = Math.ceil(scene.W / cell) + 1;
        rows = Math.ceil(scene.H / cell) + 1;
        heads = new Int32Array(cols * rows);
        if (!nextIdx || nextIdx.length !== boids.length) nextIdx = new Int32Array(boids.length);
      }

      scene.canvas.addEventListener('mousemove', function (e) {
        var r = scene.canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
      });
      scene.canvas.addEventListener('mouseleave', function () { mouse.on = false; });
      scene.canvas.addEventListener('touchmove', function (e) {
        var t = e.touches[0]; if (!t) return;
        var r = scene.canvas.getBoundingClientRect();
        mouse.x = t.clientX - r.left; mouse.y = t.clientY - r.top; mouse.on = true;
      }, { passive: true });
      scene.canvas.addEventListener('touchend', function () { mouse.on = false; });

      return {
        reset: function () {
          seedA = Math.random() * Math.PI * 2;
          boids.length = 0;
          HOME_R = roostR();
          setCount(targetCount());
          grid();
          clearPaper(ctx, scene.W, scene.H);
        },

        resize: function () {
          HOME_R = roostR();

          /* Сцена изменила размер — пересчитываем темп, иначе после поворота
             планшета стая начнёт вести себя как на другом холсте. */
          var sc = speedScale();
          for (var i = 0; i < boids.length; i++) {
            var base = (3.0 + Math.random() * 1.1) * sc;
            boids[i].max = base;
            boids[i].min = base * 0.55;
          }

          grid();
          clearPaper(ctx, scene.W, scene.H);
        },

        onQuality: function () { setCount(targetCount()); grid(); },

        onParam: function (key) {
          if (key === 'view') grid();
          if (key === 'count') { setCount(targetCount()); grid(); }
        },

        step: function () {
          var n = boids.length, i, j, P = scene.p;
          if (!n || !heads) return;

          /* Медленно: полный оборот покачивания примерно за пять секунд. */
          tick += 0.021;

          /* В собранной надписи силы стаи умножаются почти на ноль, а поиск
             соседей — самая дорогая часть шага: раскладка по сетке плюс
             перебор девяти клеток на птицу. Считать всё это, чтобы потом
             домножить на 0.04, незачем. Отсюда и берётся запас, за счёт
             которого птиц в надписи вдвое больше при той же цене кадра. */
          var skipFlock = morphMix > 0.96;

          if (!skipFlock) {
          heads.fill(-1);
          for (i = 0; i < n; i++) {
            var b0 = boids[i];
            var ax0 = (b0.x / cell) | 0, ay0 = (b0.y / cell) | 0;
            if (ax0 < 0) ax0 = 0; else if (ax0 >= cols) ax0 = cols - 1;
            if (ay0 < 0) ay0 = 0; else if (ay0 >= rows) ay0 = rows - 1;
            var ci = ay0 * cols + ax0;
            nextIdx[i] = heads[ci];
            heads[ci] = i;
          }
          }

          var view2 = P.view * P.view, sep2 = P.sep * P.sep;

          for (i = 0; i < n; i++) {
            var b = boids[i];
            var bcx = (b.x / cell) | 0, bcy = (b.y / cell) | 0;
            if (bcx < 0) bcx = 0; else if (bcx >= cols) bcx = cols - 1;
            if (bcy < 0) bcy = 0; else if (bcy >= rows) bcy = rows - 1;

            var found = 0;
            var seen = 0;

            /* Потолок на число просмотренных кандидатов. Соседей всё равно
               берём семь ближайших, и полсотни просмотренных для этого с
               запасом. Без потолка цена кадра зависит от плотности стаи: стоит
               ей сбиться в комок — хоть на старте, хоть от ползунка
               «сплочённость» на максимуме, — и кадр дорожает в разы. */
            if (!skipFlock)
            scan:
            for (var c9 = 0; c9 < 18; c9 += 2) {
              var yy = bcy + CELL_ORDER[c9 + 1]; if (yy < 0 || yy >= rows) continue;
              var xx = bcx + CELL_ORDER[c9];     if (xx < 0 || xx >= cols) continue;
              {
                for (j = heads[yy * cols + xx]; j !== -1; j = nextIdx[j]) {
                  if (j === i) continue;
                  if (++seen > CAND_MAX) break scan;
                  var o = boids[j];
                  var dx = o.x - b.x, dy = o.y - b.y;
                  var d2 = dx * dx + dy * dy;
                  if (d2 > view2) continue;

                  /* Семь ближайших соседей — это топологическая модель:
                     скворец следит за фиксированным числом птиц, а не за всеми,
                     кто попал в круг. Поэтому стая не рвётся при разрежении. */
                  if (found < K) {
                    var p = found++;
                    while (p > 0 && nd[p - 1] > d2) { nd[p] = nd[p - 1]; ni[p] = ni[p - 1]; p--; }
                    nd[p] = d2; ni[p] = j;
                  } else if (d2 < nd[K - 1]) {
                    var q = K - 1;
                    while (q > 0 && nd[q - 1] > d2) { nd[q] = nd[q - 1]; ni[q] = ni[q - 1]; q--; }
                    nd[q] = d2; ni[q] = j;
                  }
                }
              }
            }

            var sx = 0, sy = 0, avx = 0, avy = 0, gx = 0, gy = 0;

            for (var t = 0; t < found; t++) {
              var o2 = boids[ni[t]];
              var d2b = nd[t];
              if (d2b < sep2 && d2b > 0.0001) {
                var d = Math.sqrt(d2b), w = (P.sep - d) / P.sep;
                sx += (b.x - o2.x) / d * w; sy += (b.y - o2.y) / d * w;
              }
              avx += o2.vx; avy += o2.vy;
              gx += o2.x; gy += o2.y;
            }

            var fx = 0, fy = 0, m, dvx, dvy, lm, maxS = b.max;

            if (sx !== 0 || sy !== 0) {
              m = Math.sqrt(sx * sx + sy * sy);
              dvx = sx / m * maxS - b.vx; dvy = sy / m * maxS - b.vy;
              lm = Math.sqrt(dvx * dvx + dvy * dvy);
              if (lm > MAXFORCE) { dvx = dvx / lm * MAXFORCE; dvy = dvy / lm * MAXFORCE; }
              fx += dvx * SEP_W; fy += dvy * SEP_W;
            }

            if (found > 0) {
              if (P.ali > 0 && (avx !== 0 || avy !== 0)) {
                m = Math.sqrt(avx * avx + avy * avy);
                dvx = avx / m * maxS - b.vx; dvy = avy / m * maxS - b.vy;
                lm = Math.sqrt(dvx * dvx + dvy * dvy);
                if (lm > MAXFORCE) { dvx = dvx / lm * MAXFORCE; dvy = dvy / lm * MAXFORCE; }
                fx += dvx * P.ali; fy += dvy * P.ali;
              }
              if (P.coh > 0) {
                var tx = gx / found - b.x, ty = gy / found - b.y;
                if (tx !== 0 || ty !== 0) {
                  m = Math.sqrt(tx * tx + ty * ty);
                  dvx = tx / m * maxS - b.vx; dvy = ty / m * maxS - b.vy;
                  lm = Math.sqrt(dvx * dvx + dvy * dvy);
                  if (lm > MAXFORCE) { dvx = dvx / lm * MAXFORCE; dvy = dvy / lm * MAXFORCE; }
                  fx += dvx * P.coh; fy += dvy * P.coh;
                }
              }
            } else if (cx0 !== 0 || cy0 !== 0) {
              /* Птица без соседей иначе уходит навсегда и стая расползается.
                 Настоящий скворец видит облако целиком — просто взаимодействует
                 с семью ближайшими. */
              var lx = cx0 - b.x, ly = cy0 - b.y;
              var lg = Math.sqrt(lx * lx + ly * ly);
              if (lg > 1) {
                dvx = lx / lg * maxS - b.vx; dvy = ly / lg * maxS - b.vy;
                lm = Math.sqrt(dvx * dvx + dvy * dvy);
                if (lm > MAXFORCE) { dvx = dvx / lm * MAXFORCE; dvy = dvy / lm * MAXFORCE; }
                fx += dvx * LONELY; fy += dvy * LONELY;
              }
            }

            if (mouse.on && P.fear > 0) {
              var px = b.x - mouse.x, py = b.y - mouse.y;
              var pd2 = px * px + py * py;
              if (pd2 < FEAR_R * FEAR_R && pd2 > 0.01) {
                var pd = Math.sqrt(pd2), pw = (FEAR_R - pd) / FEAR_R;
                dvx = px / pd * maxS - b.vx; dvy = py / pd * maxS - b.vy;
                lm = Math.sqrt(dvx * dvx + dvy * dvy);
                if (lm > MAXFORCE) { dvx = dvx / lm * MAXFORCE; dvy = dvy / lm * MAXFORCE; }
                var pf = P.fear * pw * 2.6;
                fx += dvx * pf; fy += dvy * pf;
              }
            }

            /* Насест: круговое удержание мягче прямоугольных стен, у которых
               стая слипается в углу. Скворцы и правда кружат над одним местом.
               Центр насеста сдвигается через opts.homeY — на узком экране стая
               уходит вверх, чтобы не наезжать на заголовок. */
            var hx = scene.W * 0.5 - b.x, hy = scene.H * homeY() - b.y;
            var hd = Math.sqrt(hx * hx + hy * hy);
            if (hd > HOME_R && hd > 0.01) {
              var hw = Math.min((hd - HOME_R) / HOME_R, 1);
              dvx = hx / hd * maxS - b.vx; dvy = hy / hd * maxS - b.vy;
              lm = Math.sqrt(dvx * dvx + dvy * dvy);
              if (lm > MAXFORCE) { dvx = dvx / lm * MAXFORCE; dvy = dvy / lm * MAXFORCE; }
              fx += dvx * HOME * hw; fy += dvy * HOME * hw;
            }

            b.wa += (Math.random() - 0.5) * WANDER_DRIFT;
            fx += Math.cos(b.wa) * WANDER;
            fy += Math.sin(b.wa) * WANDER;

            /* Пружина к своей точке в надписи. Правила стаи при этом не
               выключаются, а ослабляются: буквы получаются живыми, их всё
               время слегка ведёт. */
            if (morphMix > 0 && targets && targets.length >= (i + 1) * 2) {
              fx *= (1 - morphMix); fy *= (1 - morphMix);

              /* Птица целится не точно в свою точку, а в маленький круг вокруг
                 неё, и обходит его по своей фазе. Радиус — меньше двух
                 пикселей: буквы остаются чёткими, но стая никогда не застывает
                 намертво. Без этого через пару секунд надпись превращается в
                 неподвижную картинку. */
              var wob = WOBBLE * morphMix;
              var ttx = targets[i * 2] + Math.cos(b.ph + tick) * wob - b.x;
              var tty = targets[i * 2 + 1] + Math.sin(b.ph * 1.7 + tick * 0.8) * wob - b.y;

              /* Пружина жёсткая и хорошо задемпфированная: на прокрутку у стаи
                 около секунды, а за это время птица обязана долететь до своей
                 точки, иначе надпись не успевает собраться и не читается. */
              fx += (ttx * 0.038 - b.vx * 0.30) * morphMix;
              fy += (tty * 0.038 - b.vy * 0.30) * morphMix;
            }

            b.vx += fx; b.vy += fy;

            var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            if (sp > maxS) { b.vx = b.vx / sp * maxS; b.vy = b.vy / sp * maxS; }
            else if (morphMix < 0.4 && sp < b.min && sp > 0.0001) {
              b.vx = b.vx / sp * b.min; b.vy = b.vy / sp * b.min;
            }

            b.x += b.vx; b.y += b.vy;
            if (b.x < -30) b.x = -30; else if (b.x > scene.W + 30) b.x = scene.W + 30;
            if (b.y < -30) b.y = -30; else if (b.y > scene.H + 30) b.y = scene.H + 30;
          }

          var mx = 0, my = 0;
          for (i = 0; i < n; i++) { mx += boids[i].x; my += boids[i].y; }
          cx0 = mx / n; cy0 = my / n;
        },

        /* Точки задаются страницей: [x0,y0, x1,y1, ...] по одной паре на птицу. */
        setTargets: function (pts) { targets = pts; },
        setMorph: function (v) { morphMix = v < 0 ? 0 : v > 1 ? 1 : v; },
        boidCount: function () { return boids.length; },

        /* Только для проверок: снимок координат. Нужен, чтобы измерить, что
           собравшаяся надпись всё ещё живёт и при этом не расползается. */
        positions: function () {
          var out = new Float32Array(boids.length * 2);
          for (var i = 0; i < boids.length; i++) {
            out[i * 2] = boids[i].x;
            out[i * 2 + 1] = boids[i].y;
          }
          return out;
        },

        draw: function () {
          /* Холст не очищается: сверху заливается полупрозрачная бумага.
             Именно из-за этого за птицами тянутся чернильные шлейфы, а набор
             точек превращается в живопись. Когда стая складывается в буквы,
             след укорачиваем — иначе надпись расплывается. */
          /* Чернил на кадр кладут все птицы вместе, а смывает их одна заливка.
             Удвоив стаю и не тронув смыв, я получил серый холст вместо бумаги:
             ink накапливался быстрее, чем уходил. Поэтому и плотность штриха,
             и скорость смыва привязаны к числу птиц так, чтобы их произведение
             осталось прежним: тон бумаги одинаков и на шестистах птицах, и на
             двух с половиной тысячах. */
          var dens = Math.sqrt(700 / Math.max(1, boids.length));
          if (dens > 1) dens = 1; else if (dens < 0.42) dens = 0.42;

          ctx.fillStyle = 'rgba(251,250,246,' + (TRAIL / dens + morphMix * 0.28) + ')';
          ctx.fillRect(0, 0, scene.W, scene.H);

          ctx.strokeStyle = 'rgba(22,24,26,' + (0.82 * dens).toFixed(3) + ')';
          ctx.lineCap = 'round';

          var widths = [0.9, 1.3, 1.8];
          for (var g = 0; g < 3; g++) {
            /* В надписи штрих должен стать коротким и толстым. Длинный
               штрих направлен по скорости, а у собравшихся птиц скорости
               смотрят кто куда — из букв получалась щетина, и текст не
               читался. Короткая жирная засечка держит контур. */
            ctx.lineWidth = widths[g] * (1 + morphMix * 1.5);
            ctx.beginPath();
            for (var i = 0; i < boids.length; i++) {
              var b = boids[i];
              if (b.g !== g) continue;
              var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;
              /* Чем ближе к надписи, тем короче штрих: к единице он почти
                 вырождается в жирную точку. Бледной надпись от этого не
                 становится — толщину мы добавили выше. */
              var len = (sp * 3.4 + 1.5) * (1 - morphMix * 0.72) + morphMix * 0.9;
              ctx.moveTo(b.x, b.y);
              ctx.lineTo(b.x - b.vx / sp * len, b.y - b.vy / sp * len);
            }
            ctx.stroke();
          }
        },

        describe: function () {
          return 'Стая из ' + boids.length + ' птиц. Каждая держится на расстоянии ' +
            Math.round(scene.p.sep) + ' точек от соседей, подстраивает направление с силой ' +
            scene.p.ali.toFixed(2) + ' и тянется к центру соседей с силой ' + scene.p.coh.toFixed(2) + '.';
        }
      };
    }
  });

  /* ============================================================== ПЯТНА */

  ROY.registerSim('reaction', {
    title: 'Реакция-диффузия',
    lead: 'Два вещества расходятся и реагируют. Узор рождается из случайности сам.',
    params: [
      { key: 'f', label: 'подача', hint: 'сколько вещества поступает в систему', min: 0.010, max: 0.090, step: 0.0001, value: 0.0367, decimals: 4 },
      { key: 'k', label: 'убыль',  hint: 'сколько вещества уходит из системы', min: 0.040, max: 0.075, step: 0.0001, value: 0.0649, decimals: 4 }
    ],
    presets: [
      { label: 'деление',  values: { f: 0.0367, k: 0.0649 } },
      { label: 'лабиринт', values: { f: 0.0290, k: 0.0570 } },
      { label: 'кораллы',  values: { f: 0.0545, k: 0.0620 } },
      { label: 'пятна',    values: { f: 0.0350, k: 0.0650 } },
      { label: 'полосы',   values: { f: 0.0220, k: 0.0510 } }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var GW = 0, GH = 0;
      var A = null, B = null, A2 = null, B2 = null;
      var off = null, octx = null, img = null, buf = null;
      var DA = 1.0, DB = 0.5;

      function scale() { return ROY.cell(3); }

      function alloc() {
        var s = scale();
        GW = Math.max(48, Math.round(scene.W / s));
        GH = Math.max(36, Math.round(scene.H / s));
        var n = GW * GH;
        A = new Float32Array(n); B = new Float32Array(n);
        A2 = new Float32Array(n); B2 = new Float32Array(n);
        off = document.createElement('canvas');
        off.width = GW; off.height = GH;
        octx = off.getContext('2d');
        img = octx.createImageData(GW, GH);
        buf = img.data;
      }

      function seed() {
        var n = GW * GH, i;
        for (i = 0; i < n; i++) { A[i] = 1; B[i] = 0; }

        for (var s = 0; s < 14; s++) {
          var cx = (Math.random() * GW) | 0;
          var cy = (Math.random() * GH) | 0;
          /* Радиус обязан быть целым: запись по дробному индексу в
             типизированный массив молча игнорируется, и поле остаётся пустым. */
          var r = 3 + ((Math.random() * 5) | 0);
          for (var y = -r; y <= r; y++) {
            for (var x = -r; x <= r; x++) {
              if (x * x + y * y > r * r) continue;
              var px = (cx + x + GW) % GW, py = (cy + y + GH) % GH;
              var id = py * GW + px;
              A[id] = 0.5 + Math.random() * 0.1;
              B[id] = 0.25 + Math.random() * 0.1;
            }
          }
        }
      }

      function paintAt(clientX, clientY, amount) {
        var r = scene.canvas.getBoundingClientRect();
        var gx = Math.round((clientX - r.left) / r.width * GW);
        var gy = Math.round((clientY - r.top) / r.height * GH);
        for (var y = -4; y <= 4; y++) {
          for (var x = -4; x <= 4; x++) {
            if (x * x + y * y > 16) continue;
            var px = (gx + x + GW) % GW, py = (gy + y + GH) % GH;
            if (px < 0 || py < 0) continue;
            B[py * GW + px] = amount;
          }
        }
      }

      var painting = false;
      scene.canvas.addEventListener('mousedown', function (e) { painting = true; paintAt(e.clientX, e.clientY, 0.9); });
      window.addEventListener('mouseup', function () { painting = false; });
      scene.canvas.addEventListener('mousemove', function (e) { if (painting) paintAt(e.clientX, e.clientY, 0.9); });

      return {
        reset: function () { alloc(); seed(); },
        resize: function () { alloc(); seed(); },
        onQuality: function () { alloc(); seed(); },

        step: function () {
          if (!A) return;
          var w = GW, h = GH, f = scene.p.f, k = scene.p.k;

          for (var y = 0; y < h; y++) {
            var yUp = ((y - 1 + h) % h) * w;
            var yDn = ((y + 1) % h) * w;
            var yMd = y * w;

            for (var x = 0; x < w; x++) {
              var xL = (x - 1 + w) % w, xR = (x + 1) % w, i = yMd + x;

              var lapA = A[yUp + xL] * 0.05 + A[yUp + x] * 0.2 + A[yUp + xR] * 0.05
                       + A[yMd + xL] * 0.2  - A[i]            + A[yMd + xR] * 0.2
                       + A[yDn + xL] * 0.05 + A[yDn + x] * 0.2 + A[yDn + xR] * 0.05;

              var lapB = B[yUp + xL] * 0.05 + B[yUp + x] * 0.2 + B[yUp + xR] * 0.05
                       + B[yMd + xL] * 0.2  - B[i]            + B[yMd + xR] * 0.2
                       + B[yDn + xL] * 0.05 + B[yDn + x] * 0.2 + B[yDn + xR] * 0.05;

              var a = A[i], b = B[i], abb = a * b * b;
              var na = a + (DA * lapA - abb + f * (1 - a));
              var nb = b + (DB * lapB + abb - (k + f) * b);

              A2[i] = na < 0 ? 0 : na > 1 ? 1 : na;
              B2[i] = nb < 0 ? 0 : nb > 1 ? 1 : nb;
            }
          }
          var t;
          t = A; A = A2; A2 = t;
          t = B; B = B2; B2 = t;
        },

        draw: function () {
          if (!buf) return;
          var n = GW * GH;
          for (var i = 0; i < n; i++) {
            var v = B[i] * 3.9;
            if (v > 0.92) v = 0.92;      // печать, а не заливка: чистый чёрный тетради чужд
            var j = i << 2;
            buf[j]     = PAPER_RGB[0] + (INK_RGB[0] - PAPER_RGB[0]) * v;
            buf[j + 1] = PAPER_RGB[1] + (INK_RGB[1] - PAPER_RGB[1]) * v;
            buf[j + 2] = PAPER_RGB[2] + (INK_RGB[2] - PAPER_RGB[2]) * v;
            buf[j + 3] = 255;
          }
          octx.putImageData(img, 0, 0);
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(off, 0, 0, scene.W, scene.H);
        },

        describe: function () {
          return 'Поле ' + GW + ' на ' + GH + ' клеток. Подача ' + scene.p.f.toFixed(4) +
            ', убыль ' + scene.p.k.toFixed(4) + '. Из случайных пятен вырастает устойчивый узор.';
        }
      };
    }
  });

  /* ========================================================== ПАПОРОТНИК */

  ROY.registerSim('fern', {
    title: 'L-система',
    lead: 'Одно правило, применённое к самому себе несколько раз подряд.',
    params: [
      { key: 'angle',  label: 'угол ветвления', hint: 'на сколько градусов отклоняется побег', min: 8, max: 40, step: 0.5, value: 22, decimals: 1 },
      { key: 'len',    label: 'длина сегмента', hint: 'длина одного шага роста', min: 0.5, max: 1.6, step: 0.01, value: 1, decimals: 2 },
      { key: 'depth',  label: 'глубина',        hint: 'сколько раз правило применяется к себе', min: 1, max: 3, step: 1, value: 2 },
      { key: 'random', label: 'случайность',    hint: 'насколько побеги отклоняются от идеала', min: 0, max: 1, step: 0.01, value: 0.35, decimals: 2 },
      { key: 'seed',   label: 'вариант',        hint: 'другое случайное растение с теми же правилами', type: 'seed', value: 7 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var segs = [];
      var maxT = 1;
      var frontier = 0;
      var GROW = 1;

      function build() {
        segs.length = 0;
        maxT = 1;

        var rand = rng((scene.p.seed * 2654435761) % 2147483647);
        var P = scene.p;
        var depth = Math.round(P.depth);
        var ang = P.angle * Math.PI / 180;
        var base = Math.min(scene.W, scene.H) * 0.62 * P.len;

        var STEPS = 8;

        /* Правило папоротника: у побега есть главная ось, а вдоль неё сидят
           перья — и каждое перо устроено ровно так же, только меньше.
           Двоичное ветвление здесь не годится: оно даёт дерево, а не вайю. */
        function frond(x, y, dir, len, level, t0) {
          if (level > depth || len < 4 || segs.length > 6500) return;

          var segLen = len / STEPS;
          var curl = 0.05 + rand() * 0.05 * P.random;   // ось слегка загибается
          var w0 = Math.max(0.5, (depth - level + 1) * 0.75);

          for (var i = 0; i < STEPS; i++) {
            var d = dir + (rand() - 0.5) * P.random * 0.22;
            var x2 = x + Math.cos(d) * segLen;
            var y2 = y + Math.sin(d) * segLen;
            var t = t0 + i;

            segs.push({ x1: x, y1: y, x2: x2, y2: y2, t: t,
                        w: w0 * (1 - i / STEPS * 0.5) });
            if (t > maxT) maxT = t;

            x = x2; y = y2;
            dir = d + curl;

            /* Перья короче к вершине — из-за этого вайя имеет силуэт пера,
               а не метлы. */
            if (level < depth && i > 0) {
              var taper = 1 - (i / STEPS) * 0.72;
              var sub = len * 0.40 * taper;
              var spread = ang * (1 + (rand() - 0.5) * P.random * 0.7);
              frond(x, y, dir - spread, sub, level + 1, t + 1);
              frond(x, y, dir + spread, sub, level + 1, t + 1);
            }
          }
        }

        frond(scene.W * 0.5, scene.H * 0.95, -Math.PI / 2, base, 0, 0);

        /* Разворачивание занимает около трёх секунд независимо от размера. */
        GROW = maxT / 180;
        frontier = 0;
      }

      return {
        reset: function () { build(); },
        resize: function () { build(); },
        onParam: function () { build(); },

        step: function () {
          if (frontier <= maxT + 2) frontier += GROW;
        },

        draw: function () {
          clearPaper(ctx, scene.W, scene.H);
          ctx.strokeStyle = 'rgba(22,24,26,0.86)';
          ctx.lineCap = 'round';

          var lastW = -1;
          ctx.beginPath();

          for (var i = 0; i < segs.length; i++) {
            var s = segs[i];
            var local = frontier - s.t;
            if (local <= 0) continue;

            var t = local >= 1 ? 1 : local;
            var ex = s.x1 + (s.x2 - s.x1) * t;
            var ey = s.y1 + (s.y2 - s.y1) * t;

            /* Толщина меняется по уровням, поэтому путь разбивается на группы:
               один stroke на группу вместо одного на сегмент. */
            var wq = Math.round(s.w * 2) / 2;
            if (wq !== lastW) {
              if (lastW >= 0) ctx.stroke();
              ctx.beginPath();
              ctx.lineWidth = wq;
              lastW = wq;
            }
            ctx.moveTo(s.x1, s.y1);
            ctx.lineTo(ex, ey);
          }
          if (lastW >= 0) ctx.stroke();
        },

        describe: function () {
          return 'Растение из ' + segs.length + ' отрезков. Угол ветвления ' +
            scene.p.angle.toFixed(1) + ' градусов, глубина ' + Math.round(scene.p.depth) +
            ' уровней, случайность ' + scene.p.random.toFixed(2) + '.';
        }
      };
    }
  });

  /* =============================================================== ВОЛНЫ */

  ROY.registerSim('waves', {
    title: 'Интерференция',
    lead: 'Два источника на воде. Там, где гребень встречает впадину, поверхность неподвижна.',
    params: [
      { key: 'freq',     label: 'частота',    hint: 'сколько гребней укладывается на ту же длину', min: 0.02, max: 0.14, step: 0.001, value: 0.06, decimals: 3 },
      { key: 'distance', label: 'расстояние', hint: 'насколько разнесены источники', min: 40, max: 600, step: 2, value: 220 },
      { key: 'speed',    label: 'скорость',   hint: 'как быстро бегут волны', min: 0, max: 3, step: 0.05, value: 1, decimals: 2 },
      { key: 'contrast', label: 'контраст',   hint: 'насколько резко видно рисунок', min: 0.2, max: 1, step: 0.01, value: 0.7, decimals: 2 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var GW = 0, GH = 0, CELL = 3;
      var r1 = null, r2 = null;
      var off = null, octx = null, img = null, buf = null;
      var src = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
      var phase = 0;
      var dragging = -1;

      /* Таблица синуса: 60 тысяч вызовов Math.sin на кадр школьный компьютер
         не тянет, а выборка из массива — тянет. */
      var SIN_N = 1024, SIN = new Float32Array(SIN_N);
      for (var i = 0; i < SIN_N; i++) SIN[i] = Math.sin(i / SIN_N * Math.PI * 2);

      function cellSize() { return ROY.cell(3); }

      function alloc() {
        CELL = cellSize();
        GW = Math.max(32, Math.round(scene.W / CELL));
        GH = Math.max(24, Math.round(scene.H / CELL));
        r1 = new Float32Array(GW * GH);
        r2 = new Float32Array(GW * GH);
        off = document.createElement('canvas');
        off.width = GW; off.height = GH;
        octx = off.getContext('2d');
        img = octx.createImageData(GW, GH);
        buf = img.data;
      }

      function placeSources() {
        var half = Math.min(scene.p.distance, scene.W * 0.8) / 2;
        src[0].x = scene.W * 0.5 - half; src[0].y = scene.H * 0.5;
        src[1].x = scene.W * 0.5 + half; src[1].y = scene.H * 0.5;
      }

      /* Расстояния пересчитываются только когда источник сдвинулся:
         каждый кадр считать корень для 60 тысяч клеток незачем. */
      function recomputeDistances() {
        if (!r1) return;
        for (var y = 0; y < GH; y++) {
          var py = y * CELL;
          for (var x = 0; x < GW; x++) {
            var px = x * CELL, i = y * GW + x;
            var dx1 = px - src[0].x, dy1 = py - src[0].y;
            var dx2 = px - src[1].x, dy2 = py - src[1].y;
            r1[i] = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            r2[i] = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          }
        }
      }

      function pick(e) {
        var r = scene.canvas.getBoundingClientRect();
        var mx = e.clientX - r.left, my = e.clientY - r.top;
        for (var s = 0; s < 2; s++) {
          var dx = mx - src[s].x, dy = my - src[s].y;
          if (dx * dx + dy * dy < 900) return s;
        }
        return -1;
      }

      scene.canvas.addEventListener('mousedown', function (e) { dragging = pick(e); });
      window.addEventListener('mouseup', function () { dragging = -1; });
      scene.canvas.addEventListener('mousemove', function (e) {
        if (dragging < 0) return;
        var r = scene.canvas.getBoundingClientRect();
        src[dragging].x = e.clientX - r.left;
        src[dragging].y = e.clientY - r.top;
        recomputeDistances();
      });

      return {
        reset: function () { alloc(); placeSources(); recomputeDistances(); phase = 0; },
        resize: function () { alloc(); placeSources(); recomputeDistances(); },
        onQuality: function () { alloc(); placeSources(); recomputeDistances(); },
        onParam: function (key) {
          if (key === 'distance') { placeSources(); recomputeDistances(); }
        },

        step: function () { phase += scene.p.speed * 0.09; },

        draw: function () {
          if (!buf) return;
          var n = GW * GH, k = scene.p.freq, c = scene.p.contrast;
          var toIndex = SIN_N / (Math.PI * 2);

          for (var i = 0; i < n; i++) {
            var a1 = ((k * r1[i] - phase) * toIndex) | 0;
            var a2 = ((k * r2[i] - phase) * toIndex) | 0;
            var s1 = SIN[((a1 % SIN_N) + SIN_N) % SIN_N];
            var s2 = SIN[((a2 % SIN_N) + SIN_N) % SIN_N];

            /* Амплитуда падает с расстоянием — иначе картинка выглядит
               нарисованной, а не физической. */
            var v = (s1 / (1 + r1[i] * 0.006) + s2 / (1 + r2[i] * 0.006)) * 0.5;

            /* Красим по модулю смещения, а не по самому смещению. Тогда там,
               где волны гасят друг друга, поверхность остаётся неподвижной и
               бумага — чистой: лучи гашения видно сразу, а фон не заливается
               ровным серым. */
            var ink = Math.abs(v) * c * 1.25;
            if (ink < 0) ink = 0; else if (ink > 0.88) ink = 0.88;

            var j = i << 2;
            buf[j]     = PAPER_RGB[0] + (INK_RGB[0] - PAPER_RGB[0]) * ink;
            buf[j + 1] = PAPER_RGB[1] + (INK_RGB[1] - PAPER_RGB[1]) * ink;
            buf[j + 2] = PAPER_RGB[2] + (INK_RGB[2] - PAPER_RGB[2]) * ink;
            buf[j + 3] = 255;
          }
          octx.putImageData(img, 0, 0);
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(off, 0, 0, scene.W, scene.H);

          /* Источники: тонкие кольца, чтобы было понятно, что их можно тянуть. */
          ctx.strokeStyle = '#2545E6';
          ctx.lineWidth = 1.4;
          for (var s = 0; s < 2; s++) {
            ctx.beginPath();
            ctx.arc(src[s].x, src[s].y, 7, 0, Math.PI * 2);
            ctx.stroke();
          }
        },

        describe: function () {
          return 'Два источника волн на расстоянии ' + Math.round(scene.p.distance) +
            ' точек. Частота ' + scene.p.freq.toFixed(3) +
            '. Видны лучи гашения — линии, вдоль которых поверхность неподвижна.';
        }
      };
    }
  });

  /* ============================================================ СЕМЯ КЛЁНА */

  ROY.registerSim('samara', {
    title: 'Авторотация',
    lead: 'Крылатка не падает, а вращается. Вращение создаёт подъёмную силу и удерживает семя в воздухе.',
    params: [
      { key: 'mass', label: 'масса семени',  hint: 'тяжёлое семя падает быстрее', min: 0.4, max: 2.2, step: 0.02, value: 1, decimals: 2 },
      { key: 'wing', label: 'площадь крыла', hint: 'широкое крыло раскручивается сильнее', min: 0.4, max: 2.2, step: 0.02, value: 1, decimals: 2 },
      { key: 'wind', label: 'ветер',         hint: 'сносит семя в сторону', min: -2, max: 2, step: 0.05, value: 0.4, decimals: 2 }
    ],

    create: function (scene) {
      var ctx = scene.ctx;
      var seeds = [];

      /* Подобрано так, чтобы установившаяся скорость снижения была около
         1,2 точки за шаг: крылатка пересекает экран примерно за десять секунд,
         а спираль успевает сделать несколько витков. */
      var G = 0.02;          // ускорение свободного падения
      var LIFT_C = 0.00039;  // коэффициент подъёмной силы крыла
      var SPIN = 6;          // насколько быстро снижение раскручивает крыло

      function makeSeed(atTop) {
        return {
          x: scene.W * (0.15 + Math.random() * 0.7),
          y: atTop ? -20 - Math.random() * scene.H * 0.6 : Math.random() * scene.H * 0.5,
          vy: 0,
          omega: 0,
          ang: Math.random() * Math.PI * 2,
          cone: 18 + Math.random() * 8,
          trail: []
        };
      }

      function reseed() {
        seeds.length = 0;
        var n = ROY.count(3, 1);
        for (var i = 0; i < n; i++) seeds.push(makeSeed(false));
      }

      return {
        reset: function () { reseed(); },
        resize: function () { reseed(); },
        onQuality: function () { reseed(); },

        step: function () {
          var P = scene.p;

          for (var i = 0; i < seeds.length; i++) {
            var s = seeds[i];

            /* Упрощённая модель авторотации: скорость снижения раскручивает
               крыло, вращение создаёт подъёмную силу, та тормозит падение.
               Система сама приходит к установившемуся режиму. */
            var omegaTarget = s.vy * P.wing * SPIN;
            s.omega += (omegaTarget - s.omega) * 0.06;

            /* a = g − L/m. Тяжёлое семя падает быстрее, широкое крыло сильнее
               тормозит: система сама выходит на установившийся режим. */
            var lift = LIFT_C * P.wing * s.omega * s.omega;
            var accel = G - lift / Math.max(0.2, P.mass);

            s.vy += accel;
            if (s.vy < 0) s.vy = 0;

            s.ang += s.omega * 0.03;
            s.y += s.vy;
            s.x += P.wind * 0.9;

            var px = s.x + Math.cos(s.ang) * s.cone;
            var py = s.y + Math.sin(s.ang) * s.cone * 0.34;
            s.px = px; s.py = py;
            s.trail.push(px, py);
            if (s.trail.length > 900) s.trail.splice(0, 2);

            if (s.y > scene.H + 30 || s.x < -60 || s.x > scene.W + 60) {
              seeds[i] = makeSeed(true);
            }
          }
        },

        draw: function () {
          clearPaper(ctx, scene.W, scene.H);

          /* Линия земли — иначе непонятно, откуда и куда семя летит. */
          ctx.strokeStyle = 'rgba(185,188,182,0.9)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, scene.H - 12.5);
          ctx.lineTo(scene.W, scene.H - 12.5);
          ctx.stroke();

          for (var i = 0; i < seeds.length; i++) {
            var s = seeds[i];

            ctx.strokeStyle = 'rgba(110,114,120,0.45)';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            for (var t = 0; t < s.trail.length; t += 2) {
              if (t === 0) ctx.moveTo(s.trail[0], s.trail[1]);
              else ctx.lineTo(s.trail[t], s.trail[t + 1]);
            }
            ctx.stroke();

            ctx.save();
            ctx.translate(s.px === undefined ? s.x : s.px, s.py === undefined ? s.y : s.py);
            ctx.rotate(s.ang);

            ctx.strokeStyle = 'rgba(22,24,26,0.85)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(19, -7, 34, -3);   // крыло
            ctx.stroke();

            ctx.fillStyle = 'rgba(22,24,26,0.9)';
            ctx.beginPath();
            ctx.ellipse(-3, 0, 5, 3.6, 0, 0, Math.PI * 2);   // семечко
            ctx.fill();

            ctx.restore();
          }
        },

        describe: function () {
          var v = seeds.length ? seeds[0].vy.toFixed(2) : '0';
          return 'Крылатки массой ' + scene.p.mass.toFixed(2) + ' с крылом ' +
            scene.p.wing.toFixed(2) + ' при ветре ' + scene.p.wind.toFixed(2) +
            '. Установившаяся скорость снижения около ' + v + ' точек за шаг.';
        }
      };
    }
  });

})(window);
