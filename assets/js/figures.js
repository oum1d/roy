/* РОЙ · схемы к разделу «Где это в природе»
   ------------------------------------------------------------------
   Не фотографии, а чертежи: так делают в атласе и в учебнике. Рисуются
   кодом прямо в SVG, поэтому они точны по смыслу, весят килобайты, чётки
   на любом экране и написаны в палитре сайта.

   Почему не фотографии: генератор изображений уверенно выдаёт красивые,
   но неверные сюжеты — лист клёна вместо крылатки, раковину вместо
   спирали. Подписывать неверное изображение верной подписью в учебном
   материале нельзя, а схема врать не умеет: на ней нарисовано ровно то,
   что названо.
*/
(function (window) {
  'use strict';

  var ROY = window.ROY || (window.ROY = {});

  var INK = '#16181A', MUTED = '#6E7278', LINE = '#B9BCB6',
      GRID = '#E4E2DA', MOSS = '#4A6B4F', OCHRE = '#C4903C',
      CLAY = '#A65543', ULTRA = '#2545E6', PAPER = '#FBFAF6';

  var W = 400, H = 300;

  function rnd(seed) {
    var s = seed | 0 || 1;
    return function () {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };
  }

  function open(title) {
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" ' +
           'role="img" aria-label="' + title + '">' +
           '<rect width="' + W + '" height="' + H + '" fill="' + PAPER + '"/>' +
           grid();
  }

  /* Миллиметровка на подложке — как в тетради. */
  function grid() {
    var out = '<g stroke="' + GRID + '" stroke-width="0.5">';
    for (var x = 20; x < W; x += 20) out += '<path d="M' + x + ' 0V' + H + '"/>';
    for (var y = 20; y < H; y += 20) out += '<path d="M0 ' + y + 'H' + W + '"/>';
    return out + '</g>';
  }

  function close() { return '</svg>'; }

  /* Короткий штрих под углом — им рисуются все птицы. */
  function bird(x, y, ang, len, w) {
    var x2 = x - Math.cos(ang) * len, y2 = y - Math.sin(ang) * len;
    return '<path d="M' + x.toFixed(1) + ' ' + y.toFixed(1) +
           'L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" stroke-width="' + w + '"/>';
  }

  var figures = {};

  /* ======================================================= СКВОРЦЫ */

  /* Стая расступается вокруг хищника и смыкается позади. */
  figures['starlings-1'] = function () {
    var r = rnd(41), out = open('Стая расступается вокруг ястреба и смыкается позади него');
    var hx = 232, hy = 148, hole = 46;

    out += '<g stroke="' + INK + '" stroke-linecap="round" fill="none">';
    for (var i = 0; i < 260; i++) {
      var a = r() * Math.PI * 2;
      var rad = 30 + Math.sqrt(r()) * 120;
      var x = 190 + Math.cos(a) * rad * 1.25;
      var y = 150 + Math.sin(a) * rad * 0.85;
      var dx = x - hx, dy = y - hy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < hole) continue;                       // пустота вокруг хищника
      var ang = Math.atan2(dy, dx) + Math.PI / 2;   // птицы обтекают его по касательной
      if (d > hole * 2.4) ang = a + Math.PI / 2 + (r() - 0.5) * 0.7;
      out += bird(x, y, ang, 5 + r() * 4, r() > 0.7 ? 1.4 : 0.9);
    }
    out += '</g>';

    out += '<g fill="none" stroke="' + CLAY + '" stroke-width="1.6">' +
           '<path d="M' + (hx - 13) + ' ' + hy + 'q13 -11 13 -3q0 -8 13 3q-13 4 -13 11q0 -7 -13 -11z"/>' +
           '</g>';
    out += '<circle cx="' + hx + '" cy="' + hy + '" r="' + hole + '" fill="none" ' +
           'stroke="' + CLAY + '" stroke-width="0.8" stroke-dasharray="3 4"/>';
    return out + close();
  };

  /* Возмущение бежит по стае быстрее, чем летит сама птица. */
  figures['starlings-2'] = function () {
    var r = rnd(77), out = open('Волна поворота пробегает по стае от края к краю');
    out += '<g stroke="' + INK + '" stroke-linecap="round" fill="none">';
    for (var row = 0; row < 11; row++) {
      for (var col = 0; col < 22; col++) {
        var x = 24 + col * 16 + (row % 2) * 8 + (r() - 0.5) * 5;
        var y = 60 + row * 17 + (r() - 0.5) * 5;
        /* Фронт волны — наклонная полоса: внутри неё птицы уже повернули. */
        var front = (x * 0.55 + y * 0.45);
        var turned = front > 130 && front < 190;
        var ang = turned ? -0.95 : -0.1;
        out += bird(x, y, ang + (r() - 0.5) * 0.25, 7, turned ? 1.5 : 0.9);
      }
    }
    out += '</g>';
    out += '<g stroke="' + ULTRA + '" stroke-width="1.2" fill="none">' +
           '<path d="M96 250L215 40" stroke-dasharray="5 5"/>' +
           '<path d="M150 250L269 40" stroke-dasharray="5 5"/>' +
           '<path d="M232 148l26 -15m0 0l-6 10m6 -10l-10 -4"/>' +
           '</g>';
    return out + close();
  };

  /* Вечерний сбор: стая сходится к одному месту ночёвки. */
  figures['starlings-3'] = function () {
    var r = rnd(219), out = open('Стая воронкой сходится к тростнику на ночёвку');
    out += '<g stroke="' + INK + '" stroke-linecap="round" fill="none">';
    for (var i = 0; i < 240; i++) {
      var t = r();
      var spread = 150 * (1 - t) + 12 * t;
      var x = 200 + (r() - 0.5) * spread * 2;
      var y = 20 + t * 200;
      var ang = Math.atan2(230 - y, 200 - x) + (r() - 0.5) * 0.5;
      out += bird(x, y, ang, 4 + r() * 4, r() > 0.75 ? 1.4 : 0.8);
    }
    out += '</g>';
    out += '<g stroke="' + MOSS + '" stroke-width="1.3" fill="none" stroke-linecap="round">';
    for (var k = 0; k < 46; k++) {
      var rx = 70 + k * 6 + (r() - 0.5) * 5;
      var h = 34 + r() * 26;
      out += '<path d="M' + rx.toFixed(0) + ' 292q' + ((r() - 0.5) * 12).toFixed(0) +
             ' -' + (h / 2).toFixed(0) + ' ' + ((r() - 0.5) * 16).toFixed(0) + ' -' + h.toFixed(0) + '"/>';
    }
    out += '</g>';
    return out + close();
  };

  /* ======================================================= ЛЕОПАРД */

  figures['leopard-1'] = function () {
    var r = rnd(9), out = open('Розетки на шкуре леопарда: разорванные кольца одинакового размера');
    out += '<g fill="none" stroke="' + INK + '">';
    for (var gy = 0; gy < 7; gy++) {
      for (var gx = 0; gx < 9; gx++) {
        var cx = 26 + gx * 44 + (gy % 2) * 22 + (r() - 0.5) * 10;
        var cy = 26 + gy * 42 + (r() - 0.5) * 10;
        if (cx > W - 10 || cy > H - 10) continue;
        var rr = 11 + r() * 5;
        /* Розетка — не пятно, а неполное кольцо из двух-трёх дуг. */
        var arcs = 2 + (r() > 0.5 ? 1 : 0);
        for (var a = 0; a < arcs; a++) {
          var a0 = r() * Math.PI * 2, a1 = a0 + 1.1 + r() * 0.9;
          out += '<path stroke-width="' + (2.4 + r() * 1.4).toFixed(1) + '" d="M' +
                 (cx + Math.cos(a0) * rr).toFixed(1) + ' ' + (cy + Math.sin(a0) * rr).toFixed(1) +
                 'A' + rr.toFixed(1) + ' ' + rr.toFixed(1) + ' 0 0 1 ' +
                 (cx + Math.cos(a1) * rr).toFixed(1) + ' ' + (cy + Math.sin(a1) * rr).toFixed(1) + '"/>';
        }
        out += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' +
               (rr * 0.28).toFixed(1) + '" fill="' + OCHRE + '" stroke="none" opacity="0.5"/>';
      }
    }
    return out + '</g>' + close();
  };

  figures['leopard-2'] = function () {
    var r = rnd(153), out = open('Полосы зебры: тот же механизм при другой настройке');
    out += '<g fill="' + INK + '" stroke="none">';
    var x = 8;
    while (x < W - 6) {
      var w = 7 + r() * 13;
      var lean = (r() - 0.5) * 26;
      var taper = 0.35 + r() * 0.6;
      out += '<path d="M' + x.toFixed(1) + ' 0 L' + (x + w).toFixed(1) + ' 0 L' +
             (x + w * taper + lean).toFixed(1) + ' ' + H + ' L' + (x + lean).toFixed(1) + ' ' + H + ' Z"/>';
      x += w + 8 + r() * 14;
    }
    return out + '</g>' + close();
  };

  figures['leopard-3'] = function () {
    var out = open('Раковина: узор записан вдоль края роста, поэтому лежит по спирали');
    var cx = 200, cy = 152, path = '';
    for (var i = 0; i <= 460; i++) {
      var t = i / 460 * Math.PI * 6.2;
      var rr = 5 * Math.exp(0.235 * t);
      var x = cx + Math.cos(t) * rr, y = cy + Math.sin(t) * rr * 0.86;
      path += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    out += '<path d="' + path + '" fill="none" stroke="' + INK + '" stroke-width="1.7"/>';

    /* Полосы поперёк витка — отметки роста. */
    out += '<g stroke="' + CLAY + '" stroke-width="1.6" opacity="0.85">';
    for (var k = 8; k < 96; k += 3) {
      var t2 = k / 96 * Math.PI * 6.2;
      var r1 = 5 * Math.exp(0.235 * t2), r2 = r1 * 0.78;
      out += '<path d="M' + (cx + Math.cos(t2) * r1).toFixed(1) + ' ' + (cy + Math.sin(t2) * r1 * 0.86).toFixed(1) +
             'L' + (cx + Math.cos(t2) * r2).toFixed(1) + ' ' + (cy + Math.sin(t2) * r2 * 0.86).toFixed(1) + '"/>';
    }
    return out + '</g>' + close();
  };

  /* ==================================================== ПАПОРОТНИК */

  figures['fern-1'] = function () {
    var out = open('Улитка папоротника: молодая вайя свёрнута логарифмической спиралью');
    var cx = 215, cy = 175, path = '';
    for (var i = 0; i <= 420; i++) {
      var t = i / 420 * Math.PI * 4.6;
      var rr = 3.2 * Math.exp(0.30 * t);
      path += (i ? 'L' : 'M') + (cx + Math.cos(t) * rr).toFixed(1) + ' ' + (cy + Math.sin(t) * rr).toFixed(1);
    }
    out += '<path d="' + path + '" fill="none" stroke="' + MOSS + '" stroke-width="4" stroke-linecap="round"/>';
    out += '<path d="M' + (cx + Math.cos(Math.PI * 4.6) * 3.2 * Math.exp(0.30 * Math.PI * 4.6)).toFixed(1) +
           ' ' + (cy + Math.sin(Math.PI * 4.6) * 3.2 * Math.exp(0.30 * Math.PI * 4.6)).toFixed(1) +
           'q-30 60 -22 108" fill="none" stroke="' + MOSS + '" stroke-width="4.5" stroke-linecap="round"/>';

    /* Зачатки перьев вдоль витка. */
    var r = rnd(5);
    out += '<g stroke="' + MOSS + '" stroke-width="1.5" stroke-linecap="round" fill="none">';
    for (var k = 14; k < 96; k += 2) {
      var t2 = k / 96 * Math.PI * 4.6;
      var rr2 = 3.2 * Math.exp(0.30 * t2);
      var x = cx + Math.cos(t2) * rr2, y = cy + Math.sin(t2) * rr2;
      var n = t2 + Math.PI / 2;
      var l = 5 + rr2 * 0.16;
      out += '<path d="M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'l' + (Math.cos(n) * l).toFixed(1) +
             ' ' + (Math.sin(n) * l).toFixed(1) + '"/>';
    }
    return out + '</g>' + close();
  };

  figures['fern-2'] = function () {
    var out = open('Вайя папоротника: перья сидят вдоль главной оси и повторяют её форму');
    var segs = [];

    function frond(x, y, dir, len, level) {
      if (level > 2 || len < 5) return;
      var steps = 7, sl = len / steps, curl = 0.055;
      for (var i = 0; i < steps; i++) {
        var x2 = x + Math.cos(dir) * sl, y2 = y + Math.sin(dir) * sl;
        segs.push([x, y, x2, y2, Math.max(0.7, (3 - level) * 1.15)]);
        x = x2; y = y2; dir += curl;
        if (level < 2 && i > 0) {
          var taper = 1 - (i / steps) * 0.7;
          frond(x, y, dir - 0.42, len * 0.4 * taper, level + 1);
          frond(x, y, dir + 0.42, len * 0.4 * taper, level + 1);
        }
      }
    }
    frond(200, 285, -Math.PI / 2, 190, 0);

    out += '<g stroke="' + MOSS + '" stroke-linecap="round" fill="none">';
    segs.forEach(function (s) {
      out += '<path stroke-width="' + s[4].toFixed(1) + '" d="M' + s[0].toFixed(1) + ' ' + s[1].toFixed(1) +
             'L' + s[2].toFixed(1) + ' ' + s[3].toFixed(1) + '"/>';
    });
    return out + '</g>' + close();
  };

  figures['fern-3'] = function () {
    var out = open('Самоподобие: перо повторяет вайю, а его часть повторяет перо');
    var scales = [{ x: 78, y: 250, l: 150 }, { x: 218, y: 232, l: 88 }, { x: 320, y: 214, l: 48 }];

    scales.forEach(function (s, idx) {
      var segs = [];
      (function frond(x, y, dir, len, level) {
        if (level > 2 || len < 4) return;
        var steps = 6, sl = len / steps;
        for (var i = 0; i < steps; i++) {
          var x2 = x + Math.cos(dir) * sl, y2 = y + Math.sin(dir) * sl;
          segs.push([x, y, x2, y2, Math.max(0.6, (3 - level))]);
          x = x2; y = y2; dir += 0.06;
          if (level < 2 && i > 0) {
            var t = 1 - (i / steps) * 0.7;
            frond(x, y, dir - 0.45, len * 0.4 * t, level + 1);
            frond(x, y, dir + 0.45, len * 0.4 * t, level + 1);
          }
        }
      })(s.x, s.y, -Math.PI / 2, s.l, 0);

      out += '<g stroke="' + (idx === 0 ? MOSS : idx === 1 ? INK : MUTED) + '" stroke-linecap="round" fill="none">';
      segs.forEach(function (g) {
        out += '<path stroke-width="' + (g[4] * 0.55).toFixed(1) + '" d="M' + g[0].toFixed(1) + ' ' + g[1].toFixed(1) +
               'L' + g[2].toFixed(1) + ' ' + g[3].toFixed(1) + '"/>';
      });
      out += '</g>';
    });

    out += '<g stroke="' + ULTRA + '" stroke-width="1" fill="none" stroke-dasharray="3 3">' +
           '<path d="M150 210l52 -6"/><path d="M268 196l40 -4"/></g>';
    return out + close();
  };

  /* ========================================================= ВОЛНЫ */

  figures['waves-1'] = function () {
    var out = open('Два источника на воде: кольца проходят друг сквозь друга');
    var s1 = { x: 145, y: 150 }, s2 = { x: 255, y: 150 };
    out += '<g fill="none" stroke="' + INK + '" opacity="0.55">';
    for (var k = 1; k <= 12; k++) {
      out += '<circle cx="' + s1.x + '" cy="' + s1.y + '" r="' + (k * 17) + '" stroke-width="1"/>';
      out += '<circle cx="' + s2.x + '" cy="' + s2.y + '" r="' + (k * 17) + '" stroke-width="1"/>';
    }
    out += '</g>';
    out += '<g fill="' + ULTRA + '"><circle cx="' + s1.x + '" cy="' + s1.y + '" r="4"/>' +
           '<circle cx="' + s2.x + '" cy="' + s2.y + '" r="4"/></g>';
    return out + close();
  };

  figures['waves-2'] = function () {
    var out = open('Сложение волн: гребень с гребнем усиливаются, гребень с впадиной гасятся');

    function wave(y, phase, colour, width) {
      var d = '';
      for (var x = 0; x <= 380; x += 4) {
        var v = Math.sin((x / 380) * Math.PI * 6 + phase) * 20;
        d += (x ? 'L' : 'M') + (10 + x) + ' ' + (y + v).toFixed(1);
      }
      return '<path d="' + d + '" fill="none" stroke="' + colour + '" stroke-width="' + width + '"/>';
    }

    function sum(y, phase, colour) {
      var d = '';
      for (var x = 0; x <= 380; x += 4) {
        var v = (Math.sin((x / 380) * Math.PI * 6) + Math.sin((x / 380) * Math.PI * 6 + phase)) * 20;
        d += (x ? 'L' : 'M') + (10 + x) + ' ' + (y + v).toFixed(1);
      }
      return '<path d="' + d + '" fill="none" stroke="' + colour + '" stroke-width="2.2"/>';
    }

    out += wave(46, 0, LINE, 1.4) + wave(46, 0, LINE, 1.4) + sum(46, 0, MOSS);
    out += '<path d="M10 96H390" stroke="' + GRID + '"/>';
    out += wave(160, 0, LINE, 1.4) + wave(160, Math.PI, LINE, 1.4) + sum(160, Math.PI, CLAY);
    out += '<path d="M10 210H390" stroke="' + GRID + '"/>';
    out += wave(250, 0, LINE, 1.4) + wave(250, Math.PI / 2, LINE, 1.4) + sum(250, Math.PI / 2, INK);
    return out + close();
  };

  figures['waves-3'] = function () {
    var out = open('Волна огибает препятствие и расходится за ним полукругами');
    out += '<g fill="none" stroke="' + INK + '" opacity="0.6" stroke-width="1">';
    for (var k = 0; k < 7; k++) out += '<path d="M' + (18 + k * 20) + ' 20V132"/>';
    out += '</g>';
    out += '<g fill="none" stroke="' + INK + '" opacity="0.6" stroke-width="1">';
    for (var j = 1; j <= 9; j++) out += '<circle cx="160" cy="150" r="' + (j * 21) + '"/>';
    out += '</g>';
    out += '<rect x="150" y="0" width="20" height="138" fill="' + INK + '"/>' +
           '<rect x="150" y="162" width="20" height="138" fill="' + INK + '"/>';
    out += '<g fill="none" stroke="' + INK + '" opacity="0.6" stroke-width="1">';
    for (var m = 0; m < 7; m++) out += '<path d="M' + (18 + m * 20) + ' 168V280"/>';
    return out + '</g>' + close();
  };

  /* ==================================================== СЕМЯ КЛЁНА */

  function samaraGlyph(cx, cy, ang, scale) {
    var s = scale || 1;
    return '<g transform="translate(' + cx + ',' + cy + ') rotate(' + ang + ') scale(' + s + ')">' +
           '<path d="M0 0q22 -9 44 -3q-20 9 -44 3z" fill="' + OCHRE + '" opacity="0.55"/>' +
           '<path d="M0 0q22 -9 44 -3" fill="none" stroke="' + INK + '" stroke-width="1.6"/>' +
           '<ellipse cx="-4" cy="1" rx="6.5" ry="4.6" fill="' + INK + '"/>' +
           '</g>';
  }

  figures['samara-1'] = function () {
    var out = open('Устройство крылатки: утолщение с семенем и одна несущая лопасть');
    /* Оси вращения рисуем первыми, чтобы крылатка легла поверх них. */
    out += '<g stroke="' + MUTED + '" stroke-width="0.9" stroke-dasharray="3 3">' +
           '<path d="M120 150H330"/><path d="M120 62V238"/></g>';

    /* Кольцо вращения вокруг самого семени, со стрелкой на дуге. */
    out += '<g fill="none" stroke="' + ULTRA + '" stroke-width="1.5">' +
           '<circle cx="120" cy="150" r="58" stroke-dasharray="5 5" opacity="0.8"/>' +
           '<path d="M120 92l9 6l-11 4z" fill="' + ULTRA + '" stroke="none"/>' +
           '</g>';

    out += samaraGlyph(120, 150, -8, 2.2);
    return out + close();
  };

  figures['samara-2'] = function () {
    var out = open('Крылатка снижается по спирали: вращение удерживает её в воздухе');
    var d = '';
    for (var i = 0; i <= 300; i++) {
      var t = i / 300;
      var x = 200 + Math.cos(t * Math.PI * 8) * 62 + t * 70;
      var y = 22 + t * 250;
      d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    out += '<path d="' + d + '" fill="none" stroke="' + MUTED + '" stroke-width="1.2"/>';
    out += samaraGlyph(200 + Math.cos(0) * 62, 22, 12, 1);
    out += samaraGlyph(200 + Math.cos(4 * Math.PI) * 62 + 35, 147, 12, 1);
    out += samaraGlyph(200 + Math.cos(8 * Math.PI) * 62 + 70, 272, 12, 1);
    out += '<path d="M14 288H386" stroke="' + LINE + '" stroke-width="1"/>';
    return out + close();
  };

  figures['samara-3'] = function () {
    var out = open('Два решения одной задачи: винт у клёна и парашют у одуванчика');
    var d = '';
    for (var i = 0; i <= 200; i++) {
      var t = i / 200;
      var x = 105 + Math.cos(t * Math.PI * 6) * 38;
      var y = 30 + t * 230;
      d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    out += '<path d="' + d + '" fill="none" stroke="' + MUTED + '" stroke-width="1.1"/>';
    out += samaraGlyph(105, 30, 10, 0.85);

    /* Одуванчик: пологий снос вместо спирали. */
    var d2 = '';
    for (var k = 0; k <= 200; k++) {
      var t2 = k / 200;
      var x2 = 250 + t2 * 110 + Math.sin(t2 * Math.PI * 3) * 10;
      var y2 = 30 + t2 * 230;
      d2 += (k ? 'L' : 'M') + x2.toFixed(1) + ' ' + y2.toFixed(1);
    }
    out += '<path d="' + d2 + '" fill="none" stroke="' + MUTED + '" stroke-width="1.1"/>';

    out += '<g stroke="' + INK + '" stroke-width="1.1" fill="none">';
    for (var a = 0; a < 14; a++) {
      var ang = (a / 14) * Math.PI * 2;
      out += '<path d="M250 30l' + (Math.cos(ang) * 15).toFixed(1) + ' ' + (Math.sin(ang) * 15).toFixed(1) + '"/>';
    }
    out += '<path d="M250 30v16"/></g>';
    out += '<path d="M14 288H386" stroke="' + LINE + '" stroke-width="1"/>';
    return out + close();
  };

  /* ========================================================== ПРОБКА */

  function car(x, y, w) {
    return '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + (w || 9) + '" height="7" fill="' + INK + '"/>';
  }

  figures['traffic-1'] = function () {
    var out = open('Машины едут вправо, а волна торможения ползёт влево');
    var rows = [0, 1, 2, 3, 4];

    rows.forEach(function (r) {
      var y = 44 + r * 44;
      out += '<path d="M24 ' + (y + 12) + 'H376" stroke="' + GRID + '" stroke-width="1"/>';
      /* Пробка сдвигается влево на каждой следующей строке времени. */
      var jam = 250 - r * 34;
      for (var k = 0; k < 9; k++) {
        var x = 34 + k * 38;
        var inJam = x > jam - 26 && x < jam + 26;
        out += car(inJam ? jam - 24 + (x - jam + 26) * 0.42 : x, y, inJam ? 8 : 9);
      }
      out += '<text x="6" y="' + (y + 10) + '" font-family="monospace" font-size="9" fill="' + MUTED + '">t' + r + '</text>';
    });

    out += '<g stroke="' + CLAY + '" stroke-width="1.6" fill="none">' +
           '<path d="M262 34L104 232" stroke-dasharray="5 4"/>' +
           '<path d="M104 232l14 -4l-3 13z" fill="' + CLAY + '" stroke="none"/></g>';
    out += '<g stroke="' + ULTRA + '" stroke-width="1.5" fill="none">' +
           '<path d="M300 268h44"/><path d="M344 268l-9 -5v10z" fill="' + ULTRA + '" stroke="none"/></g>';
    return out + close();
  };

  figures['traffic-2'] = function () {
    var out = open('При редком потоке случайное торможение рассасывается');
    var r = rnd(21);
    out += '<g fill="' + INK + '">';
    for (var t = 0; t < 12; t++) {
      var y = 16 + t * 23;
      var spread = 6 + t * 5;                 // возмущение расплывается и гаснет
      var alpha = Math.max(0, 1 - t * 0.13);
      out += '<g opacity="' + alpha.toFixed(2) + '">';
      for (var k = 0; k < 5; k++) {
        out += '<rect x="' + (196 + (r() - 0.5) * spread * 2).toFixed(0) + '" y="' + y + '" width="7" height="6"/>';
      }
      out += '</g>';
    }
    return out + '</g>' + close();
  };

  figures['traffic-3'] = function () {
    var out = open('За порогом плотности возмущение растёт и превращается в пробку');
    var r = rnd(83);
    out += '<g fill="' + INK + '">';
    for (var t = 0; t < 12; t++) {
      var y = 16 + t * 23;
      var w = 10 + t * 13;                    // полоса ширится
      var cx = 214 - t * 9;                   // и уходит влево
      for (var k = 0; k < 3 + t; k++) {
        out += '<rect x="' + (cx - w / 2 + (k / Math.max(1, 2 + t)) * w + (r() - 0.5) * 4).toFixed(0) +
               '" y="' + y + '" width="7" height="6"/>';
      }
    }
    return out + '</g>' + close();
  };

  /* ========================================================== МУРАВЬИ */

  function nestFood(out) {
    return out +
      '<circle cx="60" cy="150" r="13" fill="none" stroke="' + CLAY + '" stroke-width="1.8"/>' +
      '<circle cx="340" cy="150" r="11" fill="none" stroke="' + MOSS + '" stroke-width="1.8"/>';
  }

  figures['ants-1'] = function () {
    var out = open('Две дороги от муравейника к еде: короткая и длинная');
    out = nestFood(out);
    out += '<path d="M73 150H327" fill="none" stroke="' + INK + '" stroke-width="7" opacity="0.85"/>';
    out += '<path d="M70 141C140 40 260 40 331 140" fill="none" stroke="' + INK + '" stroke-width="7" opacity="0.85"/>';
    out += '<g fill="' + INK + '">';
    for (var k = 0; k < 16; k++) out += '<rect x="' + (84 + k * 15) + '" y="147" width="3" height="3"/>';
    out += '</g>';
    return out + close();
  };

  figures['ants-2'] = function () {
    var out = open('Через время след на длинной дороге выветрился');
    out = nestFood(out);
    out += '<path d="M73 150H327" fill="none" stroke="' + INK + '" stroke-width="11" opacity="0.9"/>';
    out += '<path d="M70 141C140 40 260 40 331 140" fill="none" stroke="' + INK + '" stroke-width="2" opacity="0.20" stroke-dasharray="6 9"/>';
    out += '<g fill="' + INK + '">';
    for (var k = 0; k < 22; k++) out += '<rect x="' + (80 + k * 11) + '" y="146" width="3.4" height="3.4"/>';
    return out + '</g>' + close();
  };

  figures['ants-3'] = function () {
    var out = open('Классический опыт с двойным мостом: колония выбирает короткую ветвь');
    out = nestFood(out);
    out += '<path d="M73 150H150" fill="none" stroke="' + INK + '" stroke-width="8"/>';
    out += '<path d="M250 150H327" fill="none" stroke="' + INK + '" stroke-width="8"/>';
    out += '<path d="M150 150C175 150 175 92 200 92C225 92 225 150 250 150" fill="none" stroke="' + INK + '" stroke-width="2" opacity="0.25"/>';
    out += '<path d="M150 150C175 150 175 214 200 214C225 214 225 150 250 150" fill="none" stroke="' + INK + '" stroke-width="8"/>';
    out += '<g stroke="' + ULTRA + '" stroke-width="1.3" fill="none" stroke-dasharray="4 4">' +
           '<path d="M200 232v22"/></g>';
    return out + close();
  };

  /* ========================================================= СНЕЖИНКА */

  /* Шестиугольник по центру с заданным радиусом. */
  function hex(cx, cy, r, attrs) {
    var d = '';
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 6 + i * Math.PI / 3;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1);
    }
    return '<path d="' + d + 'Z" ' + attrs + '/>';
  }

  figures['snowflake-1'] = function () {
    var out = open('Шестиугольная решётка льда: угол между связями около 120 градусов');
    var R = 26;
    for (var row = -3; row <= 3; row++) {
      for (var col = -4; col <= 4; col++) {
        var cx = 200 + col * R * 1.74 + (row & 1 ? R * 0.87 : 0);
        var cy = 150 + row * R * 1.5;
        if (cx < 10 || cx > 390) continue;
        out += hex(cx, cy, R, 'fill="none" stroke="' + LINE + '" stroke-width="1"');
      }
    }
    out += hex(200, 150, R, 'fill="none" stroke="' + ULTRA + '" stroke-width="2.2"');
    out += '<g stroke="' + ULTRA + '" stroke-width="1.6" fill="none">';
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 6 + i * Math.PI / 3;
      out += '<path d="M200 150L' + (200 + Math.cos(a) * R).toFixed(1) + ' ' + (150 + Math.sin(a) * R).toFixed(1) + '"/>';
    }
    return out + '</g>' + close();
  };

  function crystal(seed, arms, branchy, title) {
    var out = open(title);
    var r = rnd(seed);
    out += '<g stroke="' + INK + '" stroke-linecap="round" fill="none">';
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3 - Math.PI / 2;
      var L = arms;
      out += '<path stroke-width="4" d="M200 150l' + (Math.cos(a) * L).toFixed(1) + ' ' + (Math.sin(a) * L).toFixed(1) + '"/>';
      /* Боковые веточки: чем «влажнее», тем их больше и длиннее. */
      for (var k = 1; k <= branchy; k++) {
        var t = k / (branchy + 1);
        var bx = 200 + Math.cos(a) * L * t;
        var by = 150 + Math.sin(a) * L * t;
        var bl = L * 0.30 * (1 - t) * (0.7 + r() * 0.6);
        out += '<path stroke-width="2.2" d="M' + bx.toFixed(1) + ' ' + by.toFixed(1) +
               'l' + (Math.cos(a - 1.05) * bl).toFixed(1) + ' ' + (Math.sin(a - 1.05) * bl).toFixed(1) + '"/>';
        out += '<path stroke-width="2.2" d="M' + bx.toFixed(1) + ' ' + by.toFixed(1) +
               'l' + (Math.cos(a + 1.05) * bl).toFixed(1) + ' ' + (Math.sin(a + 1.05) * bl).toFixed(1) + '"/>';
      }
    }
    out += '</g>';
    return out + close();
  }

  figures['snowflake-2'] = function () {
    var out = open('Пластинка: в сухом воздухе кристалл растёт плотным шестиугольником');
    out += hex(200, 150, 96, 'fill="' + INK + '" opacity="0.86" stroke="none"');
    out += hex(200, 150, 62, 'fill="none" stroke="' + PAPER + '" stroke-width="2" opacity="0.5"');
    out += hex(200, 150, 30, 'fill="none" stroke="' + PAPER + '" stroke-width="2" opacity="0.5"');
    return out + close();
  };

  figures['snowflake-3'] = function () {
    return crystal(404, 118, 5, 'Звезда: во влажном воздухе края обгоняют середину');
  };

  /* ============================================================ ПЕСОК */

  figures['sand-1'] = function () {
    var out = open('Куча песка держит один и тот же угол откоса, сколько ни подсыпай');
    out += '<path d="M20 262H380" stroke="' + LINE + '" stroke-width="1.2" fill="none"/>';
    out += '<path d="M120 262L200 130L280 262Z" fill="' + OCHRE + '" opacity="0.30"/>';
    out += '<path d="M120 262L200 130L280 262" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    out += '<path d="M150 262L200 180L250 262" fill="none" stroke="' + INK + '" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>';
    out += '<path d="M200 262V130" stroke="' + MUTED + '" stroke-width="0.9" stroke-dasharray="3 3" fill="none"/>';
    out += '<path d="M247 262a58 58 0 0 0 -14 -34" fill="none" stroke="' + ULTRA + '" stroke-width="1.5"/>';
    out += '<g fill="' + INK + '">';
    for (var k = 0; k < 9; k++) out += '<rect x="' + (197 + (k % 3) * 3) + '" y="' + (20 + k * 11) + '" width="3" height="3"/>';
    return out + '</g>' + close();
  };

  figures['sand-2'] = function () {
    var out = open('Вода растекается до горизонтали, песок останавливается склоном');
    out += '<path d="M20 140H190" stroke="' + LINE + '" stroke-width="1.2" fill="none"/>';
    out += '<path d="M28 140h154v-16H28z" fill="' + ULTRA + '" opacity="0.22"/>';
    out += '<path d="M28 124h154" fill="none" stroke="' + ULTRA + '" stroke-width="1.6"/>';

    out += '<path d="M210 140H380" stroke="' + LINE + '" stroke-width="1.2" fill="none"/>';
    out += '<path d="M248 140L295 88L342 140Z" fill="' + OCHRE + '" opacity="0.30"/>';
    out += '<path d="M248 140L295 88L342 140" fill="none" stroke="' + INK + '" stroke-width="1.8"/>';

    out += '<path d="M20 286H380" stroke="' + LINE + '" stroke-width="1.2" fill="none"/>';
    out += '<path d="M28 286h154v-30H28z" fill="' + ULTRA + '" opacity="0.22"/>';
    out += '<path d="M28 256h154" fill="none" stroke="' + ULTRA + '" stroke-width="1.6"/>';
    out += '<path d="M232 286L295 200L358 286Z" fill="' + OCHRE + '" opacity="0.30"/>';
    out += '<path d="M232 286L295 200L358 286" fill="none" stroke="' + INK + '" stroke-width="1.8"/>';
    out += '<path d="M196 96v210" stroke="' + GRID + '" stroke-width="1" fill="none"/>';
    return out + close();
  };

  figures['sand-3'] = function () {
    var out = open('Песочные часы: поток не зависит от того, сколько песка осталось сверху');
    out += '<g fill="none" stroke="' + INK + '" stroke-width="2">' +
           '<path d="M130 26h140L206 150l64 124H130l64 -124z"/></g>';
    out += '<path d="M144 40h112L204 138z" fill="' + OCHRE + '" opacity="0.35"/>';
    out += '<path d="M152 260h96L200 208z" fill="' + OCHRE + '" opacity="0.45"/>';
    out += '<g fill="' + INK + '">';
    for (var k = 0; k < 7; k++) out += '<rect x="199" y="' + (150 + k * 8) + '" width="3" height="4"/>';
    out += '</g>';
    out += '<g stroke="' + ULTRA + '" stroke-width="1.4" fill="none">' +
           '<path d="M292 60v76"/><path d="M292 136l-5 -9h10z" fill="' + ULTRA + '" stroke="none"/>' +
           '<path d="M292 168v76"/><path d="M292 244l-5 -9h10z" fill="' + ULTRA + '" stroke="none"/></g>';
    return out + close();
  };

  /* ======================================================== СВЕТЛЯЧКИ */

  function phaseRing(cx, cy, R, phases, colour) {
    var out = '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="' + LINE + '" stroke-width="1"/>';
    phases.forEach(function (p) {
      var a = p * Math.PI * 2 - Math.PI / 2;
      out += '<circle cx="' + (cx + Math.cos(a) * R).toFixed(1) + '" cy="' + (cy + Math.sin(a) * R).toFixed(1) +
             '" r="4" fill="' + colour + '"/>';
    });
    return out;
  }

  figures['fireflies-1'] = function () {
    var out = open('На старте таймеры светлячков разбросаны по всему кругу');
    var r = rnd(61), ph = [];
    for (var i = 0; i < 16; i++) ph.push(r());
    out += phaseRing(200, 150, 96, ph, INK);
    out += '<circle cx="200" cy="150" r="3" fill="' + MUTED + '"/>';
    return out + close();
  };

  figures['fireflies-2'] = function () {
    var out = open('Через время таймеры сходятся в одну точку круга');
    var r = rnd(61), ph = [];
    for (var i = 0; i < 16; i++) ph.push(0.22 + (r() - 0.5) * 0.06);
    out += phaseRing(200, 150, 96, ph, OCHRE);
    out += '<circle cx="200" cy="150" r="3" fill="' + MUTED + '"/>';
    var a = 0.22 * Math.PI * 2 - Math.PI / 2;
    out += '<path d="M200 150L' + (200 + Math.cos(a) * 96).toFixed(1) + ' ' + (150 + Math.sin(a) * 96).toFixed(1) +
           '" stroke="' + OCHRE + '" stroke-width="1.6" fill="none"/>';
    return out + close();
  };

  figures['fireflies-3'] = function () {
    var out = open('Клетки водителя ритма сердца работают по тому же правилу');
    var d = '', x = 14;
    /* Ровный пульс: одинаковые всплески через равные промежутки. */
    for (var k = 0; k < 5; k++) {
      d += 'M' + x + ' 200h34l6 -22l7 46l7 -70l7 60l6 -14h34';
      x += 101;
    }
    out += '<path d="' + d + '" fill="none" stroke="' + CLAY + '" stroke-width="2" stroke-linejoin="round"/>';
    out += '<g stroke="' + GRID + '" stroke-width="1" fill="none">';
    for (var g = 0; g < 5; g++) out += '<path d="M' + (14 + g * 101) + ' 60v230"/>';
    return out + '</g>' + close();
  };

  /* ============================================================== РЫБЫ */

  function shoal(cx, cy, n, colour, seed, spread) {
    var r = rnd(seed), out = '<g stroke="' + colour + '" stroke-width="1.6" stroke-linecap="round" fill="none">';
    for (var i = 0; i < n; i++) {
      var a = r() * Math.PI * 2, rad = Math.sqrt(r()) * spread;
      var x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad * 0.8;
      var d = -0.6 + (r() - 0.5) * 0.5;
      out += '<path d="M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'l' +
             (Math.cos(d) * 8).toFixed(1) + ' ' + (Math.sin(d) * 8).toFixed(1) + '"/>';
    }
    return out + '</g>';
  }

  figures['fish-1'] = function () {
    var out = open('На старте мнения в стае разделены почти поровну');
    out += '<circle cx="96" cy="70" r="12" fill="none" stroke="' + MOSS + '" stroke-width="1.7"/>';
    out += '<circle cx="304" cy="70" r="12" fill="none" stroke="' + MOSS + '" stroke-width="1.7"/>';
    out += shoal(200, 200, 26, INK, 11, 62);
    out += shoal(200, 200, 24, CLAY, 29, 62);
    out += '<path d="M40 276h320" stroke="' + GRID + '" stroke-width="5"/>';
    out += '<path d="M40 276h160" stroke="' + INK + '" stroke-width="5"/>';
    out += '<path d="M200 268v16" stroke="' + MUTED + '" stroke-width="1.4"/>';
    return out + close();
  };

  figures['fish-2'] = function () {
    var out = open('Небольшой перевес усиливает сам себя и охватывает всю стаю');
    out += '<circle cx="96" cy="70" r="12" fill="none" stroke="' + LINE + '" stroke-width="1.7"/>';
    out += '<circle cx="304" cy="70" r="12" fill="none" stroke="' + MOSS + '" stroke-width="1.7"/>';
    out += shoal(250, 170, 40, CLAY, 41, 66);
    out += shoal(150, 214, 6, INK, 7, 26);
    out += '<g stroke="' + ULTRA + '" stroke-width="1.6" fill="none">' +
           '<path d="M168 218C196 210 214 196 236 184"/>' +
           '<path d="M236 184l-13 1l6 9z" fill="' + ULTRA + '" stroke="none"/></g>';
    out += '<path d="M40 276h320" stroke="' + GRID + '" stroke-width="5"/>';
    out += '<path d="M40 276h58" stroke="' + INK + '" stroke-width="5"/>';
    out += '<path d="M200 268v16" stroke="' + MUTED + '" stroke-width="1.4"/>';
    return out + close();
  };

  figures['fish-3'] = function () {
    var out = open('Разделённая стая защищена хуже целой');
    out += shoal(108, 110, 34, INK, 5, 52);
    out += '<text x="108" y="196" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MUTED + '">целая</text>';
    out += shoal(292, 84, 15, INK, 13, 34);
    out += shoal(300, 168, 14, INK, 23, 32);
    out += '<text x="296" y="230" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MUTED + '">разделённая</text>';
    out += '<path d="M200 24v250" stroke="' + GRID + '" stroke-width="1"/>';
    out += '<g fill="none" stroke="' + CLAY + '" stroke-width="1.6">' +
           '<path d="M280 250q13 -11 13 -3q0 -8 13 3q-13 4 -13 11q0 -7 -13 -11z"/></g>';
    return out + close();
  };

  /* ============================================================== СОТЫ */

  figures['bees-1'] = function () {
    var out = open('Вокруг круга помещается ровно шесть таких же кругов');
    var R = 46;
    out += '<circle cx="200" cy="150" r="' + R + '" fill="' + OCHRE + '" opacity="0.24"/>';
    out += '<circle cx="200" cy="150" r="' + R + '" fill="none" stroke="' + INK + '" stroke-width="1.8"/>';
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3;
      var x = 200 + Math.cos(a) * R * 2, y = 150 + Math.sin(a) * R * 2;
      out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + R + '" fill="none" stroke="' + LINE + '" stroke-width="1.4"/>';
      out += '<path d="M200 150L' + x.toFixed(1) + ' ' + y.toFixed(1) + '" stroke="' + ULTRA + '" stroke-width="0.9" stroke-dasharray="3 3" fill="none"/>';
    }
    return out + close();
  };

  figures['bees-2'] = function () {
    var out = open('Стенка встаёт ровно посередине между двумя центрами');
    out += '<circle cx="132" cy="150" r="66" fill="' + OCHRE + '" opacity="0.20"/>';
    out += '<circle cx="268" cy="150" r="66" fill="' + OCHRE + '" opacity="0.20"/>';
    out += '<circle cx="132" cy="150" r="66" fill="none" stroke="' + LINE + '" stroke-width="1.3"/>';
    out += '<circle cx="268" cy="150" r="66" fill="none" stroke="' + LINE + '" stroke-width="1.3"/>';
    out += '<path d="M200 56v188" stroke="' + INK + '" stroke-width="2.6" fill="none"/>';
    out += '<g fill="' + INK + '"><circle cx="132" cy="150" r="3.4"/><circle cx="268" cy="150" r="3.4"/></g>';
    out += '<path d="M132 150H268" stroke="' + MUTED + '" stroke-width="0.9" stroke-dasharray="3 3" fill="none"/>';
    return out + close();
  };

  figures['bees-3'] = function () {
    var out = open('На одинаковую площадь шестиугольник тратит меньше стенки');
    var shapes = [
      { cx: 78,  label: 'треугольник', n: 3 },
      { cx: 200, label: 'квадрат',     n: 4 },
      { cx: 322, label: 'шестиугольник', n: 6 }
    ];
    shapes.forEach(function (s) {
      var d = '';
      var R = s.n === 3 ? 62 : s.n === 4 ? 52 : 48;
      for (var i = 0; i < s.n; i++) {
        var a = -Math.PI / 2 + i * Math.PI * 2 / s.n;
        d += (i ? 'L' : 'M') + (s.cx + Math.cos(a) * R).toFixed(1) + ' ' + (140 + Math.sin(a) * R).toFixed(1);
      }
      out += '<path d="' + d + 'Z" fill="' + OCHRE + '" opacity="0.22" stroke="' +
             (s.n === 6 ? INK : LINE) + '" stroke-width="' + (s.n === 6 ? 2.4 : 1.5) + '"/>';
      out += '<text x="' + s.cx + '" y="232" text-anchor="middle" font-family="monospace" font-size="9" fill="' + MUTED + '">' + s.label + '</text>';
    });
    out += '<g fill="' + MUTED + '" font-family="monospace" font-size="10">' +
           '<text x="78" y="252" text-anchor="middle">длиннее</text>' +
           '<text x="200" y="252" text-anchor="middle">средне</text>' +
           '<text x="322" y="252" text-anchor="middle" fill="' + MOSS + '">короче</text></g>';
    return out + close();
  };

  /* =========================================================== ТРЕЩИНЫ */

  figures['cracks-1'] = function () {
    var out = open('Тройной стык по 120 градусов: трещины пошли одновременно');
    out += '<rect x="14" y="14" width="372" height="272" fill="' + OCHRE + '" opacity="0.14"/>';
    out += '<g stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round">';
    for (var i = 0; i < 3; i++) {
      var a = -Math.PI / 2 + i * Math.PI * 2 / 3;
      out += '<path d="M200 150l' + (Math.cos(a) * 120).toFixed(1) + ' ' + (Math.sin(a) * 120).toFixed(1) + '"/>';
    }
    out += '</g>';
    out += '<path d="M200 106a44 44 0 0 1 38 22" fill="none" stroke="' + ULTRA + '" stroke-width="1.5"/>';
    out += '<text x="248" y="118" font-family="monospace" font-size="11" fill="' + ULTRA + '">120°</text>';
    return out + close();
  };

  figures['cracks-2'] = function () {
    var out = open('Прямой угол: поздняя трещина упёрлась в раннюю');
    out += '<rect x="14" y="14" width="372" height="272" fill="' + OCHRE + '" opacity="0.14"/>';
    out += '<path d="M60 150H340" stroke="' + INK + '" stroke-width="3.6" fill="none"/>';
    out += '<text x="66" y="140" font-family="monospace" font-size="9" fill="' + MUTED + '">первая</text>';
    out += '<path d="M200 150V262" stroke="' + INK + '" stroke-width="3" fill="none"/>';
    out += '<text x="208" y="248" font-family="monospace" font-size="9" fill="' + MUTED + '">вторая</text>';
    out += '<path d="M200 176h22v-22" fill="none" stroke="' + ULTRA + '" stroke-width="1.5"/>';
    out += '<text x="230" y="176" font-family="monospace" font-size="11" fill="' + ULTRA + '">90°</text>';
    return out + close();
  };

  figures['cracks-3'] = function () {
    var out = open('Базальтовые столбы: та же сетка, только в остывающей лаве');
    var r = rnd(313);
    var pts = [];
    for (var row = 0; row < 5; row++) {
      for (var col = 0; col < 7; col++) {
        pts.push([34 + col * 56 + (row % 2) * 28 + (r() - 0.5) * 9,
                  40 + row * 56 + (r() - 0.5) * 9]);
      }
    }
    out += '<rect width="400" height="300" fill="' + MUTED + '" opacity="0.10"/>';
    out += '<g stroke="' + INK + '" stroke-width="1.6" fill="none">';
    pts.forEach(function (p) {
      var d = '';
      for (var i = 0; i < 6; i++) {
        var a = Math.PI / 6 + i * Math.PI / 3;
        d += (i ? 'L' : 'M') + (p[0] + Math.cos(a) * 30).toFixed(1) + ' ' + (p[1] + Math.sin(a) * 30).toFixed(1);
      }
      out += '<path d="' + d + 'Z"/>';
    });
    return out + '</g>' + close();
  };

  /* ============================================================ КРОНА */

  figures['canopy-1'] = function () {
    var out = open('Ветка растёт в сторону среднего направления на ближний свет');
    var r = rnd(97);
    out += '<path d="M200 286V190" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>';
    out += '<circle cx="200" cy="190" r="86" fill="none" stroke="' + LINE + '" stroke-width="1" stroke-dasharray="4 4"/>';
    out += '<g fill="' + OCHRE + '">';
    var sx = 0, sy = 0, n = 0;
    for (var i = 0; i < 26; i++) {
      var a = -Math.PI * 0.85 + r() * Math.PI * 0.7;
      var rad = 30 + r() * 54;
      var x = 200 + Math.cos(a) * rad, y = 190 + Math.sin(a) * rad;
      out += '<rect x="' + (x - 2).toFixed(1) + '" y="' + (y - 2).toFixed(1) + '" width="4" height="4"/>';
      sx += x - 200; sy += y - 190; n++;
    }
    out += '</g>';
    var m = Math.sqrt(sx * sx + sy * sy) || 1;
    out += '<g stroke="' + ULTRA + '" stroke-width="2" fill="none">' +
           '<path d="M200 190l' + (sx / m * 66).toFixed(1) + ' ' + (sy / m * 66).toFixed(1) + '"/></g>';
    return out + close();
  };

  figures['canopy-2'] = function () {
    var out = open('Занятый свет гаснет, и соседняя ветка сворачивает в сторону');
    out += '<g fill="' + LINE + '">';
    for (var i = 0; i < 9; i++) out += '<rect x="' + (150 + i * 6) + '" y="' + (96 + (i % 3) * 8) + '" width="4" height="4"/>';
    out += '</g>';
    out += '<g fill="' + OCHRE + '">';
    for (var k = 0; k < 9; k++) out += '<rect x="' + (250 + k * 7) + '" y="' + (120 + (k % 3) * 9) + '" width="4" height="4"/>';
    out += '</g>';
    out += '<g stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round">' +
           '<path d="M120 270C130 210 150 160 176 112"/>' +
           '<path d="M300 274C288 224 276 190 268 152"/></g>';
    out += '<g stroke="' + ULTRA + '" stroke-width="1.5" fill="none" stroke-dasharray="4 4">' +
           '<path d="M268 152C264 128 258 116 250 106"/></g>';
    out += '<text x="150" y="86" font-family="monospace" font-size="9" fill="' + MUTED + '">свет занят</text>';
    return out + close();
  };

  figures['canopy-3'] = function () {
    var out = open('Кроны соседних деревьев смыкаются, но не заходят друг в друга');
    ['#16181A', '#16181A', '#16181A'].forEach(function (c, idx) {
      var bx = 80 + idx * 120;
      out += '<path d="M' + bx + ' 288V196" stroke="' + c + '" stroke-width="4" fill="none"/>';
      var r = rnd(50 + idx * 17);
      out += '<g stroke="' + c + '" stroke-width="1.6" fill="none" stroke-linecap="round">';
      for (var i = 0; i < 22; i++) {
        var a = -Math.PI / 2 + (r() - 0.5) * 2.1;
        var L = 26 + r() * 34;
        out += '<path d="M' + bx + ' ' + (196 - r() * 18).toFixed(0) + 'l' +
               (Math.cos(a) * L).toFixed(1) + ' ' + (Math.sin(a) * L).toFixed(1) + '"/>';
      }
      out += '</g>';
    });
    out += '<g stroke="' + ULTRA + '" stroke-width="1.2" stroke-dasharray="4 4" fill="none">' +
           '<path d="M140 108V196"/><path d="M260 108V196"/></g>';
    return out + close();
  };

  /* =========================================================== МОЛНИЯ */

  figures['lightning-1'] = function () {
    var out = open('Между тучей и землёй ровное поле: перепад одинаков всюду');
    out += '<rect x="0" y="0" width="400" height="46" fill="' + MUTED + '" opacity="0.35"/>';
    out += '<rect x="0" y="278" width="400" height="22" fill="' + MUTED + '" opacity="0.5"/>';
    out += '<g stroke="' + LINE + '" stroke-width="1.2" fill="none" stroke-dasharray="6 6">';
    for (var i = 0; i < 11; i++) out += '<path d="M' + (20 + i * 36) + ' 46V278"/>';
    out += '</g>';
    out += '<g stroke="' + GRID + '" stroke-width="1" fill="none">';
    for (var k = 1; k < 6; k++) out += '<path d="M0 ' + (46 + k * 39) + 'H400"/>';
    return out + '</g>' + close();
  };

  figures['lightning-2'] = function () {
    var out = open('Проросший канал выравнивает потенциал и перестраивает поле вокруг себя');
    out += '<rect x="0" y="0" width="400" height="46" fill="' + MUTED + '" opacity="0.35"/>';
    out += '<rect x="0" y="278" width="400" height="22" fill="' + MUTED + '" opacity="0.5"/>';
    out += '<path d="M200 46L188 96L212 132L196 176" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>';
    /* Линии поля жмутся к кончику канала. */
    out += '<g stroke="' + LINE + '" stroke-width="1.2" fill="none" stroke-dasharray="5 5">';
    for (var i = -4; i <= 4; i++) {
      out += '<path d="M' + (196 + i * 42) + ' 278C' + (196 + i * 20) + ' 230 ' + (196 + i * 8) + ' 200 196 180"/>';
    }
    out += '</g>';
    out += '<circle cx="196" cy="176" r="20" fill="none" stroke="' + ULTRA + '" stroke-width="1.4" stroke-dasharray="3 3"/>';
    return out + close();
  };

  figures['lightning-3'] = function () {
    var out = open('Фигура Лихтенберга: тот же рост по полю, только внутри пластика');
    var r = rnd(881);
    out += '<rect width="400" height="300" fill="' + MUTED + '" opacity="0.08"/>';
    out += '<g stroke="' + INK + '" stroke-width="1.2" fill="none" stroke-linecap="round">';
    (function branch(x, y, a, len, depth) {
      if (depth <= 0 || len < 4) return;
      var x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      out += '<path stroke-width="' + (depth * 0.5).toFixed(1) + '" d="M' + x.toFixed(1) + ' ' + y.toFixed(1) +
             'L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '"/>';
      var k = 2 + (r() > 0.6 ? 1 : 0);
      for (var i = 0; i < k; i++) {
        branch(x2, y2, a + (r() - 0.5) * 1.5, len * (0.62 + r() * 0.2), depth - 1);
      }
    })(200, 150, -Math.PI / 2, 34, 6);
    for (var s = 0; s < 5; s++) {
      (function branch2(x, y, a, len, depth) {
        if (depth <= 0 || len < 4) return;
        var x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
        out += '<path stroke-width="' + (depth * 0.5).toFixed(1) + '" d="M' + x.toFixed(1) + ' ' + y.toFixed(1) +
               'L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '"/>';
        var k2 = 2 + (r() > 0.6 ? 1 : 0);
        for (var i = 0; i < k2; i++) branch2(x2, y2, a + (r() - 0.5) * 1.5, len * (0.62 + r() * 0.2), depth - 1);
      })(200, 150, s * Math.PI * 2 / 5 + 0.4, 34, 6);
    }
    out += '</g><circle cx="200" cy="150" r="4" fill="' + CLAY + '"/>';
    return out + close();
  };

  /* ============================================================== РЕКА */

  figures['river-1'] = function () {
    var out = open('На повороте течение прижимается к внешнему берегу и подмывает его');
    out += '<path d="M20 214C90 214 110 96 200 96C290 96 310 214 380 214" fill="none" stroke="' + LINE + '" stroke-width="46"/>';
    out += '<path d="M20 214C90 214 110 96 200 96C290 96 310 214 380 214" fill="none" stroke="' + ULTRA + '" stroke-width="40" opacity="0.35"/>';
    /* Быстрая струя жмётся к внешней стороне излучины. */
    out += '<path d="M20 200C92 200 112 78 200 78C288 78 308 200 380 200" fill="none" stroke="' + ULTRA + '" stroke-width="3" stroke-dasharray="8 5"/>';
    out += '<text x="200" y="62" text-anchor="middle" font-family="monospace" font-size="10" fill="' + ULTRA + '">быстро · размыв</text>';
    out += '<text x="200" y="150" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MUTED + '">медленно · намыв</text>';
    out += '<g fill="' + OCHRE + '" opacity="0.6"><path d="M150 128q50 -22 100 0q-50 16 -100 0z"/></g>';
    return out + close();
  };

  figures['river-2'] = function () {
    var out = open('Петля растёт, пока её концы не сойдутся вплотную');
    var stages = [
      { d: 'M20 230C110 230 130 190 200 190C270 190 290 230 380 230', w: 1.6, c: LINE },
      { d: 'M20 230C110 230 126 140 200 140C274 140 290 230 380 230', w: 2.2, c: MUTED },
      { d: 'M20 230C110 230 120 60 200 60C280 60 290 230 380 230', w: 3.2, c: ULTRA }
    ];
    stages.forEach(function (s) {
      out += '<path d="' + s.d + '" fill="none" stroke="' + s.c + '" stroke-width="' + s.w + '"/>';
    });
    out += '<circle cx="160" cy="196" r="26" fill="none" stroke="' + CLAY + '" stroke-width="1.5" stroke-dasharray="4 4"/>';
    out += '<text x="196" y="272" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MUTED + '">концы сближаются</text>';
    return out + close();
  };

  figures['river-3'] = function () {
    var out = open('Старица: отрезанная излучина остаётся озером в стороне от русла');
    out += '<path d="M20 200H380" fill="none" stroke="' + ULTRA + '" stroke-width="12"/>';
    out += '<path d="M132 200C138 108 262 108 268 200" fill="none" stroke="' + MUTED + '" stroke-width="11" opacity="0.5"/>';
    out += '<path d="M132 200h136" fill="none" stroke="' + PAPER + '" stroke-width="14"/>';
    out += '<path d="M20 200H380" fill="none" stroke="' + ULTRA + '" stroke-width="12"/>';
    out += '<text x="200" y="96" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MUTED + '">старица</text>';
    out += '<text x="200" y="228" text-anchor="middle" font-family="monospace" font-size="10" fill="' + ULTRA + '">новое русло</text>';
    return out + close();
  };

  /* ========================================================== РАКОВИНА */

  function logSpiral(cx, cy, turns, growth, scale, squash) {
    var k = Math.log(growth) / (Math.PI * 2), d = '';
    for (var i = 0; i <= 320; i++) {
      var t = (i / 320) * turns * Math.PI * 2;
      var r = scale * Math.exp(k * t);
      d += (i ? 'L' : 'M') + (cx + Math.cos(t) * r).toFixed(1) + ' ' +
           (cy + Math.sin(t) * r * (squash || 1)).toFixed(1);
    }
    return d;
  }

  figures['shell-1'] = function () {
    var out = open('Каждый виток крупнее предыдущего в одно и то же число раз');
    out += '<path d="' + logSpiral(196, 158, 3.2, 2.4, 5, 1) + '" fill="none" stroke="' + INK + '" stroke-width="2.2"/>';
    var k = Math.log(2.4) / (Math.PI * 2);
    out += '<g stroke="' + CLAY + '" stroke-width="1.5" fill="none">';
    for (var n = 1; n <= 3; n++) {
      var t = n * Math.PI * 2;
      var r = 5 * Math.exp(k * t);
      out += '<path d="M196 158L' + (196 + r).toFixed(1) + ' 158"/>';
      out += '<circle cx="' + (196 + r).toFixed(1) + '" cy="158" r="3" fill="' + CLAY + '"/>';
    }
    out += '</g>';
    out += '<text x="200" y="286" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MUTED + '">каждый отрезок в 2,4 раза длиннее</text>';
    return out + close();
  };

  figures['shell-2'] = function () {
    var out = open('Молодая и взрослая раковина подобны друг другу');
    out += '<path d="' + logSpiral(118, 168, 2.2, 2.4, 4, 1) + '" fill="none" stroke="' + MUTED + '" stroke-width="1.8"/>';
    out += '<path d="' + logSpiral(280, 152, 3.4, 2.4, 5, 1) + '" fill="none" stroke="' + INK + '" stroke-width="2.4"/>';
    out += '<text x="118" y="252" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MUTED + '">молодая</text>';
    out += '<text x="280" y="272" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MUTED + '">взрослая</text>';
    out += '<path d="M200 40v220" stroke="' + GRID + '" stroke-width="1" fill="none"/>';
    return out + close();
  };

  figures['shell-3'] = function () {
    var out = open('Три числа задают три непохожих семейства раковин');
    out += '<path d="' + logSpiral(80, 150, 3.4, 1.5, 8, 1) + '" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    out += '<path d="' + logSpiral(200, 150, 3.0, 2.6, 5, 1) + '" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    out += '<path d="' + logSpiral(320, 150, 3.4, 2.0, 5, 0.42) + '" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    var labels = ['тугая', 'широкая', 'башенка'];
    labels.forEach(function (t, i) {
      out += '<text x="' + (80 + i * 120) + '" y="264" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MUTED + '">' + t + '</text>';
    });
    return out + close();
  };

  /* =========================================================== САРАНЧА */

  function arena(order, seed, title) {
    var out = open(title);
    var r = rnd(seed);
    out += '<circle cx="200" cy="146" r="96" fill="none" stroke="' + LINE + '" stroke-width="1.3"/>';
    out += '<g stroke-linecap="round" stroke-width="2">';
    for (var i = 0; i < 40; i++) {
      var a = (i / 40) * Math.PI * 2 + (r() - 0.5) * 0.1;
      var x = 200 + Math.cos(a) * 96, y = 146 + Math.sin(a) * 96;
      var dir = r() < (0.5 + order / 2) ? 1 : -1;
      out += '<path stroke="' + (dir > 0 ? INK : CLAY) + '" d="M' + x.toFixed(1) + ' ' + y.toFixed(1) +
             'l' + (-Math.sin(a) * dir * 13).toFixed(1) + ' ' + (Math.cos(a) * dir * 13).toFixed(1) + '"/>';
    }
    out += '</g>';
    return out;
  }

  figures['locust-1'] = function () {
    var out = arena(0.05, 71, 'Ниже порога плотности особи ходят вразнобой');
    out += '<path d="M40 274h320" stroke="' + GRID + '" stroke-width="1" fill="none"/>';
    var d = '', r = rnd(3);
    for (var i = 0; i <= 60; i++) d += (i ? 'L' : 'M') + (40 + i * 5.33).toFixed(1) + ' ' + (274 + (r() - 0.5) * 14).toFixed(1);
    out += '<path d="' + d + '" fill="none" stroke="' + ULTRA + '" stroke-width="1.4"/>';
    return out + close();
  };

  figures['locust-2'] = function () {
    var out = arena(0.92, 71, 'Выше порога вся арена идёт в одну сторону');
    out += '<path d="M40 274h320" stroke="' + GRID + '" stroke-width="1" fill="none"/>';
    out += '<path d="M40 258h320" fill="none" stroke="' + ULTRA + '" stroke-width="1.8"/>';
    return out + close();
  };

  figures['locust-3'] = function () {
    var out = open('Слаженность растёт скачком: это фазовый переход по плотности');
    out += '<g stroke="' + GRID + '" stroke-width="1" fill="none">' +
           '<path d="M56 250H370"/><path d="M56 250V44"/></g>';
    var d = '';
    for (var i = 0; i <= 100; i++) {
      var x = 56 + i * 3.14;
      var t = i / 100;
      /* Резкая ступень возле порога. */
      var v = 1 / (1 + Math.exp(-(t - 0.42) * 22));
      d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + (250 - v * 186).toFixed(1);
    }
    out += '<path d="' + d + '" fill="none" stroke="' + ULTRA + '" stroke-width="2.4"/>';
    out += '<path d="M188 250V44" stroke="' + CLAY + '" stroke-width="1.2" stroke-dasharray="4 4" fill="none"/>';
    out += '<text x="192" y="40" font-family="monospace" font-size="10" fill="' + CLAY + '">порог</text>';
    out += '<text x="200" y="274" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MUTED + '">плотность</text>';
    out += '<text x="20" y="140" font-family="monospace" font-size="10" fill="' + MUTED + '">марш</text>';
    return out + close();
  };

  /* ============================================================== ДЮНА */

  function duneShape(x0, y0, w, h, flip) {
    var s = flip ? -1 : 1;
    return 'M' + x0 + ' ' + y0 +
           'C' + (x0 + s * w * 0.45) + ' ' + y0 + ' ' + (x0 + s * w * 0.62) + ' ' + (y0 - h) + ' ' + (x0 + s * w * 0.78) + ' ' + (y0 - h) +
           'L' + (x0 + s * w) + ' ' + y0 + 'Z';
  }

  figures['dunes-1'] = function () {
    var out = open('Пологий наветренный склон и крутой подветренный');
    out += '<path d="M20 244H380" stroke="' + LINE + '" stroke-width="1.2" fill="none"/>';
    out += '<path d="' + duneShape(70, 244, 250, 130, false) + '" fill="' + OCHRE + '" opacity="0.42"/>';
    out += '<path d="' + duneShape(70, 244, 250, 130, false) + '" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    out += '<g stroke="' + ULTRA + '" stroke-width="1.6" fill="none">' +
           '<path d="M24 70h68"/><path d="M92 70l-9 -5v10z" fill="' + ULTRA + '" stroke="none"/></g>';
    out += '<text x="120" y="228" font-family="monospace" font-size="10" fill="' + MUTED + '">пологий</text>';
    out += '<text x="278" y="200" font-family="monospace" font-size="10" fill="' + MUTED + '">крутой</text>';
    out += '<text x="290" y="150" font-family="monospace" font-size="9" fill="' + CLAY + '">тень</text>';
    return out + close();
  };

  figures['dunes-2'] = function () {
    var out = open('Песчинка прыгает на метры, дюна ползёт целиком');
    out += '<path d="M20 250H380" stroke="' + LINE + '" stroke-width="1.2" fill="none"/>';
    out += '<path d="' + duneShape(50, 250, 170, 84, false) + '" fill="' + OCHRE + '" opacity="0.30"/>';
    out += '<path d="' + duneShape(50, 250, 170, 84, false) + '" fill="none" stroke="' + LINE + '" stroke-width="1.6"/>';
    out += '<path d="' + duneShape(126, 250, 170, 84, false) + '" fill="' + OCHRE + '" opacity="0.45"/>';
    out += '<path d="' + duneShape(126, 250, 170, 84, false) + '" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    /* Прыжок одной песчинки — короткий, в отличие от пути дюны. */
    out += '<g stroke="' + CLAY + '" stroke-width="1.6" fill="none">' +
           '<path d="M150 190q22 -26 44 -2"/><path d="M194 188l-9 -3l2 9z" fill="' + CLAY + '" stroke="none"/></g>';
    out += '<g stroke="' + MUTED + '" stroke-width="1.2" stroke-dasharray="4 4" fill="none">' +
           '<path d="M120 270h76"/><path d="M196 270l-8 -4v8z" fill="' + MUTED + '" stroke="none"/></g>';
    return out + close();
  };

  figures['dunes-3'] = function () {
    var out = open('Бархан: рога вытянуты по ветру');
    /* Полумесяц: выпуклая сторона навстречу ветру, рога вытянуты по ветру. */
    out += '<path d="M104 236C124 128 276 128 296 236C258 182 142 182 104 236Z" ' +
           'fill="' + OCHRE + '" opacity="0.45" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>';
    out += '<g stroke="' + ULTRA + '" stroke-width="1.6" fill="none">' +
           '<path d="M200 62v42"/><path d="M200 104l-5 -9h10z" fill="' + ULTRA + '" stroke="none"/></g>';
    out += '<text x="200" y="54" text-anchor="middle" font-family="monospace" font-size="10" fill="' + ULTRA + '">ветер</text>';
    out += '<text x="200" y="246" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MUTED + '">рога смотрят по ветру</text>';
    return out + close();
  };

  /* =============================================================== РОЙ */

  figures['swarm-1'] = function () {
    var out = open('У дрона два правила: своё место в фигуре и дистанция до соседей');
    var r = rnd(17);
    out += '<g fill="' + LINE + '">';
    for (var i = 0; i < 26; i++) {
      var a = (i / 26) * Math.PI * 2;
      out += '<circle cx="' + (200 + Math.cos(a) * 92).toFixed(1) + '" cy="' + (150 + Math.sin(a) * 92).toFixed(1) + '" r="2.4"/>';
    }
    out += '</g><g fill="' + INK + '">';
    for (var k = 0; k < 26; k++) {
      var b = (k / 26) * Math.PI * 2;
      out += '<circle cx="' + (200 + Math.cos(b) * 92 + (r() - 0.5) * 12).toFixed(1) + '" cy="' +
             (150 + Math.sin(b) * 92 + (r() - 0.5) * 12).toFixed(1) + '" r="3.4"/>';
    }
    out += '</g>';
    out += '<g stroke="' + ULTRA + '" stroke-width="1.3" fill="none" stroke-dasharray="3 3">' +
           '<circle cx="292" cy="150" r="22"/></g>';
    return out + close();
  };

  figures['swarm-2'] = function () {
    var out = open('После отказа части аппаратов места перераспределяются');
    var r = rnd(53);
    out += '<g fill="' + INK + '">';
    for (var k = 0; k < 15; k++) {
      var b = (k / 15) * Math.PI * 2;
      out += '<circle cx="' + (200 + Math.cos(b) * 74 + (r() - 0.5) * 9).toFixed(1) + '" cy="' +
             (150 + Math.sin(b) * 74 + (r() - 0.5) * 9).toFixed(1) + '" r="3.4"/>';
    }
    out += '</g><g stroke="' + LINE + '" stroke-width="1.3">';
    for (var i = 0; i < 8; i++) {
      var a = r() * Math.PI * 2, rad = 110 + r() * 40;
      var x = 200 + Math.cos(a) * rad, y = 150 + Math.sin(a) * rad * 0.8;
      out += '<path d="M' + (x - 4).toFixed(1) + ' ' + (y - 4).toFixed(1) + 'l8 8M' + (x + 4).toFixed(1) + ' ' + (y - 4).toFixed(1) + 'l-8 8"/>';
    }
    return out + '</g>' + close();
  };

  figures['swarm-3'] = function () {
    var out = open('Централизованная схема падает целиком при отказе центра');
    out += '<g stroke="' + LINE + '" stroke-width="1.2" fill="none">';
    for (var i = 0; i < 14; i++) {
      var a = (i / 14) * Math.PI * 2;
      out += '<path d="M200 150L' + (200 + Math.cos(a) * 104).toFixed(1) + ' ' + (150 + Math.sin(a) * 104).toFixed(1) + '"/>';
    }
    out += '</g><g fill="' + LINE + '">';
    for (var k = 0; k < 14; k++) {
      var b = (k / 14) * Math.PI * 2;
      out += '<circle cx="' + (200 + Math.cos(b) * 104).toFixed(1) + '" cy="' + (150 + Math.sin(b) * 104).toFixed(1) + '" r="3.4"/>';
    }
    out += '</g>';
    out += '<g stroke="' + CLAY + '" stroke-width="3" fill="none">' +
           '<path d="M188 138l24 24M212 138l-24 24"/></g>';
    out += '<text x="200" y="286" text-anchor="middle" font-family="monospace" font-size="10" fill="' + CLAY + '">центр отказал — фигуры нет</text>';
    return out + close();
  };

  /* ============================================================ ОБЛАКО */

  figures['clouds-1'] = function () {
    var out = open('Поднимаясь, воздух расширяется и остывает');
    out += '<rect x="0" y="272" width="400" height="28" fill="' + MUTED + '" opacity="0.28"/>';
    out += '<g stroke="' + LINE + '" stroke-width="1.4" fill="none" stroke-linecap="round">';
    for (var i = 0; i < 5; i++) {
      var x = 60 + i * 70;
      out += '<path d="M' + x + ' 268C' + (x + 8) + ' 210 ' + (x - 8) + ' 160 ' + x + ' 110"/>';
      out += '<path d="M' + x + ' 110l-6 12M' + x + ' 110l6 12"/>';
    }
    out += '</g>';
    out += '<g font-family="monospace" font-size="10" fill="' + MUTED + '">' +
           '<text x="316" y="264">+20°</text><text x="316" y="180">+13°</text><text x="316" y="106">+6°</text></g>';
    out += '<g stroke="' + GRID + '" stroke-width="1" fill="none">' +
           '<path d="M20 258H300"/><path d="M20 174H300"/><path d="M20 100H300"/></g>';
    return out + close();
  };

  figures['clouds-2'] = function () {
    var out = open('Порог конденсации одинаков для всех струй');
    out += '<rect x="0" y="272" width="400" height="28" fill="' + MUTED + '" opacity="0.28"/>';
    out += '<path d="M0 150H400" stroke="' + ULTRA + '" stroke-width="1.6" stroke-dasharray="7 5" fill="none"/>';
    out += '<text x="8" y="142" font-family="monospace" font-size="10" fill="' + ULTRA + '">точка росы</text>';

    var r = rnd(29);
    out += '<g stroke="' + LINE + '" stroke-width="1.3" fill="none">';
    for (var i = 0; i < 6; i++) {
      var x = 46 + i * 62;
      out += '<path d="M' + x + ' 268V152"/>';
    }
    out += '</g>';
    out += '<g fill="' + MUTED + '" opacity="0.34">';
    for (var k = 0; k < 6; k++) {
      var cx = 46 + k * 62;
      var top = 150 - 18 - r() * 54;
      for (var j = 0; j < 7; j++) {
        out += '<circle cx="' + (cx + (r() - 0.5) * 40).toFixed(1) + '" cy="' +
               (top + r() * (150 - top)).toFixed(1) + '" r="' + (10 + r() * 12).toFixed(1) + '"/>';
      }
    }
    return out + '</g>' + close();
  };

  figures['clouds-3'] = function () {
    var out = open('Дно облака ровное, вершина клубится');
    var r = rnd(88);
    out += '<rect x="0" y="278" width="400" height="22" fill="' + MUTED + '" opacity="0.28"/>';
    out += '<g fill="' + MUTED + '" opacity="0.32">';
    for (var i = 0; i < 46; i++) {
      var x = 40 + r() * 320;
      var span = 150 - 40 * (1 - Math.abs(x - 200) / 200);
      var y = span - r() * 70;
      out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (14 + r() * 20).toFixed(1) + '"/>';
    }
    out += '</g>';
    out += '<rect x="0" y="152" width="400" height="130" fill="' + PAPER + '"/>';
    out += '<rect x="0" y="278" width="400" height="22" fill="' + MUTED + '" opacity="0.28"/>';
    out += '<path d="M28 151H372" stroke="' + INK + '" stroke-width="2"/>';
    out += '<text x="200" y="176" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MUTED + '">одна высота по всему небу</text>';
    return out + close();
  };

  /* ============================================================= ПЛАМЯ */

  figures['flame-1'] = function () {
    var out = open('Горячий газ всплывает, а снизу подсасывается свежий воздух');
    out += '<rect x="176" y="212" width="48" height="76" fill="' + LINE + '" opacity="0.5" stroke="' + INK + '" stroke-width="1.4"/>';
    out += '<path d="M200 212v-14" stroke="' + INK + '" stroke-width="2"/>';
    out += '<path d="M200 60C232 108 226 150 200 196C174 150 168 108 200 60Z" fill="' + OCHRE + '" opacity="0.55" stroke="' + INK + '" stroke-width="1.6"/>';
    out += '<g stroke="' + ULTRA + '" stroke-width="1.5" fill="none">' +
           '<path d="M96 210C132 210 152 200 168 190"/><path d="M168 190l-11 -1l4 9z" fill="' + ULTRA + '" stroke="none"/>' +
           '<path d="M304 210C268 210 248 200 232 190"/><path d="M232 190l11 -1l-4 9z" fill="' + ULTRA + '" stroke="none"/>' +
           '<path d="M200 52V22"/><path d="M200 22l-5 10h10z" fill="' + ULTRA + '" stroke="none"/></g>';
    return out + close();
  };

  figures['flame-2'] = function () {
    var out = open('Три зоны пламени: тёмная, светящаяся и почти прозрачная');
    out += '<rect x="176" y="222" width="48" height="66" fill="' + LINE + '" opacity="0.5" stroke="' + INK + '" stroke-width="1.4"/>';
    out += '<path d="M200 44C246 110 236 164 200 206C164 164 154 110 200 44Z" fill="' + OCHRE + '" opacity="0.28" stroke="' + LINE + '" stroke-width="1.2"/>';
    out += '<path d="M200 96C222 138 218 172 200 200C182 172 178 138 200 96Z" fill="' + OCHRE + '" opacity="0.55" stroke="' + INK + '" stroke-width="1.3"/>';
    out += '<ellipse cx="200" cy="188" rx="13" ry="17" fill="' + MUTED + '" opacity="0.55"/>';
    out += '<g font-family="monospace" font-size="9" fill="' + MUTED + '">' +
           '<text x="248" y="72">прозрачная</text>' +
           '<text x="240" y="150">светящаяся</text>' +
           '<text x="236" y="196">тёмная</text></g>';
    out += '<g stroke="' + LINE + '" stroke-width="0.9" fill="none">' +
           '<path d="M226 68h20"/><path d="M214 146h24"/><path d="M212 192h22"/></g>';
    return out + close();
  };

  figures['flame-3'] = function () {
    var out = open('В невесомости пламя становится шаром');
    out += '<path d="M200 34v210" stroke="' + GRID + '" stroke-width="1" fill="none"/>';
    out += '<rect x="76" y="218" width="46" height="62" fill="' + LINE + '" opacity="0.5" stroke="' + INK + '" stroke-width="1.3"/>';
    out += '<path d="M99 60C132 116 126 164 99 204C72 164 66 116 99 60Z" fill="' + OCHRE + '" opacity="0.5" stroke="' + INK + '" stroke-width="1.4"/>';
    out += '<text x="99" y="268" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MUTED + '">на Земле</text>';

    out += '<rect x="278" y="218" width="46" height="62" fill="' + LINE + '" opacity="0.5" stroke="' + INK + '" stroke-width="1.3"/>';
    out += '<circle cx="301" cy="176" r="46" fill="' + ULTRA + '" opacity="0.22" stroke="' + ULTRA + '" stroke-width="1.6"/>';
    out += '<text x="301" y="268" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MUTED + '">на орбите</text>';
    return out + close();
  };

  /* ============================================================ РУЧЕЁК */

  function glassPath(seed, n, thick) {
    var r = rnd(seed), out = '';
    for (var k = 0; k < n; k++) {
      var x = 40 + (k + 0.5) * (320 / n) + (r() - 0.5) * 20;
      var d = 'M' + x.toFixed(1) + ' 18';
      for (var y = 18; y < 288; y += 16) {
        x += (r() - 0.5) * 13;
        d += 'L' + x.toFixed(1) + ' ' + (y + 16);
      }
      out += '<path d="' + d + '" fill="none" stroke="' + ULTRA + '" stroke-width="' + thick + '" opacity="0.7" stroke-linecap="round"/>';
    }
    return out;
  }

  figures['rivulet-1'] = function () {
    var out = open('Первая капля идёт наугад и оставляет мокрый след');
    out += '<rect x="26" y="14" width="348" height="274" fill="none" stroke="' + LINE + '" stroke-width="1.2"/>';
    out += glassPath(19, 1, 3);
    out += '<circle cx="196" cy="40" r="5" fill="' + ULTRA + '"/>';
    return out + close();
  };

  figures['rivulet-2'] = function () {
    var out = open('Следующие капли идут по уже мокрому пути');
    out += '<rect x="26" y="14" width="348" height="274" fill="none" stroke="' + LINE + '" stroke-width="1.2"/>';
    out += glassPath(19, 1, 7);
    out += '<g fill="' + ULTRA + '"><circle cx="196" cy="40" r="5"/><circle cx="190" cy="96" r="5"/><circle cx="198" cy="158" r="5"/></g>';
    return out + close();
  };

  figures['rivulet-3'] = function () {
    var out = open('Стекло разлиновано несколькими ручейками');
    out += '<rect x="26" y="14" width="348" height="274" fill="none" stroke="' + LINE + '" stroke-width="1.2"/>';
    out += glassPath(77, 5, 5);
    return out + close();
  };

  /* ====================================================== МЫЛЬНАЯ ПЛЁНКА */

  figures['soapfilm-1'] = function () {
    var out = open('Три равные тяги уравновешены только при углах в 120 градусов');
    out += '<g stroke="' + ULTRA + '" stroke-width="3" fill="none" stroke-linecap="round">';
    for (var i = 0; i < 3; i++) {
      var a = -Math.PI / 2 + i * Math.PI * 2 / 3;
      out += '<path d="M200 150l' + (Math.cos(a) * 108).toFixed(1) + ' ' + (Math.sin(a) * 108).toFixed(1) + '"/>';
    }
    out += '</g>';
    out += '<g fill="' + INK + '">';
    for (var k = 0; k < 3; k++) {
      var b = -Math.PI / 2 + k * Math.PI * 2 / 3;
      out += '<circle cx="' + (200 + Math.cos(b) * 108).toFixed(1) + '" cy="' + (150 + Math.sin(b) * 108).toFixed(1) + '" r="5"/>';
    }
    out += '</g><circle cx="200" cy="150" r="4.4" fill="' + CLAY + '"/>';
    out += '<path d="M200 108a42 42 0 0 1 36 21" fill="none" stroke="' + CLAY + '" stroke-width="1.4"/>';
    out += '<text x="244" y="120" font-family="monospace" font-size="11" fill="' + CLAY + '">120°</text>';
    return out + close();
  };

  figures['soapfilm-2'] = function () {
    var out = open('Крест по диагоналям длиннее, чем два узла с перемычкой');
    var pins = [[70, 70], [190, 70], [70, 230], [190, 230]];
    out += '<g stroke="' + LINE + '" stroke-width="2.4" fill="none">' +
           '<path d="M70 70L190 230"/><path d="M190 70L70 230"/></g>';
    out += '<g fill="' + INK + '">';
    pins.forEach(function (p) { out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5"/>'; });
    out += '</g>';
    out += '<text x="130" y="266" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MUTED + '">крест · длиннее</text>';

    var pins2 = [[240, 70], [360, 70], [240, 230], [360, 230]];
    out += '<g stroke="' + ULTRA + '" stroke-width="2.8" fill="none">' +
           '<path d="M240 70L272 150"/><path d="M360 70L328 150"/>' +
           '<path d="M272 150H328"/>' +
           '<path d="M240 230L272 150"/><path d="M360 230L328 150"/></g>';
    out += '<g fill="' + INK + '">';
    pins2.forEach(function (p) { out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5"/>'; });
    out += '</g>';
    out += '<g fill="' + CLAY + '"><circle cx="272" cy="150" r="4"/><circle cx="328" cy="150" r="4"/></g>';
    out += '<text x="300" y="266" text-anchor="middle" font-family="monospace" font-size="10" fill="' + MOSS + '">плёнка · короче</text>';
    return out + close();
  };

  figures['soapfilm-3'] = function () {
    var out = open('Пена: в каждом узле сходятся ровно три стенки');
    var r = rnd(404);
    var pts = [];
    for (var row = 0; row < 4; row++) {
      for (var col = 0; col < 5; col++) {
        pts.push([44 + col * 78 + (row % 2) * 39 + (r() - 0.5) * 12,
                  52 + row * 66 + (r() - 0.5) * 12]);
      }
    }
    out += '<g stroke="' + ULTRA + '" stroke-width="1.8" fill="none" opacity="0.8">';
    pts.forEach(function (p) {
      var d = '';
      for (var i = 0; i < 6; i++) {
        var a = Math.PI / 6 + i * Math.PI / 3;
        d += (i ? 'L' : 'M') + (p[0] + Math.cos(a) * 38).toFixed(1) + ' ' + (p[1] + Math.sin(a) * 38).toFixed(1);
      }
      out += '<path d="' + d + 'Z"/>';
    });
    return out + '</g>' + close();
  };

  /* ------------------------------------------------------------------ */

  ROY.figure = function (name) {
    return figures[name] ? figures[name]() : '';
  };

  ROY.hasFigure = function (name) { return !!figures[name]; };

})(window);
