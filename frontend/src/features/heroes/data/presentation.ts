import { HEROES } from "./generated/heroes";

/** Static names/artwork only; unknown IDs must never impersonate another hero. */
export function heroPresentation(id: string) {
  const hero = HEROES.find((h) => String(h.id) === id);
  return hero
    ? { name: hero.name, key: hero.key }
    : { name: `Hero ${id}`, key: "unknown" };
}
