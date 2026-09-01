# -*- coding: utf-8 -*-
"""n8n ne fabrique plus les documents : il les depose et consigne les liens.

Les trois PDF arrivent tout faits du navigateur. Toute la machinerie Google Docs
(copie du modele, 138 remplacements, televersement puis suppression des images,
insertion par l'API Docs, export PDF) disparait : une soixantaine de noeuds
tombe a moins de vingt, et l'attente du patient passe d'une quarantaine de
secondes a quelques-unes.

Ordre voulu : le dossier d'admission est depose AVANT la reponse, parce que
c'est son lien que le patient recoit pour telecharger sa copie. Les deux
documents de discharge partent apres : ils ne le concernent pas, il n'a pas a
les attendre.

  --appliquer  pousse reellement le workflow (sinon simple simulation)
"""
import json
import pathlib
import sys
import urllib.error
import urllib.request

WF_ID = "88PXvVb4Oxg8atwDgyIVT"
RACINE = pathlib.Path(__file__).resolve().parents[4]

DOSSIERS = {
    "admission": "1MMREBWSo1OWnzUiaMYZkCNDkMa720WqS",   # BCB LIBERTY ALL FORM
    "discharge": "1Z7U0lB9OcJi599gM4zqNerPkbzJgM0WR",   # BCB DISCHARGE AUTHORIZATION
    "carelon": "1-zePCUGg8NNfHrpCVktnt8czBGMQKb5v",     # BCB CARELON ATTESTATION
}
CRED_DRIVE = {"googleDriveOAuth2Api": {"id": "kv82eh4A4uyXrSks", "name": "Google Drive account 2"}}

# Les seuls noeuds de l'ancien workflow qu'on garde.
A_GARDER = {"Webhook4", "Respond to Webhook1", "Append row in sheet",
            "Error Trigger", "Send a message"}

# L'API publique refuse tout reglage qu'elle ne connait pas.
REGLAGES_OK = {"saveExecutionProgress", "saveManualExecutions", "saveDataErrorExecution",
               "saveDataSuccessExecution", "executionTimeout", "errorWorkflow",
               "timezone", "executionOrder"}


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
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        print("\nn8n a refuse (" + str(e.code) + ") :")
        print(e.read().decode("utf-8", "replace")[:1200])
        raise SystemExit(1)


wf = api("GET", "/api/v1/workflows/" + WF_ID)
anciens = {n["name"] for n in wf["nodes"]}
print("avant :", wf["name"], "|", len(wf["nodes"]), "noeuds")

# ── Sauvegarde, sans les donnees patient epinglees ──────────────────────────
ici = pathlib.Path(__file__).parent
propre = {k: v for k, v in wf.items()
          if k not in ("pinData", "activeVersion", "shared", "staticData")}
(ici / "workflow_avant_navigateur.json").write_text(
    json.dumps(propre, indent=2, ensure_ascii=False), encoding="utf-8")
print("sauvegarde :", (ici / "workflow_avant_navigateur.json").name)

garde = {n["name"]: n for n in wf["nodes"] if n["name"] in A_GARDER}
manquants = A_GARDER - set(garde)
assert not manquants, "noeuds introuvables : %s" % sorted(manquants)

noeuds = []
liens = {}


def relie(source, cible):
    liens.setdefault(source, {"main": [[]]})
    liens[source]["main"][0] = [{"node": cible, "type": "main", "index": 0}]


def poser(nom, typ, params, x, y, tv=1, creds=None, on_error=None):
    n = {"parameters": params, "type": typ, "typeVersion": tv, "position": [x, y],
         "id": nom.replace(" ", "-").lower(), "name": nom}
    if creds:
        n["credentials"] = creds
    if on_error:
        n["onError"] = on_error
    noeuds.append(n)
    return n


def chaine(libelle, dossier, y, tolerant):
    """Set -> Convert to File -> Upload -> Share, pour un document deja fait.

    tolerant : un echec n'interrompt pas la suite. Reserve aux deux documents de
    discharge. Le dossier d'admission, lui, doit echouer bruyamment : c'est le
    dossier medical, et le patient peut relancer l'envoi depuis le formulaire.
    """
    err = "continueRegularOutput" if tolerant else None
    poser("data " + libelle, "n8n-nodes-base.set",
          {"assignments": {"assignments": [{
              "id": "b64-" + libelle, "name": "data", "type": "string",
              "value": "={{ $('Webhook4').item.json.body.pdf_" + libelle + " }}"}]},
           "options": {}}, -400, y, tv=3.4)
    poser("Convert " + libelle, "n8n-nodes-base.convertToFile",
          {"operation": "toBinary", "sourceProperty": "data", "options": {}},
          -180, y, tv=1.1, on_error=err)
    poser("Upload " + libelle, "n8n-nodes-base.googleDrive",
          {"name": "={{ $('Webhook4').item.json.body.pdf_" + libelle + "_nom }}",
           "driveId": {"__rl": True, "mode": "list", "value": "My Drive"},
           "folderId": {"__rl": True, "mode": "id", "value": dossier},
           "options": {}}, 40, y, tv=3, creds=CRED_DRIVE, on_error=err)
    poser("Share " + libelle, "n8n-nodes-base.googleDrive",
          {"operation": "share",
           "fileId": {"__rl": True, "mode": "id",
                      "value": "={{ $('Upload " + libelle + "').item.json.id }}"},
           # allowFileDiscovery a False : le lien suffit a ouvrir le document, mais
           # il ne remonte plus dans les resultats de recherche. Ces PDF portent
           # un numero de securite sociale et une evaluation du risque suicidaire.
           "permissionsUi": {"permissionsValues": {
               "role": "reader", "type": "anyone", "allowFileDiscovery": False}},
           "options": {}}, 260, y, tv=3, creds=CRED_DRIVE, on_error=err)
    relie("data " + libelle, "Convert " + libelle)
    relie("Convert " + libelle, "Upload " + libelle)
    relie("Upload " + libelle, "Share " + libelle)


# ── Le webhook, inchange : c'est l'adresse que le formulaire connait ────────
w = garde["Webhook4"]
w["position"] = [-620, 300]
noeuds.append(w)

chaine("admission", DOSSIERS["admission"], 300, tolerant=False)
chaine("discharge", DOSSIERS["discharge"], 480, tolerant=True)
chaine("carelon", DOSSIERS["carelon"], 660, tolerant=True)

# ── La reponse au patient : le lien de telechargement de son dossier ────────
rep = garde["Respond to Webhook1"]
rep["parameters"]["responseBody"] = (
    "=https://drive.google.com/uc?export=download&id="
    "{{ $('Upload admission').item.json.id }}")
rep["position"] = [480, 300]
noeuds.append(rep)

# ── Les trois liens, calcules a part ────────────────────────────────────────
poser("liens documents", "n8n-nodes-base.code",
      {"jsCode": """// Un depot rate ne doit pas empecher d'ecrire la ligne du patient :
// mieux vaut une case vide qu'un dossier sans trace.
function lien(nom){
  try{
    const id = $(nom).first().json.id;
    return id ? 'https://drive.google.com/file/d/' + id + '/view' : '';
  }catch(e){ return ''; }
}
return [{ json: {
  lien_admission: lien('Upload admission'),
  lien_discharge: lien('Upload discharge'),
  lien_carelon:   lien('Upload carelon'),
  erreur_documents: $('Webhook4').first().json.body.pdf_error || ''
}}];"""}, 480, 660, tv=2)

# ── La ligne du Sheet : les trois liens cote a cote ─────────────────────────
sheet = garde["Append row in sheet"]
val = sheet["parameters"]["columns"]["value"]
val["FORM LINKS"] = "={{ $json.lien_admission }}"
val["DISCHARGE FORM LINK"] = "={{ $json.lien_discharge }}"
val["CARELON FORM LINK"] = "={{ $json.lien_carelon }}"
sheet["position"] = [700, 660]
noeuds.append(sheet)

noeuds.append(garde["Error Trigger"])
noeuds.append(garde["Send a message"])

relie("Webhook4", "data admission")
relie("Share admission", "Respond to Webhook1")
relie("Respond to Webhook1", "data discharge")
relie("Share discharge", "data carelon")
relie("Share carelon", "liens documents")
relie("liens documents", "Append row in sheet")
relie("Error Trigger", "Send a message")

supprimes = anciens - {n["name"] for n in noeuds}
print("\nsupprimes (%d) :" % len(supprimes), ", ".join(sorted(supprimes)))
print("conserves     :", ", ".join(sorted(A_GARDER)))
print("ajoutes       :", ", ".join(sorted({n['name'] for n in noeuds} - anciens)))
print("total         :", len(noeuds), "noeuds")
print("\nchemin : Webhook -> admission -> reponse au patient -> discharge -> "
      "carelon -> liens -> Sheet")

wf["nodes"] = noeuds
wf["connections"] = liens
(ici / "workflow_apres_navigateur.json").write_text(
    json.dumps({k: v for k, v in wf.items()
                if k not in ("pinData", "activeVersion", "shared", "staticData")},
               indent=2, ensure_ascii=False), encoding="utf-8")

if "--appliquer" not in sys.argv:
    print("\nSIMULATION. Rien n'a ete pousse. Relancer avec --appliquer.")
    sys.exit(0)

reglages = {k: v for k, v in (wf.get("settings") or {}).items() if k in REGLAGES_OK}
api("PUT", "/api/v1/workflows/" + WF_ID,
    {"name": wf["name"], "nodes": noeuds, "connections": liens, "settings": reglages})
print("\nWorkflow pousse.")
