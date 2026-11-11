/* Traduction du site : Français (langue source) · English · Wolof
   ---------------------------------------------------------------------------
   Les pages sont écrites en français. Ce script remplace, au chargement, chaque
   texte français par sa traduction trouvée dans assets/i18n/en.js ou wo.js
   (dictionnaires « texte français » → « traduction »).
   • Pour corriger une traduction : modifier la valeur dans le dictionnaire.
   • Un texte absent du dictionnaire reste affiché en français.
   • Pour lister les textes d'une page : SF_I18N.extract() dans la console.
   La langue choisie est mémorisée (clé localStorage « sf-lang »), aussi lue par le jeu. */
(function () {
  const LANGS = { wo: "WO", fr: "FR", en: "EN" };
  const NAMES = { wo: "Wolof", fr: "Français", en: "English" };
  let lang = "";
  try { lang = localStorage.getItem("sf-lang") || ""; } catch (e) {}
  if (!LANGS[lang]) lang = "wo"; // langue par défaut du site : wolof
  const html = document.documentElement;
  html.lang = lang;

  if (lang !== "fr") {
    html.classList.add("i18n-pending");
    document.write('<style>.i18n-pending body{visibility:hidden}</style>');
    document.write('<script src="assets/i18n/' + lang + '.js?v=20261111"><\/script>');
    setTimeout(() => html.classList.remove("i18n-pending"), 2500); // filet de sécurité
  }

  const norm = (s) => String(s).replace(/\s+/g, " ").trim();
  const dict = () => (window.SF_DICT && window.SF_DICT[lang]) || {};
  const INLINE = new Set(["STRONG", "EM", "A", "SMALL", "BR", "CODE", "SPAN", "B", "I", "SUP", "SUB", "ABBR", "TIME", "U", "MARK"]);
  const SKIP = new Set(["SCRIPT", "STYLE", "IFRAME", "NOSCRIPT", "TEXTAREA", "svg", "SVG", "CANVAS"]);
  const ATTRS = ["placeholder", "aria-label", "title", "alt"];

  const inlineDeep = (el) => INLINE.has(el.tagName) && [...el.children].every(inlineDeep);
  const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

  /* Parcourt un élément et appelle onBlock(clé, el) / onText(clé, nœud) / onAttr(clé, el, attr) */
  function walk(el, cb) {
    if (!el || el.nodeType !== 1 || SKIP.has(el.tagName)) return;
    if (el.hasAttribute("data-no-i18n")) return;
    ATTRS.forEach((a) => { const v = el.getAttribute(a); if (v && norm(v)) cb.attr(norm(v), el, a); });
    if (hasOwnText(el) && [...el.children].every(inlineDeep)) {
      cb.block(norm(el.innerHTML), el);
      el.querySelectorAll("*").forEach((c) => ATTRS.forEach((a) => { const v = c.getAttribute(a); if (v && norm(v)) cb.attr(norm(v), c, a); }));
      return;
    }
    if (hasOwnText(el)) el.childNodes.forEach((n) => { if (n.nodeType === 3 && n.textContent.trim()) cb.text(norm(n.textContent), n); });
    [...el.children].forEach((c) => walk(c, cb));
  }

  let observer = null;
  function translate(root) {
    if (lang === "fr") return;
    const d = dict();
    if (observer) observer.disconnect();
    walk(root, {
      block: (k, el) => { if (d[k] != null && el.dataset.i18n !== lang) { el.innerHTML = d[k]; el.dataset.i18n = lang; } },
      text: (k, n) => { if (d[k] != null) n.textContent = n.textContent.replace(n.textContent.trim(), d[k]); },
      attr: (k, el, a) => { if (d[k] != null) el.setAttribute(a, d[k]); }
    });
    if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  /* Traduction d'un texte construit en JavaScript, avec variables {nom} */
  function T(fr, vars) {
    let s = lang === "fr" ? fr : (dict()[fr] ?? fr);
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
    return s;
  }

  /* Outil de maintenance : liste les textes de la page (à coller dans les dictionnaires) */
  function extract(root) {
    const keys = new Set();
    walk(root || document.body, { block: (k) => keys.add(k), text: (k) => keys.add(k), attr: (k) => keys.add(k) });
    keys.add(norm(document.title));
    const md = document.querySelector('meta[name="description"]'); if (md) keys.add(norm(md.content));
    return [...keys].filter((k) => /[a-zA-ZÀ-ÿ]/.test(k));
  }

  function setLang(l) {
    try { localStorage.setItem("sf-lang", l); } catch (e) {}
    location.reload();
  }

  function start() {
    if (lang !== "fr") {
      const d = dict();
      const t = norm(document.title); if (d[t]) document.title = d[t];
      const md = document.querySelector('meta[name="description"]'); if (md && d[norm(md.content)]) md.content = d[norm(md.content)];
      translate(document.body);
      observer = new MutationObserver((muts) => {
        const targets = new Set();
        muts.forEach((m) => {
          const t = m.type === "characterData" ? m.target.parentElement : m.target;
          if (!t) return;
          if (t.dataset && t.dataset.i18n) delete t.dataset.i18n; // contenu réécrit en français : à retraduire
          targets.add(t);
        });
        targets.forEach((t) => translate(t));
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      html.classList.remove("i18n-pending");
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

  window.SF_I18N = { lang, LANGS, NAMES, T, setLang, extract, translate, locale: lang === "en" ? "en-GB" : "fr-FR" };
  window.T = T;
})();
