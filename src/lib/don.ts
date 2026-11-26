// Logique de la page « Faire un don » : calcul de la réduction d'impôt et
// lien vers le formulaire de don Monetico (hébergé par le Crédit Mutuel).

/** Page de don Monetico du club. `?amount=` pré-remplit le montant libre. */
export const URL_DON_MONETICO = "https://www.monetico-online-asso.com/cnfrance/don";

/** Réduction d'impôt sur le revenu pour un don à une association d'intérêt général. */
export const TAUX_REDUCTION = 0.66;

/** Montants proposés, identiques à ceux de la page Monetico. */
export const MONTANTS_DON = [30, 50, 100, 200, 500, 1000] as const;

/** Plafond accepté par Monetico pour le montant libre. */
export const MONTANT_MAX = 20_000_000;

export const reductionImpot = (montant: number) => Math.round(montant * TAUX_REDUCTION * 100) / 100;
export const coutReel = (montant: number) => Math.round((montant - reductionImpot(montant)) * 100) / 100;

/** « 1 000 € », « 25,50 € » : décimales seulement si nécessaires. */
export const formatEuros = (montant: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(montant) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(montant).replace(/ /g, " ");

/** Lit un montant saisi à la française (« 75 », « 75,50 », « 1 000 »). Renvoie null si invalide. */
export function lireMontant(saisie: string): number | null {
  const propre = saisie.replace(/[\s  €]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(propre)) return null;
  const montant = Number(propre);
  return montant > 0 && montant <= MONTANT_MAX ? montant : null;
}

export const urlMonetico = (montant: number) => `${URL_DON_MONETICO}?amount=${montant}`;
