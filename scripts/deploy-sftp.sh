#!/usr/bin/env bash
#
# Publie le contenu de dist/ sur l'hébergement de production via SFTP (lftp).
#
# Variables d'environnement attendues :
#   SFTP_SERVER    hôte SFTP (ex. arana.reverine.net)
#   SFTP_USER      identifiant SFTP
#   SFTP_PASSWORD  mot de passe SFTP
#   SFTP_REMOTE_DIR  (optionnel) racine web distante
#                    défaut : /websites/www.cnfrance.fr
#   DEPLOY_FORCE_FULL  (optionnel) "true" pour réenvoyer TOUS les médias,
#                      même ceux dont la taille n'a pas changé.
#   DEPLOY_DRY_RUN     (optionnel) "true" pour n'afficher que les actions.
#
# L'hébergeur n'autorise que le SFTP (pas de shell), donc pas de rsync : on
# utilise `lftp mirror`, qui fait la même synchronisation incrémentale.

set -euo pipefail

LOCAL_DIR="${LOCAL_DIR:-dist}"
REMOTE_DIR="${SFTP_REMOTE_DIR:-/websites/www.cnfrance.fr}"

for var in SFTP_SERVER SFTP_USER SFTP_PASSWORD; do
  if [ -z "${!var:-}" ]; then
    echo "::error::La variable $var est vide. Renseignez-la dans l'environnement GitHub « production »." >&2
    exit 1
  fi
done

if [ ! -f "$LOCAL_DIR/index.html" ] || [ ! -d "$LOCAL_DIR/medias" ]; then
  echo "::error::$LOCAL_DIR semble incomplet (index.html ou medias/ manquant) — le build a-t-il bien tourné ?" >&2
  exit 1
fi

# La racine web héberge encore les fichiers de l'ancien site Joomla, qui
# appartiennent à root et que notre compte SFTP ne peut ni écrire ni supprimer.
# On les exclut de la synchronisation pour que `--delete` n'y touche jamais.
# `images/` en fait partie : le nouveau site publie ses médias dans `medias/`,
# précisément pour ne pas entrer en conflit avec ce dossier verrouillé.
JOOMLA_LEFTOVERS='^(administrator|bin|cache|cli|components|images|includes|language|layouts|libraries|media|modules|plugins|templates|tmp)/|^(LICENSE\.txt|README\.txt|configuration\.php|htaccess\.txt|index\.php|robots\.txt|robots\.txt\.dist)$'

DRY_RUN=""
if [ "${DEPLOY_DRY_RUN:-}" = "true" ]; then
  DRY_RUN="--dry-run"
  echo "== MODE SIMULATION : aucun fichier ne sera réellement transféré =="
fi

# Les médias (medias/ et documents/, ~205 Mo) sont comparés à la taille seule
# (--ignore-time) : un build régénère dist/ entièrement, donc toutes les dates
# locales sont plus récentes et une comparaison par date renverrait 205 Mo à
# chaque déploiement. Les pages HTML/CSS/JS (~3 Mo, 103 fichiers) sont, elles,
# renvoyées systématiquement : c'est peu coûteux et cela garantit qu'une page
# modifiée sans changement de taille est bien publiée.
MEDIA_COMPARE="--ignore-time"
if [ "${DEPLOY_FORCE_FULL:-}" = "true" ]; then
  MEDIA_COMPARE=""
  echo "== Renvoi complet demandé : les médias seront tous retransférés =="
fi

LFTP_SCRIPT="$(mktemp)"
trap 'rm -f "$LFTP_SCRIPT"' EXIT
chmod 600 "$LFTP_SCRIPT"

# Le script est passé par fichier (et non en argument) pour que le mot de passe
# n'apparaisse pas dans la liste des processus du runner.
cat > "$LFTP_SCRIPT" <<EOF
set sftp:auto-confirm yes
set net:max-retries 3
set net:timeout 30
set net:reconnect-interval-base 5
set mirror:parallel-transfer-count 4
set cmd:fail-exit yes
set xfer:clobber on
open -u "$SFTP_USER","$SFTP_PASSWORD" "sftp://$SFTP_SERVER"

# 1/3 — médias volumineux, comparaison par taille
mirror --reverse --delete --no-perms --no-symlinks $MEDIA_COMPARE $DRY_RUN \
  --parallel=4 --verbose=1 \
  "$LOCAL_DIR/medias" "$REMOTE_DIR/medias"
mirror --reverse --delete --no-perms --no-symlinks $MEDIA_COMPARE $DRY_RUN \
  --parallel=4 --verbose=1 \
  "$LOCAL_DIR/documents" "$REMOTE_DIR/documents"

# 2/3 — pages et assets, renvoyés à chaque déploiement
mirror --reverse --delete --no-perms --no-symlinks $DRY_RUN \
  --parallel=4 --verbose=1 \
  --exclude '^medias/' --exclude '^documents/' \
  --exclude '$JOOMLA_LEFTOVERS' \
  "$LOCAL_DIR" "$REMOTE_DIR"

bye
EOF

echo "== Synchronisation de $LOCAL_DIR vers $SFTP_USER@$SFTP_SERVER:$REMOTE_DIR =="
lftp -f "$LFTP_SCRIPT"
echo "== Synchronisation terminée =="
