// Le site est statique : une fiche peut être passée depuis la dernière
// compilation (nocturne). On masque ce qui est dépassé, au jour près, à Paris.
const aujourdhui = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

document.querySelectorAll<HTMLElement>("[data-fin]").forEach((el) => {
  if ((el.dataset.fin ?? "") < aujourdhui) el.hidden = true;
});
document.querySelectorAll<HTMLElement>("[data-a-venir]").forEach((bloc) => {
  const restants = [...bloc.querySelectorAll<HTMLElement>("[data-fin]")].filter((el) => !el.hidden);
  if (restants.length > 0) return;
  bloc.hidden = true;
  const vide = bloc.parentElement?.querySelector<HTMLElement>("[data-a-venir-vide]");
  if (vide) vide.hidden = false;
});
