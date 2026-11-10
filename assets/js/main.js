/* En-tête, menu, pied de page et petites interactions communes à toutes les pages */
(function () {
  const C = window.SF_CONFIG || {};
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  const ICONS = {
    ig: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.2.8-.4.4-.6.7-.8 1.2-.2.4-.3 1-.4 2.1-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.2.4.4.7.6 1.2.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.2-.8.4-.4.6-.7.8-1.2.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2.1-.2-.5-.4-.9-.8-1.2-.4-.4-.7-.6-1.2-.8-.4-.2-1-.3-2.1-.4-1.2-.1-1.6-.1-4.7-.1zm0 3.1a4.9 4.9 0 110 9.8 4.9 4.9 0 010-9.8zm0 8a3.1 3.1 0 100-6.2 3.1 3.1 0 000 6.2zm6.2-8.2a1.1 1.1 0 11-2.3 0 1.1 1.1 0 012.3 0z"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21.9v-8.2h2.8l.4-3.2h-3.2V8.4c0-.9.3-1.6 1.6-1.6h1.7V4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3v3.2h2.8v8.2a10 10 0 113.4 0z"/></svg>',
    li: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6h.1c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 110-4.2 2.1 2.1 0 010 4.2zm1.8 13.1H3.5V9h3.6v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1112 21.8zM12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.2 1.6 6L0 24l6.2-1.6c1.8 1 3.8 1.5 5.8 1.5 6.6 0 12-5.4 12-12S18.6 0 12 0z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>'
  };
  window.SF_ICONS = ICONS;

  const NAV = [
    ["index.html", "Accueil"],
    ["qualite-eau.html", "Qualité de l'eau"],
    ["projets.html", "Nos projets"],
    ["partenaires.html", "Partenaires"],
    ["shop.html", "Shop"],
    ["contact.html", "Contact"],
    ["game.html", "Game", "nav-game"],
    ["membres.html", "Espace membres", "nav-members"]
  ];
  const MEMBER_PAGES = ["membres.html", "prelevements.html", "finances.html", "gestion-projets.html", "annuaire.html"];

  const header = document.querySelector("[data-site-header]");
  if (header) {
    const links = NAV.map(([href, label, cls]) => {
      const current = href === page || (href === "membres.html" && MEMBER_PAGES.includes(page));
      return `<li${cls ? ` class="${cls}"` : ""}><a href="${href}"${current ? ' aria-current="page"' : ""}>${label}</a></li>`;
    }).join("");
    const I = window.SF_I18N;
    const langSwitch = I ? `<li class="nav-lang" data-no-i18n><div class="lang-switch" role="group" aria-label="Langue / Language / Làkk">${
      Object.keys(I.LANGS).map((l) => `<button type="button" lang="${l}" data-lang="${l}" aria-pressed="${l === I.lang}" title="${I.NAMES[l]}">${I.LANGS[l]}</button>`).join("")
    }</div></li>` : "";
    header.outerHTML = `
      <div class="flag-bar" aria-hidden="true"></div>
      <header class="site-header">
        <nav class="container nav" aria-label="Navigation principale">
          <a class="brand" href="index.html" aria-label="Surfrider Foundation Sénégal — accueil">
            <img src="assets/img/logo-horizontal-bleu.png" alt="Surfrider Foundation Sénégal" width="119" height="46">
          </a>
          <button class="nav-toggle" aria-expanded="false" aria-controls="nav-links" aria-label="Ouvrir le menu">${ICONS.menu}</button>
          <ul class="nav-links" id="nav-links">${links}${langSwitch}</ul>
        </nav>
      </header>`;
    document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => window.SF_I18N.setLang(b.dataset.lang)));
    const toggle = document.querySelector(".nav-toggle");
    const list = document.getElementById("nav-links");
    toggle.addEventListener("click", () => {
      const open = list.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
      toggle.innerHTML = open ? ICONS.close : ICONS.menu;
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    });
  }

  const footer = document.querySelector("[data-site-footer]");
  if (footer) {
    const year = new Date().getFullYear();
    footer.outerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-grid">
            <div>
              <img class="footer-logo" src="assets/img/logo-horizontal-blanc.png" alt="Surfrider Foundation Sénégal">
              <p>Premier chapter d'Afrique subsaharienne, créé en novembre 2020. Ensemble pour protéger l'océan et le littoral sénégalais.</p>
              <div class="footer-social">
                <a href="${C.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${ICONS.ig}</a>
                <a href="${C.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${ICONS.fb}</a>
                <a href="${C.linkedin}" target="_blank" rel="noopener" aria-label="LinkedIn">${ICONS.li}</a>
                <a href="https://wa.me/${C.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICONS.wa}</a>
              </div>
            </div>
            <div>
              <h4>Découvrir</h4>
              <ul>
                <li><a href="qualite-eau.html">Qualité de l'eau</a></li>
                <li><a href="projets.html">Nos projets</a></li>
                <li><a href="partenaires.html">Partenaires</a></li>
                <li><a href="game.html">Le jeu Surfrider</a></li>
              </ul>
            </div>
            <div>
              <h4>Agir</h4>
              <ul>
                <li><a href="shop.html">Le shop</a></li>
                <li><a href="contact.html#benevolat">Devenir bénévole</a></li>
                <li><a href="contact.html">Nous contacter</a></li>
                <li><a href="membres.html">Espace membres</a></li>
              </ul>
            </div>
            <div>
              <h4>Contact</h4>
              <ul>
                <li><a href="mailto:${C.email}">${C.email}</a></li>
                <li><a href="tel:${C.phone.replace(/\s/g, "")}">${C.phone}</a></li>
                <li>Dakar, Sénégal</li>
              </ul>
            </div>
          </div>
          <div class="footer-bottom">
            <span>© ${year} Surfrider Foundation Sénégal — association loi sénégalaise</span>
            <span>Membre du réseau Surfrider Foundation</span>
          </div>
        </div>
      </footer>`;
  }

  // Apparition douce des blocs au scroll
  const els = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  } else {
    els.forEach((el) => el.classList.add("visible"));
  }

  // Remplissage des liens [data-config="clé"]
  document.querySelectorAll("[data-config-href]").forEach((a) => {
    const key = a.getAttribute("data-config-href");
    if (C[key]) a.href = C[key];
  });
})();
