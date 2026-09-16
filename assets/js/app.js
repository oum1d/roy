/* РОЙ · общая логика сайта
   ------------------------------------------------------------------
   Хранилище прогресса и опытов, разбор адреса, живые миниатюры, формы.
   Всё держится на localStorage: настоящего сервера у сборки нет, и это
   честно написано в интерфейсе там, где это важно.
*/
(function (window, document) {
  'use strict';

  var ROY = window.ROY || (window.ROY = {});

  /* ------------------------------------------------------------ хранилище */

  function safeRead(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      var v = JSON.parse(raw);
      return v === null || v === undefined ? fallback : v;
    } catch (e) { return fallback; }
  }

  function safeWrite(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }      // приватный режим — молча продолжаем
  }

  var K_PROGRESS = 'roy.progress.v1';
  var K_EXP = 'roy.experiments.v1';
  var K_SESSION = 'roy.session.v1';

  ROY.store = {
    progress: function () { return safeRead(K_PROGRESS, {}); },

    markDone: function (lessonId) {
      var p = safeRead(K_PROGRESS, {});
      if (!p[lessonId]) {
        p[lessonId] = { at: Date.now() };
        safeWrite(K_PROGRESS, p);
      }
      return p;
    },

    isDone: function (lessonId) {
      return !!safeRead(K_PROGRESS, {})[lessonId];
    },

    doneCount: function () { return Object.keys(safeRead(K_PROGRESS, {})).length; },

    experiments: function () { return safeRead(K_EXP, []); },

    saveExperiment: function (exp) {
      var list = safeRead(K_EXP, []);
      exp.id = 'e' + Date.now().toString(36);
      exp.at = Date.now();
      list.unshift(exp);
      if (list.length > 40) list.length = 40;
      return safeWrite(K_EXP, list) ? exp : null;
    },

    removeExperiment: function (id) {
      var list = safeRead(K_EXP, []).filter(function (e) { return e.id !== id; });
      safeWrite(K_EXP, list);
    },

    session: function () { return safeRead(K_SESSION, null); },
    signIn: function (code) { return safeWrite(K_SESSION, { code: code, at: Date.now() }); },
    signOut: function () { try { window.localStorage.removeItem(K_SESSION); } catch (e) {} },

    lastLesson: function (id) {
      if (id === undefined) return safeRead('roy.last.v1', null);
      safeWrite('roy.last.v1', id);
    }
  };

  /* ---------------------------------------------------------------- уроки */

  ROY.lessons = function () { return window.ROY_LESSONS || []; };

  ROY.lesson = function (id) {
    var all = ROY.lessons();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  };

  ROY.neighbours = function (id) {
    var ready = ROY.lessons().filter(function (l) { return l.status === 'ready'; });
    var i = -1;
    ready.forEach(function (l, k) { if (l.id === id) i = k; });
    return { prev: i > 0 ? ready[i - 1] : null, next: i > -1 && i < ready.length - 1 ? ready[i + 1] : null };
  };

  /* Урок доступен, если он бесплатный. Платные открываются подпиской,
     которой в статической сборке нет — и мы про это не врём. */
  ROY.hasAccess = function (lesson) { return !!lesson && lesson.free === true; };

  /* --------------------------------------------------- конфигурация в адресе */

  ROY.paramsFromQuery = function (simDef) {
    var q = ROY.query(), out = {};
    if (!simDef) return out;
    simDef.params.forEach(function (spec) {
      if (q[spec.key] !== undefined && q[spec.key] !== '') {
        var v = parseFloat(q[spec.key]);
        if (isFinite(v)) out[spec.key] = v;
      }
    });
    return out;
  };

  ROY.shareUrl = function (lessonId, values) {
    var base = window.location.href.split('?')[0];
    var parts = ['id=' + encodeURIComponent(lessonId)];
    Object.keys(values).forEach(function (k) {
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(round(values[k])));
    });
    return base + '?' + parts.join('&');
  };

  function round(v) {
    return Math.abs(v) < 1 ? Number(v).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') : String(Math.round(v * 100) / 100);
  }

  /* -------------------------------------------------------------- миниатюры */

  /* Живая миниатюра карточки. Работают только те, что попали в кадр:
     об этом заботится IntersectionObserver внутри движка. */
  /* Настройки, рассчитанные на маленький холст. Полноразмерные значения в
     карточке 290×180 дают кашу: шестьсот птиц там стоят вплотную, а источники
     волн не помещаются в кадр. */
  var THUMB_VALUES = {
    boids:     { count: 110, sep: 7, view: 45, fear: 0, coh: 0.85 },
    waves:     { distance: 90, freq: 0.09, contrast: 0.8 },
    samara:    { wind: 0.25 },
    fern:      { depth: 2, len: 0.9 },
    traffic:   { density: 0.26, vmax: 5, dawdle: 0.3 },
    fireflies: { count: 45, radius: 70, coupling: 0.12 },
    sand:      { flow: 2, slip: 0.55 },
    ants:      { count: 70, evaporate: 0.012 },
    snowflake: { beta: 0.62 },
    fish:      { count: 70, spread: 120 },
    bees:      { cells: 40, disorder: 0.06 },
    cracks:    { seeds: 12 },
    canopy:    { light: 280, reach: 40, stepLen: 3.5 },
    lightning: { eta: 2.0, speed: 4 },
    locust:    { count: 40, arc: 0.24 },
    swarm:     { count: 60, keep: 11 },
    rivulet:   { drops: 18 },
    flame:     { wick: 14 },
    soapfilm:  { pins: 4 }
  };

  /* Сколько шагов прогнать до первого показа. У каждой системы своё время
     выхода на узнаваемую картинку: снежинке хватает трёхсот шагов, а
     муравьям нужно успеть проложить тропу. */
  var THUMB_WARM = {
    reaction: 900, fern: 260, boids: 900,
    traffic: 260, fireflies: 400, sand: 900, ants: 1800, snowflake: 420,
    fish: 1400, bees: 220, cracks: 700, canopy: 900, lightning: 500,
    river: 1500, shell: 300, dunes: 2000, locust: 900, swarm: 500,
    clouds: 700, flame: 800, rivulet: 900, soapfilm: 400
  };

  ROY.mountThumb = function (canvas, simId, values) {
    if (!simId || !ROY.getSim(simId)) return null;

    var merged = {};
    var preset = THUMB_VALUES[simId] || {};
    Object.keys(preset).forEach(function (k) { merged[k] = preset[k]; });
    Object.keys(values || {}).forEach(function (k) { merged[k] = values[k]; });

    /* Пометка thumb говорит движку, что сцена декоративная: такие считаются
       по очереди, а не все сразу. Без этого каталог с двумя десятками живых
       карточек грузит слабую машину без всякой пользы. */
    var scene = ROY.createScene(canvas, simId, merged, { thumb: true });
    if (!scene) return null;

    /* Миниатюра стартует не с нуля: несколько сотен шагов дают узнаваемую
       картинку сразу, а не пустую бумагу с одной точкой. */
    ROY.warmup(scene, THUMB_WARM[simId] || 320);
    return scene;
  };

  /* --------------------------------------------------- контур текста в точки */

  /* Рисуем надпись на невидимом холсте, читаем пиксели и берём из них
     нужное количество случайных точек. Это и есть цели, к которым притянутся
     птицы: контур надписи, а не заранее записанная анимация. */
  ROY.samplePoints = function (text, W, H, count, opts) {
    opts = opts || {};
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W));
    c.height = Math.max(1, Math.round(H));
    var g = c.getContext('2d');

    var size = opts.size || Math.min(W * 0.13, H * 0.34);
    g.fillStyle = '#000';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = (opts.weight || '600') + ' ' + Math.round(size) + 'px ' +
             (opts.family || '"Oswald", "Arial Narrow", sans-serif');

    /* По умолчанию надпись по центру холста, но её можно поднять: на первом
       экране под ней стоит заголовок, и по центру буквы легли бы прямо на
       него. cy — доля высоты, где окажется середина надписи. */
    var lines = String(text).split('\n');
    var lh = size * 1.06;
    var y0 = H * (opts.cy || 0.5) - (lines.length - 1) * lh / 2;
    lines.forEach(function (line, i) { g.fillText(line, W / 2, y0 + i * lh); });

    var data;
    try { data = g.getImageData(0, 0, c.width, c.height).data; }
    catch (e) { return null; }        // холст «испорчен» — молча отказываемся от эффекта

    /* Сетку берём мелкую и одинаковую, а не подгоняем под число точек:
       так по толщине штриха всегда несколько рядов, и буква не рвётся. */
    var pool = [];
    var stepPx = 3;
    for (var y = 0; y < c.height; y += stepPx) {
      for (var x = 0; x < c.width; x += stepPx) {
        if (data[(y * c.width + x) * 4 + 3] > 128) pool.push(x, y);
      }
    }
    if (pool.length < 8) return null;

    /* Раньше точки выбирались случайно и с возвратом: часть птиц садилась в
       одно место, рядом оставались дыры, и надпись рябила. Теперь идём по
       контуру ровным шагом — покрытие равномерное при любом числе птиц. */
    var out = new Float32Array(count * 2);
    var pairs = pool.length / 2;
    var stride = pairs / count;
    for (var i = 0; i < count; i++) {
      var j = Math.floor(i * stride) % pairs;
      out[i * 2] = pool[j * 2];
      out[i * 2 + 1] = pool[j * 2 + 1];
    }
    return out;
  };

  /* ------------------------------------------------------------------ шапка */

  ROY.initHeader = function () {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.site-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    nav.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { nav.classList.remove('is-open'); toggle.focus(); }
    });
  };

  /* ------------------------------------------------------------------ формы */

  /* Клиентская проверка — это удобство, а не защита. Настоящая проверка
     обязана быть на сервере; в этой сборке сервера нет, о чём написано
     рядом с кнопкой отправки и в README. */
  ROY.initForm = function (form, onValid) {
    if (!form) return;

    form.setAttribute('novalidate', 'novalidate');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, firstBad = null;

      Array.prototype.forEach.call(form.querySelectorAll('[data-rule]'), function (input) {
        var err = validate(input);
        var box = form.querySelector('#' + input.id + '-error');
        if (err) {
          ok = false;
          input.setAttribute('aria-invalid', 'true');
          if (box) box.textContent = err;
          if (!firstBad) firstBad = input;
        } else {
          input.removeAttribute('aria-invalid');
          if (box) box.textContent = '';
        }
      });

      var status = form.querySelector('.form-status');
      if (!ok) {
        if (status) {
          status.setAttribute('data-kind', 'err');
          status.textContent = 'Проверьте отмеченные поля.';
        }
        if (firstBad) firstBad.focus();
        return;
      }

      if (status) {
        status.setAttribute('data-kind', 'ok');
        status.textContent = 'Форма заполнена верно. Отправка не выполнена: в этой сборке нет сервера — см. README, раздел «Что подключить».';
      }
      if (onValid) onValid(form);
    });

    Array.prototype.forEach.call(form.querySelectorAll('[data-rule]'), function (input) {
      input.addEventListener('blur', function () {
        var err = validate(input);
        var box = form.querySelector('#' + input.id + '-error');
        if (box) box.textContent = err || '';
        if (err) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
      });
    });
  };

  function validate(input) {
    var rules = (input.getAttribute('data-rule') || '').split('|');
    var v = (input.value || '').trim();

    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r === 'required' && !v) return 'Поле обязательно.';
      if (r === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Похоже, в адресе опечатка.';
      if (r === 'phone' && v && !/^[+\d][\d\s()\-]{6,}$/.test(v)) return 'Телефон в формате +48 000 000 000.';
      if (r.indexOf('min:') === 0 && v.length < parseInt(r.slice(4), 10)) return 'Слишком коротко.';
      if (r === 'number' && v && !isFinite(parseFloat(v))) return 'Нужно число.';
    }
    return null;
  }

  /* --------------------------------------------------------- дерево прогресса */

  /* Прогресс рисуется не полоской, а растущей структурой: каждый пройденный
     урок — новая ветка. Ветки добавляются, а не перерисовываются заново. */
  ROY.drawProgressTree = function (canvas, count, total, animate) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = Math.max(1, Math.round(rect.width));
    var H = Math.max(1, Math.round(rect.height));

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var grown = 0;
    var target = count;
    var reduce = ROY.reducedMotion();

    function seedRandom(s) {
      return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    }

    /* upTo — сколько веток нарисовать целиком, partial — какая часть
       последней уже выросла. Так уже пройденные уроки видны сразу, а
       анимируется только новая ветка. */
    function render(upTo, partial) {
      ctx.fillStyle = '#FBFAF6';
      ctx.fillRect(0, 0, W, H);

      var baseX = W * 0.5, baseY = H - 14;

      ctx.strokeStyle = 'rgba(185,188,182,0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W * 0.12, baseY + 0.5);
      ctx.lineTo(W * 0.88, baseY + 0.5);
      ctx.stroke();

      /* Ствол растёт вместе с числом пройденных уроков, но не с нуля:
         иначе у новичка на экране одинокая палка. */
      var grownCount = Math.min(upTo + (partial || 0), total);
      var trunk = H * 0.34 + (grownCount / total) * H * 0.46;

      ctx.strokeStyle = 'rgba(22,24,26,0.82)';
      ctx.lineCap = 'round';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(baseX, baseY - trunk);
      ctx.stroke();

      for (var i = 0; i < upTo + (partial > 0 ? 1 : 0); i++) {
        var rand = seedRandom(i * 7919 + 13);
        var side = i % 2 === 0 ? -1 : 1;
        var t = i / Math.max(1, total - 1);
        var y = baseY - trunk * (0.16 + t * 0.78);
        var grow = (i === upTo && partial > 0) ? partial : 1;
        var len = (H * 0.13 + rand() * H * 0.08) * (1 - t * 0.3) * grow;
        var ang = side * (0.55 + rand() * 0.45);

        ctx.lineWidth = 1.7;
        branch(ctx, baseX, y, ang - Math.PI / 2, len, 2, rand);
      }
    }

    function branch(c, x, y, dir, len, depth, rand) {
      if (depth <= 0 || len < 4) return;
      var x2 = x + Math.cos(dir) * len;
      var y2 = y + Math.sin(dir) * len;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
      var spread = 0.4 + rand() * 0.3;
      branch(c, x2, y2, dir - spread, len * 0.62, depth - 1, rand);
      branch(c, x2, y2, dir + spread, len * 0.62, depth - 1, rand);
    }

    if (!animate || reduce || target === 0) { render(target, 0); return; }

    /* Всё пройденное рисуется сразу, анимируется только последняя ветка —
       примерно за 800 мс. Если кадры не пойдут вовсе, на экране всё равно
       останется верная картина, а не голый ствол. */
    render(target - 1, 0.001);

    var start = 0;
    function tick(now) {
      if (!start) start = now;
      var k = Math.min(1, (now - start) / 800);
      var e = 1 - Math.pow(1 - k, 3);
      render(target - 1, e);
      if (k < 1) window.requestAnimationFrame(tick);
      else render(target, 0);
    }
    window.requestAnimationFrame(tick);
  };

  /* ------------------------------------------------------------ применение настроек */

  ROY.applyFontScale = function () {
    var s = ROY.settings.get('fontScale') || 1;
    document.documentElement.style.setProperty('--font-scale', s);
  };

  /* ------------------------------------------------------------------- старт */

  function boot() {
    ROY.initHeader();
    ROY.applyFontScale();

    /* Отметка «урок доступен по подписке» и подобные состояния зависят от
       хранилища, поэтому проставляются на клиенте, а не в разметке. */
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window, document);
