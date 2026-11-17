/* Boutique : catalogue, panier (mémorisé dans le navigateur) et paiement Wave.
   ---------------------------------------------------------------------------
   Paiement :
   • si config.js › waveCheckoutUrl est renseigné (script Google Apps Script,
     voir wave/README.md) : le panier est envoyé au script, qui crée la session
     Wave Business et renvoie le lien de paiement ; au retour, le paiement est
     vérifié auprès de Wave ;
   • sinon : lien marchand Wave (waveMerchantLink) ou commande par WhatsApp.
   ⚠️ Les PRIX sont aussi définis dans wave/Code.gs (montant réellement payé) :
   les modifier aux deux endroits. */
(function () {
  const C = window.SF_CONFIG;
  const IMG = "assets/img/shop/";

  const PRODUCTS = [
    { id: "tee-poche", name: "T-shirt Surfrider Sénégal", desc: "Le classique : logo Surfrider Sénégal sur le cœur.", price: 10000,
      sizes: ["S", "M", "L", "XL", "XXL"],
      variants: [["Gris", "#9EA3A8", "tee-poche-gris.jpg"], ["Noir", "#1B1B1B", "tee-poche-noir.jpg"], ["Blanc", "#FFFFFF", "tee-poche-blanc.jpg"]] },
    { id: "tee-senegal", name: "T-shirt Sénégal", desc: "Logo aux couleurs du drapeau sénégalais.", price: 10000,
      sizes: ["S", "M", "L", "XL", "XXL"],
      variants: [["Noir, logo devant", "#1B1B1B", "tee-senegal-noir.jpg"], ["Blanc, logo devant", "#FFFFFF", "tee-senegal-blanc.jpg"], ["Blanc, logo cœur", "#FFFFFF", "tee-senegal-poche-blanc.jpg"]] },
    { id: "hoodie", name: "Sweat à capuche Sénégal", desc: "Molleton noir, logo aux couleurs du drapeau. Pour les sessions du petit matin.", price: 20000,
      sizes: ["S", "M", "L", "XL"],
      variants: [["Noir", "#1B1B1B", "hoodie-senegal-noir.jpg"]] },
    { id: "don", name: "Don libre", desc: "Soutiens directement le programme Qualité de l'eau.", price: 5000, free: true }
  ];

  const fmt = (v) => v.toLocaleString("fr-FR") + " FCFA";
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const heart = `<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M100 170 L35 105 Q10 75 35 50 Q62 26 100 62 Q138 26 165 50 Q190 75 165 105Z" fill="#E31B23"/><path d="M45 110 Q100 70 155 110" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>`;
  const visual = (p, v) => p.variants ? `<img src="${IMG}${v[2]}" alt="${esc(T(p.name))} – ${esc(T(v[0]))}" loading="lazy" width="800" height="800">` : heart;

  /* ---- Panier ------------------------------------------------------------ */
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem("sf-cart") || "[]"); } catch (e) { cart = []; }
  cart = cart.filter((l) => PRODUCTS.some((p) => p.id === l.id)); // anciens articles retirés du catalogue
  const save = () => { try { localStorage.setItem("sf-cart", JSON.stringify(cart)); } catch (e) {} };
  const total = () => cart.reduce((s, l) => s + l.price * l.qty, 0);

  function renderProducts() {
    const root = document.getElementById("products");
    root.innerHTML = PRODUCTS.map((p) => `
      <article class="card product" data-id="${p.id}">
        <div class="visual${p.variants ? " has-photo" : ""}" style="background:${p.free ? "#FFE9EA" : "#FFFFFF"}">${visual(p, p.variants && p.variants[0])}</div>
        <div class="body">
          <h3 style="margin:0">${p.name}</h3>
          <p style="margin:0;color:var(--muted)">${p.desc}</p>
          ${p.variants && p.variants.length > 1 ? `<div class="opts variants" role="group" aria-label="Modèle">${p.variants.map(([n, c], i) => `<button type="button" data-variant="${i}" aria-pressed="${i === 0}"><i style="background:${c}"></i><span data-no-i18n>${T(n)}</span></button>`).join("")}</div>` : ""}
          ${p.sizes ? `<div class="opts" role="group" aria-label="Taille">${p.sizes.map((s, i) => `<button type="button" data-size="${s}" aria-pressed="${i === 1}">${s}</button>`).join("")}</div>` : ""}
          ${p.free ? `<label class="form" style="gap:4px;font-weight:700">Montant (FCFA)<input type="number" min="500" step="500" value="${p.price}" data-amount></label>` : ""}
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;gap:10px">
            <span class="price">${p.free ? "Libre" : fmt(p.price)}</span>
            <button class="btn btn-blue btn-sm" type="button" data-add>Ajouter</button>
          </div>
        </div>
      </article>`).join("");

    root.querySelectorAll(".product").forEach((card) => {
      const p = PRODUCTS.find((x) => x.id === card.dataset.id);
      card.querySelectorAll("[data-variant],[data-size]").forEach((b) => b.addEventListener("click", () => {
        const attr = b.dataset.variant ? "data-variant" : "data-size";
        card.querySelectorAll(`[${attr}]`).forEach((x) => x.setAttribute("aria-pressed", x === b));
        if (b.dataset.variant) card.querySelector(".visual").innerHTML = visual(p, p.variants[+b.dataset.variant]);
      }));
      card.querySelector("[data-add]").addEventListener("click", (e) => {
        const vi = +(card.querySelector('[data-variant][aria-pressed="true"]')?.dataset.variant || 0);
        const variant = p.variants ? p.variants[vi][0] : "";
        const size = card.querySelector('[data-size][aria-pressed="true"]')?.dataset.size || "";
        const price = p.free ? Math.max(500, parseInt(card.querySelector("[data-amount]").value, 10) || p.price) : p.price;
        const key = [p.id, variant, size, price].join("|");
        const line = cart.find((l) => l.key === key);
        if (line) line.qty++; else cart.push({ key, id: p.id, name: p.name, variant, size, price, qty: 1 });
        save(); renderCart();
        e.target.textContent = T("Ajouté ✓"); setTimeout(() => (e.target.textContent = T("Ajouter")), 1200);
      });
    });
  }

  const lineOpts = (l) => [l.variant || l.color, l.size].filter(Boolean).map((x) => T(x)).join(" · ");

  function renderCart() {
    document.getElementById("cart-count").textContent = cart.reduce((s, l) => s + l.qty, 0);
    const lines = document.getElementById("cart-lines");
    lines.innerHTML = cart.length ? cart.map((l, i) => `
      <div class="cart-line">
        <div><strong>${T(l.name)}</strong><br><small>${esc(lineOpts(l))}</small></div>
        <strong>${fmt(l.price * l.qty)}</strong>
        <div class="qty"><button type="button" data-dec="${i}" aria-label="Retirer un">−</button><span>${l.qty}</span><button type="button" data-inc="${i}" aria-label="Ajouter un">+</button></div>
      </div>`).join("") : "<p>Ton panier est vide. Choisis un article pour soutenir l'océan !</p>";
    document.getElementById("cart-total").textContent = fmt(total());
    document.getElementById("pay-btn").disabled = !cart.length;
    lines.querySelectorAll("[data-inc]").forEach((b) => b.addEventListener("click", () => { cart[b.dataset.inc].qty++; save(); renderCart(); }));
    lines.querySelectorAll("[data-dec]").forEach((b) => b.addEventListener("click", () => {
      const l = cart[b.dataset.dec]; l.qty--; if (l.qty <= 0) cart.splice(b.dataset.dec, 1); save(); renderCart();
    }));
  }

  function orderText(f, ref) {
    return `Bonjour Surfrider Sénégal ! ${ref ? "Commande " + ref + " payée par Wave sur le shop" : "Nouvelle commande sur le shop"} :\n` +
      cart.map((l) => `• ${l.qty} × ${l.name}${lineOpts(l) ? " (" + lineOpts(l) + ")" : ""} — ${fmt(l.price * l.qty)}`).join("\n") +
      `\nTotal : ${fmt(total())}\nNom : ${f.get("name")}\nTél : ${f.get("phone")}\n${f.get("delivery")}\n` +
      (ref ? "" : C.waveMerchantLink ? "Paiement effectué via Wave." : "Je souhaite payer par Wave, merci de m'indiquer la marche à suivre.");
  }

  /* ---- Retour de Wave : vérification du paiement ------------------------- */
  function banner(kind, html) {
    const el = document.getElementById("pay-status");
    el.className = "notice pay-status " + (kind === "ok" ? "notice-green" : kind === "wait" ? "notice-blue" : "");
    el.innerHTML = html;
    el.hidden = false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  async function checkReturn() {
    const q = new URLSearchParams(location.search);
    const state = q.get("paiement"), ref = q.get("ref");
    if (!state || !ref) return;
    history.replaceState(null, "", location.pathname);
    if (state === "erreur") {
      banner("err", `<strong>${T("Le paiement n'a pas abouti.")}</strong> ${T("Ton panier est conservé : tu peux réessayer.")}`);
      return;
    }
    if (!C.waveCheckoutUrl) return;
    banner("wait", `<strong>${T("Vérification du paiement…")}</strong>`);
    for (let i = 0; i < 6; i++) {
      try {
        const r = await (await fetch(`${C.waveCheckoutUrl}?action=status&ref=${encodeURIComponent(ref)}`)).json();
        if (r.status === "succeeded") {
          cart = []; save(); renderCart();
          banner("ok", `<strong>${T("Merci ! Paiement reçu.")}</strong> ${T("Commande n° {ref} ({total}). Nous te contactons sur WhatsApp pour le retrait ou la livraison.", { ref: esc(ref), total: fmt(+r.total || 0) })}`);
          return;
        }
        if (r.status === "expired" || r.status === "cancelled") {
          banner("err", `<strong>${T("Le paiement n'a pas abouti.")}</strong> ${T("Ton panier est conservé : tu peux réessayer.")}`);
          return;
        }
      } catch (e) { /* on réessaie */ }
      await new Promise((r) => setTimeout(r, 2500));
    }
    banner("wait", `<strong>${T("Paiement en cours de confirmation.")}</strong> ${T("Si Wave t'a confirmé le paiement, envoie-nous ta référence {ref} sur WhatsApp.", { ref: esc(ref) })}`);
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderProducts(); renderCart();
    const drawer = document.getElementById("cart");
    const open = () => { drawer.classList.add("open"); drawer.querySelector("[data-close].btn").focus(); };
    const close = () => { drawer.classList.remove("open"); document.getElementById("cart-open").focus(); };
    document.getElementById("cart-open").addEventListener("click", open);
    drawer.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("open")) close(); });

    document.getElementById("pay-help").textContent = C.waveCheckoutUrl
      ? T("Tu es redirigé·e vers Wave pour payer le montant exact de ta commande. Nous recevons ta commande dès que le paiement est validé.")
      : C.waveMerchantLink
        ? T("Wave s'ouvre avec le montant de ta commande. Une fois le paiement validé, confirme ta commande sur WhatsApp.")
        : T("Ta commande nous est envoyée sur WhatsApp ; nous te répondons avec le lien de paiement Wave.");

    document.getElementById("checkout").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!cart.length) return;
      const f = new FormData(e.target);
      const btn = document.getElementById("pay-btn");
      const msg = document.getElementById("pay-help");
      if (C.waveCheckoutUrl) {
        btn.disabled = true; btn.textContent = T("Connexion à Wave…");
        try {
          const r = await (await fetch(C.waveCheckoutUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" }, // requête simple (pas de pré-vérification CORS)
            body: JSON.stringify({
              action: "checkout",
              items: cart.map((l) => ({ id: l.id, name: l.name, variant: l.variant || l.color || "", size: l.size || "", qty: l.qty, amount: l.id === "don" ? l.price : undefined })),
              customer: { name: f.get("name"), phone: f.get("phone"), delivery: f.get("delivery") }
            })
          })).json();
          if (!r.url) throw new Error(r.error || "réponse invalide");
          location.href = r.url; // l'app Wave s'ouvre (ou la page de paiement Wave)
        } catch (err) {
          btn.disabled = false; btn.textContent = T("Payer avec Wave");
          msg.innerHTML = `<strong style="color:#B42318">${T("Paiement Wave indisponible pour le moment.")}</strong> <a href="https://wa.me/${C.whatsapp}?text=${encodeURIComponent(orderText(f))}" target="_blank" rel="noopener">${T("Envoyer la commande sur WhatsApp")}</a>`;
        }
        return;
      }
      const wa = `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(orderText(f))}`;
      if (C.waveMerchantLink) {
        const sep = C.waveMerchantLink.includes("?") ? "&" : "?";
        window.open(`${C.waveMerchantLink}${sep}amount=${total()}`, "_blank", "noopener");
        setTimeout(() => { location.href = wa; }, 600);
      } else {
        window.open(wa, "_blank", "noopener");
      }
    });

    checkReturn();
  });
})();
