/** Approved art direction v5. UI labels never alter scores or saved answers. */
const raceFolders: Record<string,string> = { 'Человек':'human', 'Эльф':'elf', 'Орк':'orc', 'Тролль':'troll' };
export const adventureArt = (race: string, scene: string): string | undefined => {
  const folder = raceFolders[race];
  return folder ? `${import.meta.env.BASE_URL}design/heroes/${folder}/${scene}.webp` : undefined;
};
export const partyArt = import.meta.env.BASE_URL + 'design/general/group.webp';
export const pigeonArt = import.meta.env.BASE_URL + 'design/general/pigeon.webp';
