# -*- coding: utf-8 -*-
"""Le workflow qui garde la signature de Caroline Bonu.

Deux portes :
  POST  /bcb-provider-signature-save   la page de signature y depose le trace
  GET   /bcb-provider-signature        le formulaire patient y lit la signature

Elle est rangee dans un fichier JSON d'un dossier Drive prive : ni partage, ni
indexe, ni recuperable autrement que par cette adresse. Tant qu'elle n'a pas
signe, la lecture renvoie une signature vide et les documents sortent avec une
ligne vierge, ce qui est le comportement voulu au demarrage.

  --appliquer  cree ou met a jour le workflow (sinon simple simulation)
"""
import json
import pathlib
import sys
import urllib.error
import urllib.request

NOM = "BCB - Signature prestataire"
FICHIER_SIGNATURE = "1nfMcFG_jLaRiWMYC3f1TWhoH4onmMYBQ"
CHEMIN_SAVE = "bcb-provider-signature-save"
CHEMIN_LIRE = "bcb-provider-signature"
CRED_DRIVE = {"googleDriveOAuth2Api": {"id": "kv82eh4A4uyXrSks", "name": "Google Drive account 2"}}
RACINE = pathlib.Path(__file__).resolve().parents[4]

# La page de signature et le formulaire patient vivent sur ce domaine.
ORIGINES = "https://bcblibertyform.sbs"


def env():
    d = {}
    for line in (RACINE / ".env").read_text(encoding="utf-8", errors="replace").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            d.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return d


E = env()
BASE = E["N8N_BASE_URL"].rstrip("/")
KEY = E["N8N_API_KEY"]


def api(methode, chemin, corps=None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    req = urllib.request.Request(BASE + chemin, data=donnees, method=methode,
                                 headers={"X-N8N-API-KEY": KEY, "Accept": "application/json",
                                          "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        print("\nn8n a refuse (" + str(e.code) + ") :")
        print(e.read().decode("utf-8", "replace")[:1000])
        raise SystemExit(1)


noeuds = []
liens = {}


def poser(nom, typ, params, x, y, tv=1, creds=None, on_error=None):
    n = {"parameters": params, "type": typ, "typeVersion": tv, "position": [x, y],
         "id": nom.replace(" ", "-").lower(), "name": nom}
    if creds:
        n["credentials"] = creds
    if on_error:
        n["onError"] = on_error
    noeuds.append(n)
    return n


def relie(source, cible):
    liens.setdefault(source, {"main": [[]]})
    liens[source]["main"][0] = [{"node": cible, "type": "main", "index": 0}]


# ══ Enregistrer la signature ═══════════════════════════════════════════════
poser("Signature recue", "n8n-nodes-base.webhook",
      {"httpMethod": "POST", "path": CHEMIN_SAVE, "responseMode": "responseNode",
       "options": {"allowedOrigins": ORIGINES}}, -600, 0, tv=2)

poser("Preparer le JSON", "n8n-nodes-base.code",
      {"jsCode": """// On range la signature telle qu'elle arrive, avec son prefixe data:
// pour pouvoir la reposer directement dans un PDF sans retraitement.
const b = $input.first().json.body || {};
const sig = String(b.provider_signature || '');
if (!sig.startsWith('data:image/')) {
  throw new Error('Signature manquante ou illisible.');
}
// actif reste faux : signer ne suffit pas a apposer la signature sur les
// documents, Yanis doit encore donner le feu vert (activer_signature.py).
return [{ json: { contenu: JSON.stringify({
  signature: sig,
  provider_rep_name: b.provider_rep_name || 'Caroline Bonu',
  provider_rep_title: b.provider_rep_title || 'APRN',
  signed_at: b.signed_at || new Date().toISOString(),
  actif: false
}) } }];"""}, -380, 0, tv=2)

poser("En fichier", "n8n-nodes-base.convertToFile",
      {"operation": "toText", "sourceProperty": "contenu",
       "options": {"fileName": "provider-signature.json", "encoding": "utf8"}},
      -160, 0, tv=1.1)

# On ecrase le meme fichier : il n'y a qu'une signature en vigueur a la fois.
poser("Ranger la signature", "n8n-nodes-base.googleDrive",
      {"operation": "update", "fileId": {"__rl": True, "mode": "id", "value": FICHIER_SIGNATURE},
       "changeFileContent": True,
       "options": {"keepRevisionForever": True}}, 60, 0, tv=3, creds=CRED_DRIVE)

poser("Confirmer", "n8n-nodes-base.respondToWebhook",
      {"respondWith": "json", "responseBody": '={"ok": true}', "options": {}}, 280, 0, tv=1.1)

relie("Signature recue", "Preparer le JSON")
relie("Preparer le JSON", "En fichier")
relie("En fichier", "Ranger la signature")
relie("Ranger la signature", "Confirmer")

# ══ Relire la signature ════════════════════════════════════════════════════
poser("Signature demandee", "n8n-nodes-base.webhook",
      {"httpMethod": "GET", "path": CHEMIN_LIRE, "responseMode": "responseNode",
       "options": {"allowedOrigins": "*"}}, -600, 240, tv=2)

poser("Lire le fichier", "n8n-nodes-base.googleDrive",
      {"operation": "download",
       "fileId": {"__rl": True, "mode": "id", "value": FICHIER_SIGNATURE},
       "options": {}}, -380, 240, tv=3, creds=CRED_DRIVE,
      on_error="continueErrorOutput")

poser("Texte du fichier", "n8n-nodes-base.extractFromFile",
      {"operation": "text", "destinationKey": "contenu", "options": {}},
      -160, 240, tv=1, on_error="continueRegularOutput")

poser("Reponse signature", "n8n-nodes-base.code",
      {"jsCode": """// Une signature absente n'est pas une erreur : c'est l'etat normal tant que
// Caroline Bonu n'a pas signe. Le formulaire doit recevoir une reponse valide
// et produire ses documents avec une ligne de signature vierge.
let d = { signature: '', provider_rep_name: '', provider_rep_title: '',
          signed_at: '', actif: false };
try {
  const brut = $input.first().json.contenu;
  if (brut) d = Object.assign(d, JSON.parse(brut));
} catch (e) { /* fichier vide ou illisible : on renvoie le vide */ }
// Deux verrous distincts : elle a signe, et Yanis a donne le feu vert. Tant que
// le second manque, les documents sortent avec une ligne de signature vierge.
if (!d.actif) d.signature = '';
return [{ json: d }];"""}, 60, 240, tv=2)

poser("Servir la signature", "n8n-nodes-base.respondToWebhook",
      {"respondWith": "json", "responseBody": "={{ JSON.stringify($json) }}",
       "options": {"responseHeaders": {"entries": [
           {"name": "Access-Control-Allow-Origin", "value": "*"},
           {"name": "Cache-Control", "value": "no-store"}]}}},
      280, 240, tv=1.1)

relie("Signature demandee", "Lire le fichier")
relie("Lire le fichier", "Texte du fichier")
relie("Texte du fichier", "Reponse signature")
relie("Reponse signature", "Servir la signature")

# ── Creation ou mise a jour ────────────────────────────────────────────────
existants = api("GET", "/api/v1/workflows?limit=250")["data"]
cible = next((w for w in existants if w["name"] == NOM), None)

print("workflow :", NOM, "|", len(noeuds), "noeuds")
print("  POST", BASE + "/webhook/" + CHEMIN_SAVE)
print("  GET ", BASE + "/webhook/" + CHEMIN_LIRE)
print("  fichier de stockage :", FICHIER_SIGNATURE, "(dossier prive)")

if "--appliquer" not in sys.argv:
    print("\nSIMULATION. Rien n'a ete pousse. Relancer avec --appliquer.")
    sys.exit(0)

corps = {"name": NOM, "nodes": noeuds, "connections": liens,
         "settings": {"executionOrder": "v1"}}
if cible:
    api("PUT", "/api/v1/workflows/" + cible["id"], corps)
    wid = cible["id"]
    print("\nmis a jour :", wid)
else:
    cree = api("POST", "/api/v1/workflows", corps)
    wid = cree["id"]
    print("\ncree :", wid)

api("POST", "/api/v1/workflows/" + wid + "/activate")
print("active.")
