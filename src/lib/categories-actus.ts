// Univers éditoriaux d'une actualité.
//
// Volontairement à trois valeurs : « compétition » et « loisir » seuls
// créeraient une frontière artificielle où la vie associative (assemblée
// générale, forums, hommages) n'aurait pas sa place. Le champ reste optionnel
// dans le schéma — une actu non classée s'affiche dans la liste, sans badge.
//
// Ce module est volontairement dépourvu de dépendance à `astro:content` : il
// est importé aussi bien par le schéma de contenu que par les composants
// d'affichage et par les tests.

export const CATEGORIES_ACTU = ["competition", "loisir", "club"] as const;

export type CategorieActu = (typeof CATEGORIES_ACTU)[number];

export const LIBELLES_CATEGORIE_ACTU: Record<CategorieActu, string> = {
  competition: "Compétition",
  loisir: "Loisir & randonnées",
  club: "Vie du club",
};
