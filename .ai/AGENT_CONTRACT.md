---
name: AGENT_CONTRACT.md
owner: human
created: 2026-11-02
updated: 2026-11-05
---

# loadcell-bench Agent Contract

Shared rules: F:\AionUi\agents\AGENT_CONTRACT.md (machine, backends, gates, file ownership, handoff format, tool requests, cloud spend, safety).
This file adds project rules only. Where they conflict, this file wins for loadcell-bench, except the shared Safety section, which no project rule relaxes.

## Project rules
1. Every gate in the shared contract needs the human's approval before work past it proceeds. The orchestrator records the answer; no agent sets a gate itself.
2. Cloud spend follows the shared contract and F:\AionUi\infra\SPEND.md. The pool is $60. Planner Spec, Coding Hard, and QA Review need a yes. Routine next-queue spawns do not. Ask again at $50. Stop paid assistants at $60.
3. The migration agent only copies and seeds the project. It does not resolve dependencies, install tools, or edit files after its handoff. Missing dependencies go to infrastructure as a tool request.
4. Research that a requirement depends on is saved in research/ and cited by path in the spec before implementation starts.
5. Firmware and pin-dependent software stay blocked by pinout until HARDWARE_REVIEW.md says Approval: APPROVE or Approval: APPROVE WITH CONDITIONS. Software with blocked_by: none waits until the Engineering and Hardware queue steps have finished or been skipped. Coding then takes one requirement id at a time. It does not start at spec approval beside the reviews.
6. A change that affects a connector, mounting point, keep-out, or the load-cell mechanical path needs both ENGINEERING_REVIEW.md and HARDWARE_REVIEW.md to cite the requirement id before it is marked done.
7. The validation track (QA) starts at state TESTING, which is only reachable after Spec gate: approved and the implementation tracks are complete.

## Project-specific notes
(Human: add calibration standards, sensor part numbers, or other loadcell-bench constraints here.)