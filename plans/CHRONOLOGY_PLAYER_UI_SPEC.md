# Chronology Player UI Spec

## Goal
Rework chronology answering into a two-column layout that separates draggable source items from timeline placeholders.

## Scope
- File: `apps/client/src/components/player/ChronologyPlayer.tsx`
- New board-state helper module for deterministic move transitions.
- i18n additions/updates in `apps/client/src/locales/en.json` and `apps/client/src/locales/bg.json`.
- Unit tests for board state transitions and chronology label helpers.

## UX Changes
- Left column: all chronology items as draggable cards.
- Right column: numbered timeline placeholders (drop targets).
- Drag from left bank to right placeholders to build answer order.
- Support swapping when dropping onto an occupied placeholder.
- Support returning cards from placeholder back to item bank.
- Maintain touch-friendly controls (>=48px) and clear active drop highlighting.

## Data and Behavior
- Board state modeled as:
  - `poolIds: string[]`
  - `slotIds: (string | null)[]`
- On drag end, apply a pure transition function for moves.
- Emit `onChange(string[])` after each move using:
  - placed ids in slot order, then remaining pool ids
  - this preserves a complete deterministic ordering even when placeholders are incomplete.
- Handle labels remain stable for a question instance and are derived from initial payload order.

## Test Plan
- Unit tests for pure chronology board transitions:
  - initialize board state
  - move pool -> empty slot
  - move pool -> occupied slot (swap displaced back to pool)
  - move slot -> empty slot
  - move slot -> occupied slot (swap)
  - move slot -> pool
  - no-op on invalid destination/id
- Keep existing chronology label tests.
- Run client tests.
