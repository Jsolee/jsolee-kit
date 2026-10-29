# comunitat

Un mod de Claude Code que mostra en un panell els subagents que treballen, i el que fa cadascun en aquell moment.

- **S'obre sol** quan arrenca el primer subagent, i es tanca 10 segons després que acabi l'últim. Si l'obres tu amb `/comunitat`, no es tanca sol.
- **Cada agent és el cranc de Claude**, vestit segons l'eina que fa servir en aquell moment:

| Activitat | Eines | Disfressa |
|---|---|---|
| llegint | `Read` | detectiu amb lupa |
| cercant | `Grep`, `Glob` | pirata amb sabre |
| escrivint | `Edit`, `Write` | llapis a la pinça |
| terminal | `Bash` | enginyer amb clau anglesa |
| a la web | `WebSearch`, `WebFetch`, navegador | astronauta |
| delegant | `Agent`, `SendMessage` | pilot amb bandera |
| una altra eina | MCP, skills… | xef |
| pensant | cap eina | bombolla |
| esperant | — | rellotge de sorra |

- **Al costat de cada cranc** hi ha la tasca, el fitxer, l'ordre, la cerca o la URL que fa servir, el tipus d'agent, el model, el temps que porta i quantes eines ha fet servir.
- Els agents acabats es queden en una llista plegable amb ✓, ✗ o ■, segons si han acabat bé, han fallat o s'han aturat. El botó «Neteja» els esborra.
- A l'app d'escriptori es veuen els crancs animats. A la terminal i a VS Code, una versió en text.
- Les animacions s'aturen si el sistema demana reduir el moviment.

## Mapa del projecte: `/projecte`

Per defecte llegeix el repositori de la carpeta on ha començat la sessió. Amb `/projecte <ruta>` (per exemple, `/projecte ~/codi/app`) canvia a un altre repositori.

Un segon panell amb l'estat del repositori i dues vistes: **Ara** i **Història**.

**Ara** comença pel que cal fer, cada cosa amb el seu enllaç a GitHub:

| Avís | Quan surt |
|---|---|
| Per fusionar | PR aprovades amb la CI en verd |
| La CI falla | PR amb la CI en vermell |
| Canvis demanats | PR que l'autor ha de corregir |
| Per revisar | PR obertes, amb el temps que porten esperant |
| Release pendent | la branca base té commits que no han baixat |
| Desfasada | branques a més de 20 commits per darrere de la base |
| Per esborrar | branques que ja estan fusionades |

**Història** posa tota la vida del projecte sobre la branca base. Cada branca és un arc, del color de qui l'ha feta, que va del seu primer commit fins al moment de la fusió. Les branques obertes arriben fins a «avui», amb els crancs dels agents que hi treballen. A sota hi ha les releases a `stable` i `prod`, els dies i la llegenda. Cada dia ocupa més o menys espai segons l'activitat que hi ha hagut, perquè els dies amb més feina no quedin apinyats. Sota el dibuix hi ha les últimes fusions, amb l'enllaç a cada PR.

La vista **Ara** també mostra:

- **Les branques permanents** (`prod`, `stable`, `snapshot`, o `main` i `develop`), amb els commits que encara han de passar d'una a l'altra.
- **L'equip**: qui té feina pròpia en una branca aquestes dues setmanes, o ha fusionat feina a la branca base aquesta setmana. Cada persona té un color propi. Si algú té diverses identitats a git (`anna.puig` i `Anna Puig Serra`, o un login com `lsoler` i `Laia Soler`), compta com una sola persona.
- **Cada branca**:
  - la tasca de Taiga (`TG-83`) i qui hi treballa;
  - els commits per davant i per darrere de la base;
  - l'últim commit;
  - la PR, amb el seu estat i la CI;
  - si està aturada, o si ja està fusionada i es pot esborrar.
- **Els agents a la seva branca**, amb el cranc vestit segons el que fan. A cada agent li toca branca per aquest ordre:
  1. el worktree on treballa;
  2. la tasca o la PR que diu la seva descripció (`TG-83`, `#35`);
  3. si no, la branca on és la sessió.

Es torna a llegir cada 2 minuts mentre està obert, i cada 10 minuts també consulta GitHub (`git fetch`). El botó «Actualitza» ho fa a l'instant. Les PR necessiten tenir [`gh`](https://cli.github.com) instal·lat i amb la sessió iniciada; sense `gh`, el panell mostra igualment les branques.

## Instal·lació

```
/plugin install comunitat --marketplace Jsolee/jsolee-kit
```

Respon `y` per afegir el marketplace i tria on l'instal·les (per a tu, o només per a aquest projecte).

A l'app d'escriptori de Claude, fes clic al **+** del costat del quadre del missatge, i després a **Plugins** → **Add marketplace**, amb `Jsolee/jsolee-kit`, → **Add plugin**.

## Desenvolupament

```
claude plugin validate .
claude plugin test .
```

## Crèdits

El cranc de píxels i les disfresses del detectiu, el pirata, l'enginyer, l'astronauta, el pilot i el xef són del mod [savvy-progress](https://github.com/JohnnyVizz/claude-kit) de johnnyvizz, amb llicència MIT. L'avís de llicència és a `hooks/crab.ts`.
