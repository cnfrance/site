<?php
/**
 * Proxy inverse — www.cnfrance.fr → cnfrance.netlify.app
 *
 * Le site est construit et hébergé par Netlify. Ce serveur-ci n'en sert aucune
 * copie : il se contente de relayer chaque requête vers Netlify et de renvoyer
 * la réponse telle quelle. Les visiteurs gardent donc www.cnfrance.fr dans leur
 * barre d'adresse.
 *
 * Pourquoi ce montage plutôt qu'un dépôt des fichiers sur le serveur : le quota
 * disque de l'hébergement est de 1,5 Go, déjà occupé à ~86 % par l'ancien site
 * Joomla que nous n'avons pas les droits de supprimer. Le site pèse 208 Mo et
 * ne tient pas dans les 205 Mo restants — l'y copier a saturé le disque et mis
 * la production hors service. Ici, l'empreinte se limite à ce fichier.
 *
 * Le routage est assuré par la configuration nginx de l'hébergeur, héritée de
 * Joomla, qui confie à index.php toute adresse ne correspondant à aucun fichier
 * sur le disque. Le `.htaccess` fourni à côté n'est qu'un filet de sécurité :
 * nginx ne le lit pas.
 *
 * Attention : les fichiers de l'ancien site encore présents sur le disque sont,
 * eux, servis directement par nginx et échappent donc à ce proxy — y compris
 * /administrator/index.php. Leur suppression ne peut venir que de l'hébergeur.
 */

declare(strict_types=1);

/** Domaine servant réellement le site. Seule ligne à changer en cas de bascule. */
$targetDomain = 'https://cnfrance.netlify.app';

/** Domaine public, tel que les visiteurs le voient. */
$publicDomain = 'https://www.cnfrance.fr';

/** Au-delà, on abandonne : mieux vaut une erreur franche qu'une page qui pend. */
const CONNECT_TIMEOUT = 5;
const TOTAL_TIMEOUT   = 25;

// ---------------------------------------------------------------- requête ----

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path  = parse_url($requestUri, PHP_URL_PATH) ?: '/';
$query = parse_url($requestUri, PHP_URL_QUERY) ?: '';

// Le chemin part toujours de la racine et ne peut pas remonter : sans cela, une
// requête bien tournée transformerait ce script en proxy ouvert vers n'importe
// quel hôte.
$path = '/' . ltrim($path, '/');
if (strpos($path, '..') !== false || strpos($path, '//') === 0) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Requête invalide.";
    exit;
}

// L'ancien site exposait sa page d'accueil et ses articles sous /index.php
// (souvent suivi d'une chaîne ?option=com_content&...). Le nouveau site n'a pas
// ces adresses : plutôt que de renvoyer une 404 aux liens et favoris existants,
// on les ramène sur l'accueil.
if ($path === '/index.php') {
    $path  = '/';
    $query = '';
}

$targetUrl = $targetDomain . $path . ($query !== '' ? '?' . $query : '');

// ------------------------------------------------------- en-têtes relayés ----

$forward = [];
$passThrough = [
    'HTTP_ACCEPT'            => 'Accept',
    'HTTP_ACCEPT_LANGUAGE'   => 'Accept-Language',
    'HTTP_USER_AGENT'        => 'User-Agent',
    'HTTP_REFERER'           => 'Referer',
    // Revalidation : permet à Netlify de répondre 304 et d'économiser le transfert.
    'HTTP_IF_NONE_MATCH'     => 'If-None-Match',
    'HTTP_IF_MODIFIED_SINCE' => 'If-Modified-Since',
    'HTTP_RANGE'             => 'Range',
];
foreach ($passThrough as $serverKey => $headerName) {
    if (!empty($_SERVER[$serverKey])) {
        $forward[] = $headerName . ': ' . $_SERVER[$serverKey];
    }
}
// Sans cela, Netlify ne voit que l'IP du serveur mutualisé.
$clientIp = $_SERVER['REMOTE_ADDR'] ?? '';
if ($clientIp !== '') {
    $forward[] = 'X-Forwarded-For: ' . $clientIp;
}
$forward[] = 'X-Forwarded-Host: ' . ($_SERVER['HTTP_HOST'] ?? 'www.cnfrance.fr');
$forward[] = 'X-Forwarded-Proto: https';

// ------------------------------------------------------------- transfert ----

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$ch = curl_init($targetUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER         => true,
    // On relaie la redirection au navigateur plutôt que de la suivre nous-mêmes :
    // c'est lui qui doit connaître l'URL finale.
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => CONNECT_TIMEOUT,
    CURLOPT_TIMEOUT        => TOTAL_TIMEOUT,
    CURLOPT_HTTPHEADER     => $forward,
    // Chaîne vide = accepte toutes les compressions et décompresse pour nous.
    CURLOPT_ENCODING       => '',
    CURLOPT_NOBODY         => ($method === 'HEAD'),
    CURLOPT_CUSTOMREQUEST  => ($method === 'HEAD' ? null : $method),
]);

$response = curl_exec($ch);

if ($response === false) {
    // Netlify injoignable : on le dit franchement plutôt que de servir une page
    // blanche, et on demande aux robots de ne pas retenir cette réponse.
    http_response_code(502);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    header('Retry-After: 60');
    curl_close($ch);
    echo '<!doctype html><html lang="fr"><meta charset="utf-8">'
       . '<title>Site momentanément indisponible</title>'
       . '<p>Le site du Cercle Nautique de France est momentanément indisponible. '
       . 'Merci de réessayer dans quelques instants.</p>';
    exit;
}

$status     = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$rawHeaders = substr($response, 0, $headerSize);
$body       = substr($response, $headerSize);

// --------------------------------------------------------------- réponse ----

http_response_code($status);

// On ne recopie que les en-têtes utiles. Tout ce qui décrit le transport
// (Content-Length, Transfer-Encoding, Content-Encoding) est volontairement omis :
// cURL a déjà décompressé le corps, ces valeurs ne correspondraient plus.
$allowed = [
    'content-type', 'cache-control', 'etag', 'last-modified',
    'expires', 'vary', 'content-disposition', 'accept-ranges',
    'content-range', 'location',
];

foreach (explode("\r\n", $rawHeaders) as $line) {
    $colon = strpos($line, ':');
    if ($colon === false) {
        continue;
    }
    $name  = strtolower(trim(substr($line, 0, $colon)));
    $value = trim(substr($line, $colon + 1));

    if (!in_array($name, $allowed, true)) {
        continue;
    }
    // Une redirection vers Netlify doit ramener le visiteur sur notre domaine.
    if ($name === 'location') {
        $value = str_replace($targetDomain, $publicDomain, $value);
    }
    header(ucwords($name, '-') . ': ' . $value, true);
}

// Dans le HTML, le CSS et les données, toute référence écrite en dur vers
// Netlify est ramenée sur le domaine public, pour que rien ne laisse fuiter
// l'hébergement réel ni ne fasse sortir le visiteur du domaine.
$contentType = '';
foreach (headers_list() as $h) {
    if (stripos($h, 'Content-Type:') === 0) {
        $contentType = strtolower($h);
        break;
    }
}
$isTextual = $contentType === ''
    || strpos($contentType, 'text/') !== false
    || strpos($contentType, 'json') !== false
    || strpos($contentType, 'xml') !== false
    || strpos($contentType, 'javascript') !== false;

if ($isTextual && $body !== '') {
    $body = str_replace($targetDomain, $publicDomain, $body);
}

// Netlify insère dans chaque page un commentaire et une balise <meta> qui font
// la promotion de son offre. Rien à y faire côté build : on les retire ici pour
// que les pages du club restent les siennes.
if ($body !== '' && strpos($contentType, 'html') !== false) {
    $body = preg_replace('#<meta\s+name="netlify-deploy"[^>]*>#i', '', $body) ?? $body;
    $body = preg_replace('#<!--(?:(?!-->).)*?netlify\.new(?:(?!-->).)*?-->#is', '', $body) ?? $body;
}

echo $body;
