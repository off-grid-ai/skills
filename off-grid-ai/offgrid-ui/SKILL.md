---
name: offgrid-ui
description: Select, design, implement, or review UI for Off Grid products using the canonical sibling brand guidance and `wednesday-solutions/component-library-animations`. Use for any UI/UX, IA, layout, navigation, interaction, loading, empty/error state, visual styling, or frontend component change. Enforce reuse or extension of a library primitive instead of inventing a standalone local component.
---

# Off Grid UI

Build each UI change from the shared visual system. Treat brand guidance and the component library
as source code dependencies, not inspiration.

## Resolve the sources

1. Resolve the product repository root and read its `AGENTS.md` completely.
2. Resolve the sibling `brand` repository. Read `DESIGN_PHILOSOPHY.md` completely for every UI
   task. Read `README.md` and `brand_tone_voice.md` when changing visible copy; read the other copy
   guides only when the task needs them.
3. Resolve the checkout whose `origin` is
   `https://github.com/wednesday-solutions/component-library-animations.git`. Prefer the current
   sibling checkout; otherwise use `~/code/component-library-animations`. Fetch
   `origin` before selection when network access is allowed, and record the inspected commit.
4. Run `node scripts/inventory-ui-sources.mjs --product <repo-root> --summary` from this skill
   directory. Narrow with `--family <name>` or `--behavior <term>` before opening relevant source;
   use `--output <path>` only when a durable full inventory is needed.

Stop and report the missing source if either the brand canon or component library cannot be read.
Do not silently replace them with remembered conventions.

## Select before implementing

1. Name the user job, host surface, interaction state, data density, and the existing local owner.
2. Search the complete inventory by behavior, not only by the requested visual name. Inspect the
   source of every plausible primitive, including its dependency, keyboard, focus, ARIA, responsive,
   animation, and `prefers-reduced-motion` behavior.
3. Shortlist the best two to four candidates. Score them against:
   - functional fit and complete state coverage;
   - quiet, dense, brutalist/terminal composition;
   - Menlo typography, Off Grid tokens, and emerald-only accent;
   - accessibility and reduced motion;
   - Next.js/client-boundary and bundle cost;
   - maintainability and removal of the superseded local primitive.
4. Reject decorative landing-page effects for operator-console surfaces: gradients, 3D treatments,
   ornamental motion, heavy shadows, color-coded meaning, and empty spectacle conflict with the
   brand even when the library contains them.
5. Record the selected primitive and why it beats the alternatives before editing.

## Reuse or extend

- The current `component-library-animations` main branch may still be a Vite catalogue of hard-coded
  previews rather than a consumable package. Treat catalogue entries as concepts until their source
  exposes real props, tests, accessibility, reduced motion, correct dependencies, and a Next-safe
  package export. Never weaken an existing product implementation by importing a preview.
- Import the selected primitive through a stable package/export boundary. Do not paste or fork its
  source into the product repository.
- If the library is not consumable as a package, first add the required export/build boundary to the
  library, then consume it as a dependency.
- This restriction applies to reusable visual and interaction primitives. Product/domain components
  still own business data, routes, actions, and feature composition, but must compose their visual
  controls from the library.
- A product-specific wrapper is allowed only as a thin semantic adapter over a named library
  primitive. It may supply product data, tokens, labels, or composition; it must not recreate the
  primitive's visuals or interaction state.
- If no primitive can be adapted, add the reusable primitive to the component library first, with
  its tests and catalogue entry, then consume it. A standalone custom product component is not an
  acceptable fallback.
- Use `@offgrid/design` tokens. Do not hardcode brand colors, spacing, typography, or motion values.
- Finish the migration: replace usages, remove the superseded local implementation, and remove dead
  styles/exports. One visual behavior has one owner.

## Verify the whole state space

Apply the repository's hygiene and test standards. At minimum verify:

- unit behavior for the shared primitive or adapter;
- real integration/navigation behavior in the host product;
- keyboard order, focus visibility, ARIA semantics, contrast, and reduced motion;
- loading, empty, error, populated, disabled, hover/focus, and destructive states that apply;
- light and dark themes at narrow and wide target viewports;
- no clipping, horizontal page overflow, duplicate controls, or wasted desktop real estate;
- typecheck, tests, coverage, production build, dependency and duplication gates;
- rendered screenshots after fonts, data, and animation settle.

End with evidence: brand constraints applied, library commit, candidates considered, selected
primitive, extension seam if any, local component removed, gates run, and live verification state.
