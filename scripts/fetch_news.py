"""Récupère les actualités pour l'onglet « Communication » de l'espace membres.

Lancé chaque jour par GitHub Actions (.github/workflows/news.yml), il interroge
les flux RSS publics de Google Actualités et écrit data/news.json.
Pour changer les sujets suivis, modifier QUERIES ci-dessous.

Utilisation locale :  python scripts/fetch_news.py
"""
import datetime as dt
import email.utils
import html
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

# (catégorie, requête, langue, pays)
QUERIES = [
    ("nous", "Surfrider Sénégal", "fr", "SN"),
    ("nous", "Surfrider Dakar", "fr", "SN"),
    ("senegal", "pollution plage Dakar", "fr", "SN"),
    ("senegal", "littoral Sénégal", "fr", "SN"),
    ("senegal", "Sénégal océan", "fr", "SN"),
    ("reseau", "Surfrider Foundation", "fr", "FR"),
    ("monde", "protection des océans", "fr", "FR"),
    ("monde", "ocean conservation", "en", "US"),
]
MAX_PER_QUERY = 12
# ancienneté maximale (jours) : nos propres articles restent visibles plus longtemps
MAX_AGE_DAYS = {"nous": 1100, "reseau": 180}
DEFAULT_AGE = 90
# sujets hors champ écartés (les recherches « océan » ramènent beaucoup d'actualité migratoire)
EXCLUDE = re.compile(r"migra|émigration|clandestin|naufrag|foudre|orages?", re.I)
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "news.json"
UA = "Mozilla/5.0 (compatible; surfrider-sn-news/1.0)"


def fetch(query, lang, country):
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": query, "hl": lang, "gl": country, "ceid": f"{country}:{lang}"}
    )
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def parse(xml_bytes):
    root = ET.fromstring(xml_bytes)
    for it in root.iter("item"):
        title = html.unescape(it.findtext("title") or "").strip()
        src_el = it.find("source")
        source = (src_el.text or "").strip() if src_el is not None else ""
        if source and title.endswith(" - " + source):
            title = title[: -len(" - " + source)]
        pub = it.findtext("pubDate") or ""
        try:
            date = email.utils.parsedate_to_datetime(pub).astimezone(dt.timezone.utc)
        except Exception:
            continue
        yield {"title": title, "link": (it.findtext("link") or "").strip(), "source": source, "date": date}


def main():
    now = dt.datetime.now(dt.timezone.utc)
    seen, items = set(), []
    for cat, query, lang, country in QUERIES:
        time.sleep(3)  # politesse envers le serveur
        try:
            data = fetch(query, lang, country)
        except Exception as e:  # un flux en panne ne bloque pas les autres
            print("échec", query, e)
            continue
        n = 0
        for a in parse(data):
            if EXCLUDE.search(a["title"]):
                continue
            ours = cat == "nous"  # résultat de la recherche « Surfrider Sénégal / Dakar »
            if (now - a["date"]).days > MAX_AGE_DAYS.get("nous" if ours else cat, DEFAULT_AGE):
                continue
            key = re.sub(r"\W+", "", a["title"].lower())[:80]
            if key in seen:
                continue
            seen.add(key)
            items.append({
                "title": a["title"], "link": a["link"], "source": a["source"],
                "date": a["date"].strftime("%Y-%m-%dT%H:%M:%SZ"),
                "cat": cat, "lang": lang,
            })
            n += 1
            if n >= MAX_PER_QUERY:
                break
    items.sort(key=lambda x: x["date"], reverse=True)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({"updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "items": items}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(len(items), "articles ->", OUT)


if __name__ == "__main__":
    main()
