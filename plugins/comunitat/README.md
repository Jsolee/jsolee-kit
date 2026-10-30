# comunitat

A Claude Code mod that shows the subagents at work in a panel, and what each one is doing right now.

- **Opens by itself** when the first subagent starts, and closes 10 seconds after the last one ends. If you open it yourself with `/comunitat`, it stays open.
- **Each agent is the Claude crab**, dressed for the tool it is using at that moment:

| Activity | Tools | Costume |
|---|---|---|
| reading | `Read` | detective with a magnifying glass |
| searching | `Grep`, `Glob` | pirate with a sabre |
| writing | `Edit`, `Write` | pencil in the claw |
| terminal | `Bash` | engineer with a wrench |
| on the web | `WebSearch`, `WebFetch`, browser | astronaut |
| delegating | `Agent`, `SendMessage` | pilot with a flag |
| tool | MCP, skills… | chef |
| thinking | no tool | thought bubble |
| waiting | — | hourglass |

- **Next to each crab**: the task, the file, command, search or URL it is working on, the agent type, the model, how long it has been running and how many tools it has used.
- Finished agents move to a collapsible list with ✓, ✗ or ■ for done, failed or stopped. **Clear** removes them.
- The desktop app shows the animated crabs. The terminal and VS Code get a text version.
- Animations stop when the system asks for reduced motion.

## Project map: `/projecte`

By default it reads the repository of the folder the session started in. `/projecte <path>` (for example `/projecte ~/code/app`) switches to another one.

A second panel with the state of the repository, in two views: **Now** and **History**.

**Now** starts with what needs doing, each item linked to GitHub:

| Notice | When it shows |
|---|---|
| Ready to merge | approved PRs with green CI |
| CI failing | PRs with red CI |
| Changes requested | PRs the author has to fix |
| Needs review | open PRs, with how long they have been waiting |
| Release pending | the base branch has commits that haven't been promoted |
| Behind | branches more than 20 commits behind the base |
| To delete | branches that are already merged |

**History** lays the whole life of the project over the base branch. Each branch is an arc, in the color of whoever made it, from its first commit to its merge. Open branches reach "today", with the crabs of the agents working on them. Below are the releases to `stable` and `prod`, the days and the legend. Each day takes more or less room depending on how much happened, so busy days don't get crammed. Under the drawing are the latest merges, linked to their PRs.

**Now** also shows:

- **The long-lived branches** (`prod`, `stable`, `snapshot`, or `main` and `develop`), with the commits still waiting to move from one to the next.
- **The team**: who has work of their own on a branch in the last two weeks, or merged work into the base this week. Each person gets their own color. Someone with several git identities (`anna.puig` and `Anna Puig Serra`, or a login like `lsoler` and `Laia Soler`) counts as one person.
- **Each branch**:
  - its ticket (`TG-83`) and who works on it;
  - commits ahead of and behind the base;
  - the last commit;
  - the PR, with its state and CI;
  - whether it is stale, or already merged and safe to delete.
- **The agents on their branch**, each crab dressed for what it is doing. An agent is placed on a branch in this order:
  1. the worktree it works in;
  2. the ticket or PR its description mentions (`TG-83`, `#35`);
  3. otherwise, the session's branch.

It reads the repository again every 2 minutes while open, and every 10 minutes it also asks GitHub (`git fetch`). **Refresh** does it right away. PRs need [`gh`](https://cli.github.com) installed and signed in; without `gh` the panel still shows the branches.

## Install

```
/plugin install comunitat --marketplace Jsolee/jsolee-kit
```

Answer `y` to add the marketplace and choose where to install it (for you, or only for this project).

In the Claude desktop app, click **+** next to the message box, then **Plugins** → **Add marketplace** with `Jsolee/jsolee-kit` → **Add plugin**.

## Development

```
claude plugin validate .
claude plugin test .
```

## Credits

The pixel crab and the detective, pirate, engineer, astronaut, pilot and chef costumes come from johnnyvizz's [savvy-progress](https://github.com/JohnnyVizz/claude-kit) mod, MIT licensed. The license notice is in `hooks/crab.ts`.
