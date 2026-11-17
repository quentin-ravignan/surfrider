"""Veille des financements (page « Recherche de projets » de l'espace membres).

Lancé chaque jour par GitHub Actions (.github/workflows/news.yml) ; écrit
data/funding.json. Les opportunités sont conservées d'un jour à l'autre et
retirées quelques jours après leur date limite.

Sources (publiques, sans clé) :
  • Portail Funding & Tenders de la Commission européenne (appels ouverts / à venir)
  • Grants.gov (États-Unis — souvent réservé aux organismes américains, signalé)
  • fundsforNGOs (flux RSS des appels pour ONG, filtré sur l'océan et le littoral)
  • Google Actualités (articles annonçant des appels à projets)

Utilisation locale :  python scripts/fetch_funding.py
"""
import datetime as dt
import email.utils
import hashlib
import html
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "funding.json"
UA = "Mozilla/5.0 (compatible; surfrider-sn-funding/1.0)"
TODAY = dt.date.today()

# mots-clés de thématique (océan, littoral, pollution marine…) → pertinence
THEME = [
    r"ocean", r"oc[ée]an", r"marine", r"\bmarin", r"\bsea\b", r"\bmer\b", r"coast", r"c[ôo]ti", r"littoral", r"beach", r"plage",
    r"plastic", r"plastique", r"mangrove", r"coral", r"corail", r"fisher", r"p[êe]che", r"blue econom", r"[ée]conomie bleue",
    r"wetland", r"zones? humides?", r"water quality", r"qualit[ée] de l.eau", r"pollution", r"biodiversit", r"climat", r"climate",
    r"waste", r"d[ée]chets", r"estuar", r"sanitation", r"assainissement",
]
CORE = re.compile(r"ocean|oc[ée]an|marine|\bmarin|\bsea\b|\bmer\b|coast|c[ôo]ti|littoral|beach|plage|mangrove|coral|blue econom|[ée]conomie bleue|fisher|p[êe]che|plastic|plastique", re.I)
AFRICA = re.compile(r"africa|afrique|senegal|s[ée]n[ée]gal|west africa|afrique de l.ouest|sahel|ecowas|cedeao|lmic|developing countr|pays en d[ée]veloppement|global south|international|worldwide|all countries|tous pays", re.I)
NGO = re.compile(r"\bngo|\bong\b|civil society|soci[ée]t[ée] civile|association|community|communaut|grassroots|non-?profit", re.I)
US_ONLY = re.compile(r"\(us\)|united states|u\.s\.|noaa|epa\b|state of ", re.I)

MONTHS = {m: i for i, m in enumerate(["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"], 1)}
MONTHS.update({m: i for i, m in enumerate(["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"], 1)})
MONTHS.update({m[:3]: i for m, i in list(MONTHS.items())})


def get(url, data=None, headers=None, timeout=30):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def clean(s):
    s = html.unescape(re.sub(r"<[^>]+>", " ", s or ""))
    return re.sub(r"\s+", " ", s).strip()


def find_deadline(text):
    """Cherche une date limite dans un texte (anglais / français)."""
    t = text.lower()
    m = re.search(r"(deadline|date limite|due|closing date|cl[ôo]ture|avant le|until|jusqu.au)[^0-9a-z]{0,15}(.{0,40})", t)
    zone = m.group(2) if m else ""
    for pat in (r"(\d{1,2})[ -]([a-zéû]{3,9})\.?[ ,-]+(\d{2,4})", r"([a-zéû]{3,9})\.? (\d{1,2}),? (\d{4})", r"(\d{1,2})/(\d{1,2})/(\d{4})"):
        mm = re.search(pat, zone)
        if not mm:
            continue
        try:
            a, b, c = mm.groups()
            if pat.startswith(r"(\d{1,2})/"):
                d = dt.date(int(c), int(b), int(a))
            elif a.isdigit():
                y = int(c) + (2000 if len(c) == 2 else 0)
                d = dt.date(y, MONTHS[b[:3]] if b[:3] in MONTHS else MONTHS[b], int(a))
            else:
                d = dt.date(int(c), MONTHS[a[:3]] if a[:3] in MONTHS else MONTHS[a], int(b))
            return d.isoformat()
        except Exception:
            continue
    return None


def find_amount(text):
    m = re.search(r"((?:€|\$|£|USD|EUR|US\$)\s?[\d][\d.,  ]*(?:\s?(?:million|millions|m|k|billion))?|[\d][\d.,  ]*\s?(?:million|millions|k)?\s?(?:€|euros?|USD|dollars?|FCFA|XOF|£))", text, re.I)
    return m.group(1).strip() if m else ""


def score(text, region=""):
    s = sum(1 for p in THEME if re.search(p, text, re.I))
    if CORE.search(text):
        s += 3
    if AFRICA.search(text + " " + region):
        s += 3
    if NGO.search(text):
        s += 1
    if US_ONLY.search(text + " " + region):
        s -= 3
    return s


def oid(*parts):
    return hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()[:12]


# ---------------------------------------------------------------- sources
def eu_portal():
    out = []
    for q in ["ocean", "marine", "coastal", "plastic pollution", "blue economy", "fisheries", "mangrove", "Africa ocean"]:
        boundary = "----sfboundary"
        parts = [
            ("query", json.dumps({"bool": {"must": [{"terms": {"type": ["1", "2", "8"]}}, {"terms": {"status": ["31094501", "31094502"]}}]}})),
            ("languages", json.dumps(["en"])),
        ]
        body = b""
        for name, val in parts:
            body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\nContent-Type: application/json\r\n\r\n{val}\r\n".encode()
        body += f"--{boundary}--\r\n".encode()
        url = "https://api.tech.ec.europa.eu/search-api/prod/rest/search?" + urllib.parse.urlencode({"apiKey": "SEDIA", "text": q, "pageSize": 50, "pageNumber": 1})
        try:
            d = json.loads(get(url, body, {"Content-Type": f"multipart/form-data; boundary={boundary}"}))
        except Exception as e:
            print("UE échec", q, e)
            continue
        for r in d.get("results", []):
            m = r.get("metadata", {})
            ident = (m.get("identifier") or [""])[0]
            title = clean((m.get("title") or [r.get("summary", "")])[0])
            dl = (m.get("deadlineDate") or [""])[0][:10] or None
            if not ident or not title or (dl and dl < TODAY.isoformat()):
                continue
            kind = (m.get("typesOfAction") or [""])[0]
            out.append({
                "id": "eu-" + ident, "title": title, "funder": "Commission européenne", "source": "Portail Funding & Tenders (UE)",
                "url": "https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/" + ident,
                "region": "Union européenne", "amount": "", "deadline": dl,
                "summary": f"{ident} · {kind}".strip(" ·"), "eligibility": "Consortium avec partenaires UE / pays associés : vérifier l'éligibilité des pays tiers",
            })
        time.sleep(1)
    return out


def grants_gov():
    out = []
    for kw in ["ocean conservation", "marine debris", "coastal resilience", "international marine", "Africa environment"]:
        try:
            d = json.loads(get("https://api.grants.gov/v1/api/search2", json.dumps({"keyword": kw, "oppStatuses": "forecasted|posted", "rows": 40}).encode(), {"Content-Type": "application/json"}))["data"]
        except Exception as e:
            print("Grants.gov échec", kw, e)
            continue
        for h in d.get("oppHits", []):
            close = h.get("closeDate") or ""
            dl = None
            if close:
                try:
                    dl = dt.datetime.strptime(close, "%m/%d/%Y").date().isoformat()
                except ValueError:
                    pass
            if dl and dl < TODAY.isoformat():
                continue
            out.append({
                "id": "gg-" + str(h.get("id")), "title": clean(h.get("title")), "funder": clean(h.get("agency")), "source": "Grants.gov (États-Unis)",
                "url": f"https://www.grants.gov/search-results-detail/{h.get('id')}", "region": "États-Unis", "amount": "", "deadline": dl,
                "summary": clean(h.get("number")), "eligibility": "Souvent réservé aux organismes américains : vérifier l'éligibilité",
            })
        time.sleep(1)
    return out


def rss_items(url):
    root = ET.fromstring(get(url))
    for it in root.iter("item"):
        yield it


def funds_for_ngos():
    out = []
    try:
        items = list(rss_items("https://www2.fundsforngos.org/feed/"))
    except Exception as e:
        print("fundsforNGOs échec", e)
        return out
    for it in items:
        title = clean(it.findtext("title"))
        desc = clean(it.findtext("description"))
        content = clean(it.findtext("{http://purl.org/rss/1.0/modules/content/}encoded") or "")
        text = f"{title} {desc} {content}"
        if not CORE.search(text):
            continue
        link = (it.findtext("link") or "").strip()
        region = re.search(r"\(([^)]+)\)\s*$", title)
        out.append({
            "id": "fn-" + oid(link), "title": title, "funder": "", "source": "fundsforNGOs", "url": link,
            "region": region.group(1) if region else "International", "amount": find_amount(text), "deadline": find_deadline(text),
            "summary": desc[:400], "eligibility": "",
        })
    return out


def google_news():
    out = []
    queries = [
        ("appel à projets océan", "fr", "FR"), ("appel à projets littoral", "fr", "FR"), ("appel à projets biodiversité marine Afrique", "fr", "SN"),
        ("appel à propositions pollution plastique", "fr", "FR"), ("call for proposals ocean conservation", "en", "US"),
        ("grant marine conservation Africa", "en", "US"), ("blue economy grant Africa", "en", "US"),
    ]
    for q, lang, country in queries:
        url = "https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": q + " when:60d", "hl": lang, "gl": country, "ceid": f"{country}:{lang}"})
        try:
            items = list(rss_items(url))
        except Exception as e:
            print("Google échec", q, e)
            continue
        for it in items[:15]:
            title = clean(it.findtext("title"))
            src = it.find("source")
            source = (src.text or "").strip() if src is not None else ""
            if source and title.endswith(" - " + source):
                title = title[: -len(" - " + source)]
            if not re.search(r"appel|call for|grant|fund|financement|subvention|prix|award|prize|fonds", title, re.I):
                continue
            try:
                pub = email.utils.parsedate_to_datetime(it.findtext("pubDate")).date().isoformat()
            except Exception:
                pub = TODAY.isoformat()
            out.append({
                "id": "gn-" + oid(title.lower()), "title": title, "funder": source, "source": "Google Actualités", "url": (it.findtext("link") or "").strip(),
                "region": "", "amount": find_amount(title), "deadline": find_deadline(title), "summary": f"Article du {pub} ({source}) annonçant un appel ou un financement.",
                "eligibility": "", "published": pub,
            })
        time.sleep(2)
    return out


def main():
    old = {}
    if OUT.exists():
        try:
            old = {o["id"]: o for o in json.loads(OUT.read_text(encoding="utf-8")).get("items", [])}
        except Exception:
            old = {}
    found = []
    for fn in (eu_portal, grants_gov, funds_for_ngos, google_news):
        try:
            res = fn()
            print(fn.__name__, len(res))
            found += res
        except Exception as e:
            print(fn.__name__, "échec", e)
    items = dict(old)
    for o in found:
        o["score"] = score(" ".join([o["title"], o.get("summary", ""), o.get("funder", "")]), o.get("region", ""))
        prev = items.get(o["id"], {})
        o["first_seen"] = prev.get("first_seen", TODAY.isoformat())
        items[o["id"]] = o
    keep = []
    for o in items.values():
        if o.get("score", 0) < 3:
            continue
        if o.get("deadline") and o["deadline"] < (TODAY - dt.timedelta(days=3)).isoformat():
            continue  # date limite passée
        if not o.get("deadline") and o.get("first_seen", TODAY.isoformat()) < (TODAY - dt.timedelta(days=90)).isoformat():
            continue  # sans date limite connue : gardé 90 jours
        keep.append(o)
    keep.sort(key=lambda o: (-o["score"], o.get("deadline") or "9999"))
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({"updated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "items": keep[:300]}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(len(keep), "opportunités ->", OUT)


if __name__ == "__main__":
    main()
