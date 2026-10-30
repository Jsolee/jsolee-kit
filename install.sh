#!/usr/bin/env bash
# Installs jsolee-kit plus the core skills it points to, globally for Claude Code.
# Comment out any line you don't want.
set -euo pipefail

add() { npx -y skills@latest add "$@" -g -a claude-code -y; }

# The kit itself (workflow, house rules, inspiration sites)
add Jsolee/jsolee-kit --skill jsolee-kit

# Design and UI
add pbakaus/impeccable --skill impeccable
add Leonxlnx/taste-skill --skill design-taste-frontend
add emilkowalski/skills --skill emil-design-eng
add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max --skill brand --skill design --skill banner-design
add vercel-labs/agent-skills --skill web-design-guidelines --skill vercel-react-best-practices
add zarazhangrui/frontend-slides --skill frontend-slides

# Email
add resend/resend-skills --skill react-email --skill email-best-practices --skill resend

# Motion and video
add greensock/gsap-skills --skill '*'
add heygen-com/hyperframes --skill hyperframes --skill hyperframes-cli

# Stack, a11y and motion patterns from ECC
add affaan-m/ECC \
  --skill make-interfaces-feel-better --skill frontend-a11y \
  --skill motion-foundations --skill motion-patterns \
  --skill react-patterns --skill react-performance --skill prisma-patterns \
  --skill react-native-patterns --skill error-handling --skill conventional-commit-review --skill ios-icon-gen

# Workflow
add obra/superpowers --skill brainstorming --skill systematic-debugging --skill verification-before-completion

echo "Done. Restart Claude Code to load the new skills."
