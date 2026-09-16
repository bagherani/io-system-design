# Product: 03-replicaset simplification

## Problem

Students need a small, reliable lesson that makes replication and consistency choices visible without unrelated failure-management complexity.

## Success metric

All 7 classroom checks complete from the provided request collection after one start command: 3 write modes, 3 read modes, and 1 member-by-member consistency comparison.

## Announcement — the blog post before the feature

The replica-set lesson now focuses on one primary and two replicas. Students can compare three write acknowledgement choices, three read choices, and inspect each member directly to see whether the same data arrived everywhere. One command starts the lesson, the request collection walks through it, and one cleanup command resets it.

## Screens

No UI. The lesson uses HTTP requests and JSON responses.
