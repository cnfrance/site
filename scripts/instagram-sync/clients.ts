// Seuls appels réseau de la synchro. Tout le reste reçoit un objet Clients,
// remplacé par des doublures dans les tests.
import type { MessageIA } from "./ia.ts";
import type { PublicationInstagram } from "./selection.ts";

export interface Clients {
  rafraichirJeton(jeton: string): Promise<{ jeton: string; expireDansSecondes: number }>;
  listerPublications(jeton: string, depuis: string): Promise<PublicationInstagram[]>;
  demanderIA(messages: MessageIA[], modele: string): Promise<string>;
  telecharger(url: string): Promise<{ octets: Uint8Array; extension: string }>;
}
