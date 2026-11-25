// Pistón Auto — interacciones (nav, FAQ, demo, quiz, copiar)
(function () {
  'use strict';

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Menú móvil
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') links.classList.remove('open');
    });
  }

  // FAQ
  var questions = document.querySelectorAll('.faq-q');
  questions.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      var panel = btn.nextElementSibling;
      if (panel && panel.classList.contains('faq-a')) panel.classList.toggle('open', !open);
    });
  });
  if (questions.length) questions[0].click();

  // Formulario demo → WhatsApp
  var form = document.getElementById('demoForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (document.getElementById('demoName').value || '').trim();
      var biz = (document.getElementById('demoBiz').value || '').trim();
      var volEl = document.getElementById('demoVolume');
      var vol = volEl ? (volEl.value || 'aún no definido') : 'aún no definido';
      if (!name || !biz) return;
      var msg = 'Hola Pistón Quarks, soy ' + name + ' de ' + biz +
        ' y quiero una demo de Pistón Auto. Comprobantes mensuales estimados: ' + vol + '.';
      window.open('https://wa.me/51930640071?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      form.reset();
    });
  }

  // Copiar datos de pago
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var txt = btn.getAttribute('data-copy');
      var done = function () {
        var old = btn.textContent;
        btn.textContent = 'Copiado';
        setTimeout(function () { btn.textContent = old; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (_) {}
        document.body.removeChild(ta); done();
      }
    });
  });

  // Quiz de segmento / nivel
  var quiz = document.getElementById('quiz');
  if (quiz) {
    var score = { b: 0, p: 0, e: 0 };
    var idx = 0;
    var qs = quiz.querySelectorAll('.q');
    var result = quiz.querySelector('.result');
    var progress = quiz.querySelector('.progress');

    var show = function (i) {
      qs.forEach(function (q, n) { q.classList.toggle('active', n === i); });
      if (progress) progress.textContent = 'Pregunta ' + (i + 1) + ' de ' + qs.length;
    };

    quiz.querySelectorAll('.opt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        score[opt.getAttribute('data-k')]++;
        idx++;
        if (idx < qs.length) {
          show(idx);
        } else {
          qs.forEach(function (q) { q.classList.remove('active'); });
          var win = score.e >= score.p && score.e >= score.b ? 'e' : (score.p >= score.b ? 'p' : 'b');
          var map = {
            b: { t: 'Tu sistema es de Respuestas Automaticas', d: 'Necesitas dejar de responder lo mismo todo el día. El árbol de respuestas resuelve el 80% con tu información real y tu tono.', l: 'planes.html#plan-automaticas' },
            p: { t: 'Tu sistema es de Infinitas con Cerebro', d: 'Ya vendes por WhatsApp y necesitas que el bot piense, lea contexto y dirija la venta, con verificación y registro incluidos.', l: 'planes.html#plan-infinitas' },
            e: { t: 'Tu sistema necesita Cerebro + Voz', d: 'Necesitas que el bot hable como tú (sin que se note), nunca invente, registre comprobantes y entregue reportes con gráficos de todo lo que se movió.', l: 'planes.html#plan-infinitas' }
          };
          var r = map[win];
          if (result) {
            result.innerHTML = '<h3>' + r.t + '</h3><p>' + r.d + '</p>' +
              '<a class="btn btn-primary" href="' + r.l + '">Ver ese sistema →</a>';
            result.classList.add('active');
          }
          if (progress) progress.textContent = 'Resultado';
        }
      });
    });
    show(0);
  }

  // Pulse del spark (index)
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var spark = document.getElementById('spark');
    if (spark) spark.style.animation = 'none';
  }
})();
