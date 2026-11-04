// Wortfilter (Deutsch, Schweizerdeutsch, Englisch). «*» am Ende = gilt auch als Wortanfang (z. B. fick* → ficken).
// Bewusst ohne harmlose Wörter mit ähnlichem Anfang (z. B. «sau» nur exakt, damit «sauber» erlaubt bleibt).
export const BAD_WORDS = [
  // Deutsch
  'arsch*', 'arschloch*', 'wichs*', 'wix*', 'fick*', 'gefickt', 'fotze*', 'hurensohn*', 'hure', 'huren', 'schlampe*', 'nutte*',
  'missgeburt*', 'spast*', 'spasti*', 'mongo', 'behinderte', 'schwuchtel*', 'kanake*', 'neger*', 'scheiss*', 'scheisse', 'kacke',
  'pisser*', 'drecksau', 'sau', 'dreckssau', 'vollpfosten', 'penner', 'bastard*', 'titte*', 'porno*', 'sex', 'sexy', 'penis*',
  'vagina*', 'nazi*', 'hitler*', 'heil hitler', 'sieg heil', 'idiot', 'idioten', 'vollidiot*', 'trottel*', 'opfer', 'loser', 'fresse',
  'halt die fresse', 'verpiss*', 'arschgeige*', 'dummkopf', 'missgeburt',
  // Schweizerdeutsch
  'huere', 'huerä', 'huerensohn*', 'siech', 'sieche', 'schafseckel*', 'seckel*', 'gopfertami*', 'gopferdammi*', 'tubel', 'dubel', 'tubbel',
  'chotzbrocke*', 'figg*', 'gfigget', 'schiss*', 'sauhund*', 'lappi', 'tschumpel', 'sauchaib*', 'chaib', 'hueresohn*',
  // Englisch
  'fuck*', 'fucking', 'motherfuck*', 'shit*', 'bitch*', 'asshole*', 'dick', 'dickhead*', 'cock*', 'pussy*', 'cunt*', 'whore*',
  'slut*', 'nigger*', 'nigga*', 'fag', 'faggot*', 'retard*', 'wanker*', 'twat*', 'porn*', 'dumbass*', 'jackass*',
];
