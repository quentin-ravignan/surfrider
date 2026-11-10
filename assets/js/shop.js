/* Boutique : catalogue, panier (mémorisé dans le navigateur) et paiement Wave.
   ⚠️ Les PRIX ci-dessous sont des valeurs indicatives à ajuster par l'équipe. */
(function () {
  const C = window.SF_CONFIG;

  const PRODUCTS = [
    { id: "tee", name: "T-shirt Surfrider Sénégal", desc: "Coton bio, logo drapeau sur le cœur et grande vague dans le dos.", price: 10000,
      sizes: ["S", "M", "L", "XL", "XXL"], colors: [["Blanc", "#FFFFFF"], ["Bleu océan", "#0072BC"], ["Noir", "#1B1B1B"]], art: "tee" },
    { id: "tee-kid", name: "T-shirt enfant", desc: "Pour les petit·e·s ocean lovers, de 4 à 12 ans.", price: 7000,
      sizes: ["4 ans", "6 ans", "8 ans", "10 ans", "12 ans"], colors: [["Blanc", "#FFFFFF"], ["Jaune", "#FDEF42"]], art: "tee" },
    { id: "hoodie", name: "Sweat à capuche", desc: "Molleton doux pour les sessions du petit matin au Virage.", price: 20000,
      sizes: ["S", "M", "L", "XL"], colors: [["Bleu nuit", "#0B1F33"], ["Vert", "#00853F"]], art: "hoodie" },
    { id: "cap", name: "Casquette brodée", desc: "Logo vague brodé, réglable.", price: 6000, colors: [["Bleu", "#0072BC"], ["Sable", "#E9D8B9"]], art: "cap" },
    { id: "tote", name: "Tote bag", desc: "Pour dire non aux sachets plastique au marché.", price: 4000, colors: [["Écru", "#F4E9D8"]], art: "tote" },
    { id: "gourde", name: "Gourde inox", desc: "50 cl, isotherme. Zéro bouteille plastique.", price: 8000, colors: [["Bleu", "#0072BC"], ["Blanc", "#FFFFFF"]], art: "bottle" },
    { id: "stickers", name: "Pack de stickers", desc: "5 stickers waterproof pour ta planche ou ton ordi.", price: 2000, art: "stickers" },
    { id: "don", name: "Don libre", desc: "Soutiens directement le programme Qualité de l'eau.", price: 5000, free: true, art: "heart" }
  ];

  const fmt = (v) => v.toLocaleString("fr-FR") + " FCFA";

  function art(kind, color) {
    const logo = `<g transform="translate(0 0)"><rect x="-14" y="-12" width="28" height="24" rx="3" fill="#00853F"/><rect x="-4.7" y="-12" width="9.4" height="24" fill="#FDEF42"/><rect x="4.7" y="-12" width="9.3" height="24" fill="#E31B23"/><path d="M-14 6 C -4 -10 8 -12 12 -4 C 6 -8 -2 -4 -6 6" fill="#fff" opacity=".9"/></g>`;
    const stroke = color === "#FFFFFF" || color === "#F4E9D8" || color === "#E9D8B9" ? "#CBD5E0" : "rgba(0,0,0,.15)";
    switch (kind) {
      case "tee": return `<svg viewBox="0 0 200 200"><path d="M60 30 L85 22 Q100 36 115 22 L140 30 L175 60 L155 85 L140 75 L140 178 L60 178 L60 75 L45 85 L25 60Z" fill="${color}" stroke="${stroke}" stroke-width="2"/><g transform="translate(118 70) scale(.7)">${logo}</g></svg>`;
      case "hoodie": return `<svg viewBox="0 0 200 200"><path d="M62 40 Q100 10 138 40 L172 70 L158 150 L142 146 L140 180 L60 180 L58 146 L42 150 L28 70Z" fill="${color}" stroke="${stroke}" stroke-width="2"/><path d="M78 40 Q100 70 122 40" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="4"/><rect x="72" y="130" width="56" height="26" rx="8" fill="rgba(0,0,0,.12)"/><g transform="translate(100 98) scale(1.1)">${logo}</g></svg>`;
      case "cap": return `<svg viewBox="0 0 200 200"><path d="M40 120 Q40 50 105 50 Q165 52 165 120Z" fill="${color}" stroke="${stroke}" stroke-width="2"/><path d="M30 120 Q100 108 185 128 Q190 140 175 142 Q100 128 30 136Z" fill="${color}" stroke="${stroke}" stroke-width="2" filter="brightness(.9)"/><circle cx="104" cy="52" r="5" fill="${stroke}"/><g transform="translate(102 92) scale(1)">${logo}</g></svg>`;
      case "tote": return `<svg viewBox="0 0 200 200"><path d="M70 60 Q70 20 100 20 Q130 20 130 60" fill="none" stroke="#C7B48F" stroke-width="7"/><rect x="45" y="58" width="110" height="122" rx="6" fill="${color}" stroke="#D8C7A6" stroke-width="2"/><g transform="translate(100 112) scale(1.5)">${logo}</g><text x="100" y="162" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="14" fill="#0B1F33">ZÉRO SACHET</text></svg>`;
      case "bottle": return `<svg viewBox="0 0 200 200"><rect x="85" y="18" width="30" height="20" rx="5" fill="#2C3E50"/><path d="M80 40 H120 Q132 52 132 70 V172 Q132 184 120 184 H80 Q68 184 68 172 V70 Q68 52 80 40Z" fill="${color}" stroke="${stroke}" stroke-width="2"/><g transform="translate(100 112) scale(1.2)">${logo}</g></svg>`;
      case "stickers": return `<svg viewBox="0 0 200 200"><g transform="rotate(-12 80 90)"><rect x="40" y="50" width="80" height="80" rx="16" fill="#0072BC"/><text x="80" y="98" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="18" fill="#fff">OCEAN</text></g><g transform="rotate(10 130 120)"><circle cx="130" cy="120" r="40" fill="#FDEF42"/><g transform="translate(130 120) scale(1.4)">${logo}</g></g><g transform="rotate(-4 70 160)"><rect x="40" y="142" width="80" height="34" rx="17" fill="#E31B23"/><text x="80" y="165" text-anchor="middle" font-family="Barlow Condensed" font-weight="800" font-size="16" fill="#fff">SAYTOUKAT</text></g></svg>`;
      default: return `<svg viewBox="0 0 200 200"><path d="M100 170 L35 105 Q10 75 35 50 Q62 26 100 62 Q138 26 165 50 Q190 75 165 105Z" fill="#E31B23"/><path d="M45 110 Q100 70 155 110" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>`;
    }
  }

  /* ---- Panier ------------------------------------------------------------ */
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem("sf-cart") || "[]"); } catch (e) { cart = []; }
  const save = () => { try { localStorage.setItem("sf-cart", JSON.stringify(cart)); } catch (e) {} };
  const total = () => cart.reduce((s, l) => s + l.price * l.qty, 0);

  function renderProducts() {
    const root = document.getElementById("products");
    root.innerHTML = PRODUCTS.map((p) => `
      <article class="card product" data-id="${p.id}">
        <div class="visual" style="background:${p.id === "don" ? "#FFE9EA" : "linear-gradient(160deg,#E7F2FB,#F4E9D8)"}">${art(p.art, p.colors ? p.colors[0][1] : "#fff")}</div>
        <div class="body">
          <h3 style="margin:0">${p.name}</h3>
          <p style="margin:0;color:var(--muted)">${p.desc}</p>
          ${p.colors && p.colors.length > 1 ? `<div class="opts" role="group" aria-label="Couleur">${p.colors.map(([n, c], i) => `<button type="button" class="swatch" data-color="${n}" data-hex="${c}" aria-pressed="${i === 0}" aria-label="${n}" title="${n}" style="background:${c}"></button>`).join("")}</div>` : ""}
          ${p.sizes ? `<div class="opts" role="group" aria-label="Taille">${p.sizes.map((s, i) => `<button type="button" data-size="${s}" aria-pressed="${i === 1 || (p.sizes.length < 2 && i === 0)}">${s}</button>`).join("")}</div>` : ""}
          ${p.free ? `<label class="form" style="gap:4px;font-weight:700">Montant (FCFA)<input type="number" min="500" step="500" value="${p.price}" data-amount></label>` : ""}
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;gap:10px">
            <span class="price">${p.free ? "Libre" : fmt(p.price)}</span>
            <button class="btn btn-blue btn-sm" type="button" data-add>Ajouter</button>
          </div>
        </div>
      </article>`).join("");

    root.querySelectorAll(".product").forEach((card) => {
      const p = PRODUCTS.find((x) => x.id === card.dataset.id);
      card.querySelectorAll("[data-color],[data-size]").forEach((b) => b.addEventListener("click", () => {
        const attr = b.dataset.color ? "data-color" : "data-size";
        card.querySelectorAll(`[${attr}]`).forEach((x) => x.setAttribute("aria-pressed", x === b));
        if (b.dataset.hex) card.querySelector(".visual").innerHTML = art(p.art, b.dataset.hex);
      }));
      card.querySelector("[data-add]").addEventListener("click", (e) => {
        const color = card.querySelector('[data-color][aria-pressed="true"]')?.dataset.color || (p.colors ? p.colors[0][0] : "");
        const size = card.querySelector('[data-size][aria-pressed="true"]')?.dataset.size || "";
        const price = p.free ? Math.max(500, parseInt(card.querySelector("[data-amount]").value, 10) || p.price) : p.price;
        const key = [p.id, color, size, price].join("|");
        const line = cart.find((l) => l.key === key);
        if (line) line.qty++; else cart.push({ key, id: p.id, name: p.name, color, size, price, qty: 1 });
        save(); renderCart();
        e.target.textContent = T("Ajouté ✓"); setTimeout(() => (e.target.textContent = T("Ajouter")), 1200);
      });
    });
  }

  function renderCart() {
    document.getElementById("cart-count").textContent = cart.reduce((s, l) => s + l.qty, 0);
    const lines = document.getElementById("cart-lines");
    lines.innerHTML = cart.length ? cart.map((l, i) => `
      <div class="cart-line">
        <div><strong>${T(l.name)}</strong><br><small>${[T(l.color || ""), T(l.size || "")].filter(Boolean).join(" · ")}</small></div>
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

  function orderText(f) {
    return `Bonjour Surfrider Sénégal ! Nouvelle commande sur le shop :\n` +
      cart.map((l) => `• ${l.qty} × ${l.name}${l.color ? " (" + l.color + (l.size ? ", " + l.size : "") + ")" : l.size ? " (" + l.size + ")" : ""} — ${fmt(l.price * l.qty)}`).join("\n") +
      `\nTotal : ${fmt(total())}\nNom : ${f.get("name")}\nTél : ${f.get("phone")}\n${f.get("delivery")}\n` +
      (C.waveMerchantLink ? "Paiement effectué via Wave." : "Je souhaite payer par Wave, merci de m'indiquer la marche à suivre.");
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderProducts(); renderCart();
    const drawer = document.getElementById("cart");
    const open = () => { drawer.classList.add("open"); drawer.querySelector("[data-close].btn").focus(); };
    const close = () => { drawer.classList.remove("open"); document.getElementById("cart-open").focus(); };
    document.getElementById("cart-open").addEventListener("click", open);
    drawer.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("open")) close(); });

    document.getElementById("pay-help").textContent = C.waveMerchantLink
      ? "Wave s'ouvre avec le montant de ta commande. Une fois le paiement validé, confirme ta commande sur WhatsApp."
      : "Ta commande nous est envoyée sur WhatsApp ; nous te répondons avec le lien de paiement Wave.";

    document.getElementById("checkout").addEventListener("submit", (e) => {
      e.preventDefault();
      if (!cart.length) return;
      const f = new FormData(e.target);
      const wa = `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(orderText(f))}`;
      if (C.waveMerchantLink) {
        const sep = C.waveMerchantLink.includes("?") ? "&" : "?";
        window.open(`${C.waveMerchantLink}${sep}amount=${total()}`, "_blank", "noopener");
        setTimeout(() => { location.href = wa; }, 600);
      } else {
        window.open(wa, "_blank", "noopener");
      }
    });
  });
})();
