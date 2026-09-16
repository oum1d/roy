/* РОЙ · движок сцен
   ------------------------------------------------------------------
   Один requestAnimationFrame на всю страницу. Все симуляции живут в общем
   реестре, шаг физики фиксированный, невидимые сцены не считаются вообще.

   Почему так, а не свой цикл у каждой сцены: на странице каталога может быть
   восемь живых миниатюр. Восемь независимых rAF — это восемь точек, где
   браузер не может собрать кадр вовремя, и восемь мест, где легко забыть
   остановиться при уходе на другую вкладку.
*/
(function (window, document) {
  'use strict';

  var ROY = window.ROY || (window.ROY = {});

  /* ---------------------------------------------------------------- реестр */

  var defs = {};        // описания симуляций
  var scenes = [];      // живые сцены на текущей странице

  ROY.registerSim = function (id, def) { defs[id] = def; };
  ROY.getSim = function (id) { return defs[id] || null; };
  ROY.listSims = function () { return Object.keys(defs); };

  /* ------------------------------------------------------- режимы и среда */

  var mqReduce = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener: function () {} };

  /* Три состояния, а не два:
       auto — слушаем систему (по умолчанию),
       off  — движение выключено принудительно,
       on   — движение включено принудительно.
     Последнее нужно там, где «уменьшить движение» выставлено на всю машину
     администратором школы, а учитель всё-таки хочет показать явление. */
  ROY.reducedMotion = function () {
    var m = ROY.settings.get('motion');
    if (m === 'off') return true;
    if (m === 'on') return false;
    return mqReduce.matches;
  };

  /* -------------------------------------------------------------- качество

     Одно число от 0 до 1, на которое сцены умножают всё, что можно урезать:
     число частиц, шаг сетки, плотность пикселей холста. Ступеней несколько,
     а не две, потому что «половина» — плохой ответ и слабой машине, и
     средней: первой мало, второй обидно.

     Ступени вниз проходятся по измерению, вверх — никогда. Возврат наверх
     выглядел бы как хлопок: частицы появляются из ниоткуда, — и при любой
     ошибке измерения начались бы качели. */

  var LEVELS = [1, 0.75, 0.5, 0.35, 0.22];
  var level = 0;

  ROY.quality = 1;

  /* Плотность пикселей холста тоже урезается. На телефоне это главный
     выигрыш: холст на ретине втрое больше по площади, а заливка бумагой
     идёт по всем пикселям каждый кадр. */
  function dprCap() {
    var cap = 1 + ROY.quality;             // 2.0 на полном, 1.22 на самом низком
    return cap < 1 ? 1 : cap > 2 ? 2 : cap;
  }

  /* Помощники для симуляций: чтобы каждая не изобретала свою формулу. */
  ROY.count = function (n, min) {
    var v = Math.round(n * ROY.quality);
    var lo = min || 20;
    return v < lo ? lo : v;
  };

  /* Клетка сетки крупнее ровно настолько, чтобы работы стало меньше во
     столько же раз: площадь клетки растёт как квадрат стороны. */
  ROY.cell = function (base) {
    var v = Math.round(base / Math.sqrt(ROY.quality));
    return v < base ? base : v;
  };

  /* Стартовая ступень по тому, что устройство само о себе сообщает. Это
     догадка, а не измерение, поэтому она осторожная: ошибётся в сторону
     «слишком хорошо» — первые секунды будут дёргаться, пока измерение не
     поправит; ошибётся в сторону «слишком плохо» — никто и не заметит.

     Ядра и память браузер сообщает не всегда: там, где их нет, считаем
     машину приличной, иначе мощный компьютер зря получил бы урезанную
     картинку. */
  function guessLevel() {
    var cores = navigator.hardwareConcurrency || 8;
    var mem = navigator.deviceMemory || 8;
    var dpr = window.devicePixelRatio || 1;
    var scr = window.screen ? Math.min(screen.width, screen.height) : 1200;

    if (cores <= 2 || mem <= 2) return 2;          // старая машина
    if (scr <= 900 && dpr >= 2) return 1;          // телефон: пикселей втрое больше
    if (cores <= 4 && dpr >= 2) return 1;
    return 0;
  }

  var DT = 1000 / 60;         // шаг физики, независимый от частоты кадров
  var MAX_SUBSTEPS = 3;       // при просадке система замедляется, а не взрывается

  /* Сколько сцен считаем за один кадр. На странице каталога в поле зрения
     попадает до восьми миниатюр разом, и среди них есть дорогие — решение
     Лапласа для молнии или поле реакции-диффузии. Считать их все каждый кадр
     незачем: они декоративные. Оставшиеся получают свой шаг в следующем кадре,
     по кругу, поэтому ни одна не встаёт совсем.

     На слабой машине их считается ещё меньше: три декоративные сцены за кадр
     это ещё и три заливки холста, а они там стоят дороже всего. */
  function scenesPerFrame() {
    var n = Math.round(3 * ROY.quality);
    return n < 1 ? 1 : n;
  }
  var roundRobin = 0;

  /* ------------------------------------------------------------ настройки */

  var STORE_KEY = 'roy.settings.v1';

  ROY.settings = (function () {
    var data = { graphics: 'auto', motion: 'auto', fontScale: 1 };
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.graphics) data.graphics = parsed.graphics;
          if (parsed.motion) data.motion = parsed.motion;
          if (parsed.fontScale) data.fontScale = parsed.fontScale;
        }
      }
    } catch (e) { /* приватный режим или запрет хранилища — работаем на значениях по умолчанию */ }

    var listeners = [];

    return {
      get: function (k) { return data[k]; },
      set: function (k, v) {
        data[k] = v;
        try { window.localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {}
        listeners.forEach(function (fn) { fn(k, v); });
      },
      all: function () { return { graphics: data.graphics, motion: data.motion, fontScale: data.fontScale }; },
      onChange: function (fn) { listeners.push(fn); }
    };
  })();

  level = ROY.settings.get('graphics') === 'low' ? 2 : guessLevel();
  ROY.quality = LEVELS[level];

  /* Ссылка вида ?motion=on можно дать классу, чтобы движение включилось
     независимо от системной настройки. Тем же переключателем пользуемся при
     съёмке скриншотов: headless-браузер всегда рапортует «уменьшить движение». */
  (function () {
    var m = /[?&]motion=(on|off|auto)/.exec(window.location.search);
    if (m) ROY.settings.set('motion', m[1]);
    var g = /[?&]graphics=(low|auto)/.exec(window.location.search);
    if (g) ROY.settings.set('graphics', g[1]);
  })();

  /* ---------------------------------------------------------------- сцена */

  function Scene(canvas, def, values, opts) {
    opts = opts || {};

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.def = def;
    this.opts = opts;

    this.p = {};
    def.params.forEach(function (spec) {
      this.p[spec.key] = (values && values[spec.key] !== undefined)
        ? clampParam(spec, values[spec.key])
        : spec.value;
    }, this);

    this.W = 0; this.H = 0; this.dpr = 1;
    this.visible = false;
    this.acc = 0;
    this.dead = false;

    /* При выключенном движении сцена не запускается сама: пользователь видит
       статичный кадр и кнопку «Запустить». Ползунки при этом продолжают
       работать — система пересчитывается и показывает результат. */
    this.paused = ROY.reducedMotion();

    this.impl = def.create(this);
    this.measure();
    this.impl.reset();
    this.impl.draw();

    scenes.push(this);
    observe(this);
  }

  Scene.prototype.measure = function () {
    var rect = this.canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    var dpr = Math.min(window.devicePixelRatio || 1, dprCap());

    if (w === this.W && h === this.H && dpr === this.dpr) return false;

    this.W = w; this.H = h; this.dpr = dpr;

    /* Без умножения на devicePixelRatio холст будет мыльным на ретине. */
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  };

  Scene.prototype.set = function (key, value) {
    var spec = null;
    this.def.params.forEach(function (s) { if (s.key === key) spec = s; });
    this.p[key] = spec ? clampParam(spec, value) : value;
    if (this.impl.onParam) this.impl.onParam(key, this.p[key]);

    /* Пересчёт без перезапуска: если сцена стоит (выключено движение),
       прогоняем короткую серию шагов, чтобы результат был виден сразу. */
    if (this.paused) this.nudge(24);
  };

  Scene.prototype.setAll = function (values) {
    Object.keys(values || {}).forEach(function (k) { this.set(k, values[k]); }, this);
  };

  Scene.prototype.values = function () {
    var out = {};
    Object.keys(this.p).forEach(function (k) { out[k] = this.p[k]; }, this);
    return out;
  };

  Scene.prototype.nudge = function (steps) {
    for (var i = 0; i < (steps || 1); i++) this.impl.step();
    this.impl.draw();
  };

  Scene.prototype.reset = function () {
    this.impl.reset();
    this.acc = 0;
    this.impl.draw();
  };

  Scene.prototype.play = function () { this.paused = false; };
  Scene.prototype.pause = function () { this.paused = true; };

  Scene.prototype.destroy = function () {
    this.dead = true;
    unobserve(this);
    var i = scenes.indexOf(this);
    if (i > -1) scenes.splice(i, 1);
  };

  function clampParam(spec, v) {
    v = parseFloat(v);
    if (!isFinite(v)) return spec.value;
    if (spec.min !== undefined && v < spec.min) v = spec.min;
    if (spec.max !== undefined && v > spec.max) v = spec.max;
    return v;
  }

  ROY.createScene = function (canvas, simId, values, opts) {
    var def = defs[simId];
    if (!def || !canvas) return null;
    return new Scene(canvas, def, values, opts);
  };

  /* ------------------------------------------------- наблюдение за экраном */

  var io = null;

  if (window.IntersectionObserver) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var scene = entry.target.__royScene;
        if (!scene) return;
        scene.visible = entry.isIntersecting;
        if (!entry.isIntersecting) scene.acc = 0;   // вернулись — не прыгаем вперёд
      });
    }, { rootMargin: '120px' });
  }

  function observe(scene) {
    scene.canvas.__royScene = scene;
    if (io) io.observe(scene.canvas);
    else scene.visible = true;
  }

  function unobserve(scene) {
    if (io) io.unobserve(scene.canvas);
    scene.canvas.__royScene = null;
  }

  /* ------------------------------------------------------------- главный цикл */

  var rafId = 0, lastNow = 0;
  var fpsSum = 0, fpsCount = 0, fpsWindow = 0;

  ROY.fps = 0;

  function loop(now) {
    rafId = window.requestAnimationFrame(loop);

    /* Ушли на другую вкладку — ничего не считаем и не копим долг по времени. */
    if (document.hidden) { lastNow = now; return; }

    if (lastNow === 0) { lastNow = now; return; }

    var dt = now - lastNow;
    lastNow = now;
    if (dt > 100) dt = 100;      // возврат на вкладку не прокручивает симуляцию вперёд
    else if (dt < 0) dt = 0;

    measure(dt);

    /* Сначала собираем тех, кого вообще надо считать. */
    var live = [];
    for (var i = 0; i < scenes.length; i++) {
      var s = scenes[i];
      if (s.dead || !s.visible || s.paused) continue;
      s.acc += dt;
      live.push(s);
    }

    /* Полноразмерные сцены считаем всегда: на странице урока она одна, и
       тормозить её ради миниатюр нельзя. Декоративные — по очереди. */
    var heavy = [], light = [];
    for (var k = 0; k < live.length; k++) {
      (live[k].opts.thumb ? light : heavy).push(live[k]);
    }

    var budget = Math.max(0, scenesPerFrame() - heavy.length);
    var picked = heavy;
    if (light.length) {
      if (light.length <= budget) {
        picked = heavy.concat(light);
      } else {
        for (var b = 0; b < budget; b++) {
          picked = picked.concat(light[(roundRobin + b) % light.length]);
        }
        roundRobin = (roundRobin + Math.max(1, budget)) % light.length;
      }
    }

    for (var j = 0; j < picked.length; j++) {
      var sc = picked[j];
      var steps = 0;
      while (sc.acc >= DT && steps < MAX_SUBSTEPS) {
        sc.impl.step();
        sc.acc -= DT;
        steps++;
      }
      if (sc.acc > DT * MAX_SUBSTEPS) sc.acc = 0;
      sc.impl.draw();
    }

    /* Те, кому в этом кадре не досталось времени, не должны копить долг:
       иначе при возврате очереди они рванут вперёд рывком. */
    for (var m = 0; m < live.length; m++) {
      if (picked.indexOf(live[m]) === -1 && live[m].acc > DT * MAX_SUBSTEPS) {
        live[m].acc = DT;
      }
    }
  }

  /* Решение о ступени вынесено в отдельную сборку без единой ссылки наружу:
     ей на вход только длительность кадра. Так её можно скормить выдуманной
     последовательностью кадров и проверить, не запуская браузер на слабой
     машине, — этим и занимается lab/perf.html. Копии логики в стенде нет:
     стенд берёт эту же сборку, поэтому разойтись им негде.

     Пороги в миллисекундах, а не в кадрах в секунду: число сразу сравнимо
     с бюджетом 16,7 мс. */
  ROY.makeQualityGuard = function (levels) {
    var SLOW_MS = 21;        // ниже 48 кадров — дёрганье уже заметно
    var HARD_MS = 42;        // ниже 24 кадров — спускаемся сразу на две ступени
    var HOLD = 700;          // столько держится просадка, прежде чем поверим
    var WARMUP = 1500;       // раскладка и шрифты: первые полторы секунды не судим
    var COOLDOWN = 1200;     // после смены даём системе устояться

    var lvl = 0, slowFor = 0, worst = 0, alive = 0, cool = 0;

    return {
      level: function () { return lvl; },

      /* Возвращает новую ступень или -1, если менять ничего не надо. */
      tick: function (dt) {
        alive += dt;
        if (cool > 0) cool -= dt;
        if (alive < WARMUP || cool > 0) return -1;

        if (dt > SLOW_MS) {
          slowFor += dt;
          if (dt > worst) worst = dt;
        } else {
          slowFor = 0; worst = 0;
        }
        if (slowFor < HOLD) return -1;

        /* Чем хуже, тем длиннее шаг. Иначе до нижней ступени регулятор идёт
           почти восемь секунд, и всё это время человек смотрит на рывки. */
        var jump = worst > HARD_MS ? 2 : 1;
        slowFor = 0; worst = 0;

        if (lvl >= levels.length - 1) return -1;
        lvl = Math.min(levels.length - 1, lvl + jump);
        cool = COOLDOWN;
        return lvl;
      },

      /* Ручная настройка качества сдвигает ступень мимо измерения. */
      setLevel: function (v) { lvl = v; slowFor = 0; worst = 0; cool = COOLDOWN; }
    };
  };

  /* Стартовая догадка уже сделана выше — регулятор начинает с неё. */
  var guard = ROY.makeQualityGuard(LEVELS);
  guard.setLevel(level);

  function measure(dt) {
    if (dt > 0) { fpsSum += 1000 / dt; fpsCount++; }
    fpsWindow += dt;
    if (fpsWindow >= 1000) {
      ROY.fps = fpsSum / Math.max(1, fpsCount);
      fpsSum = 0; fpsCount = 0; fpsWindow = 0;
    }

    if (!scenes.length || ROY.settings.get('graphics') !== 'auto') return;

    var next = guard.tick(dt);
    if (next === -1) return;

    level = next;
    ROY.setQuality(LEVELS[level]);
  }

  /* Какая ступень сейчас и почему. Кабинет показывает это словами: человек
     должен понимать, что картинка беднее не просто так. */
  ROY.qualityState = function () {
    return {
      quality: ROY.quality,
      step: level + 1,
      steps: LEVELS.length,
      manual: ROY.settings.get('graphics') !== 'auto'
    };
  };

  ROY.setQuality = function (q) {
    if (ROY.quality === q) return;
    ROY.quality = q;

    try {
      window.dispatchEvent(new CustomEvent('roy:quality', { detail: ROY.qualityState() }));
    } catch (e) { /* старый браузер — обойдёмся без события */ }
    scenes.forEach(function (s) {
      s.dpr = -1;              // заставляем пересчитать размеры холста
      s.measure();
      if (s.impl.onQuality) s.impl.onQuality(q);
      s.impl.draw();
    });
  };

  /* ------------------------------------------------------------ пересборка */

  var resizeTimer = 0;

  window.addEventListener('resize', function () {
    /* Пересборка сетки или популяции сбрасывает состояние сцены, поэтому
       ждём, пока пользователь закончит тянуть окно. */
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      scenes.forEach(function (s) {
        if (s.measure()) {
          if (s.impl.resize) s.impl.resize();
          s.impl.draw();
        }
      });
    }, 180);
  });

  mqReduce.addEventListener && mqReduce.addEventListener('change', function () {
    scenes.forEach(function (s) {
      if (ROY.reducedMotion()) s.pause(); else s.play();
    });
  });

  ROY.settings.onChange(function (key, value) {
    if (key === 'graphics') {
      level = value === 'low' ? 2 : guessLevel();
      guard.setLevel(level);
      ROY.setQuality(LEVELS[level]);
    }
    if (key === 'motion') {
      scenes.forEach(function (s) {
        if (ROY.reducedMotion()) s.pause(); else s.play();
      });
    }
  });

  /* ------------------------------------------------------------- утилиты */

  /* Плавный переезд параметра. Нужен там, где сцену меняет прокрутка текста:
     мгновенный скачок читается как сбой, а полторы секунды перехода — как
     ответ системы на прочитанный абзац. */
  ROY.tweenParam = function (scene, key, target, ms) {
    if (!scene) return;
    var from = scene.p[key];
    var start = 0;
    ms = ms || 1500;

    if (ROY.reducedMotion()) { scene.set(key, target); return; }

    function tick(now) {
      if (!start) start = now;
      var t = Math.min(1, (now - start) / ms);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;   // easeInOutQuad
      scene.set(key, from + (target - from) * e);
      if (t < 1) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  };

  ROY.start = function () {
    if (rafId) return;
    lastNow = 0;
    rafId = window.requestAnimationFrame(loop);
  };

  /* Отладка: ?warm=3000 прогоняет N шагов до первой отрисовки.
     Нужно потому, что headless-браузер отдаёт единицы кадров rAF за секунды
     виртуального времени, и на скриншот иначе попадает стартовое состояние. */
  ROY.warmup = function (scene, steps) {
    steps = Math.min(steps | 0, 40000);
    for (var i = 0; i < steps; i++) scene.impl.step();
    scene.impl.draw();
  };

  ROY.query = function () {
    var out = {};
    window.location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var p = kv.split('=');
      out[decodeURIComponent(p[0])] = decodeURIComponent(p[1] === undefined ? '' : p[1]);
    });
    return out;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ROY.start);
  } else {
    ROY.start();
  }

})(window, document);
