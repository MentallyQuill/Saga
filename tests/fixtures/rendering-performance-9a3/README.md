# Frozen rendering analysis-method fixtures

These are the exact six canonical Git-byte measurement protocol files and the
unchanged performance fixture used by the sealed Task9 analysis method. They
contain no measured results, private paths, screenshots or machine inventory.

Protocol SHA-256:
`9a3dd0668f9be5b9403977ee2b2e65cf2a614ecf12d2737f15812e61bc94a6a3`

Fixture SHA-256:
`acc70381c0758438d0f1f3b59153fc3be876d82b8b764a11e15c78de6e4e6216`

`frozen-protocol.json` records the ordered six-file inventory and individual
hashes. Protocol aggregation concatenates each UTF-8 repository-relative path
and its raw file bytes, in that recorded order, before SHA-256. The fixture is
hashed separately. The narrow `.gitattributes` rule preserves the six protocol
files' LF bytes on all checkout platforms. The exact historical fixture has
62 CRLF lines; a precise `-text` exception preserves those sealed acc70381 bytes
without Git normalization. Do not convert that fixture to LF.

The complete synthetic evaluator tests use these portable files as inert input
bytes. They do not execute the frozen collector or start its harness. An
explicit `SAGA_ACCEPTANCE_PROTOCOL_ROOT` override may select another exact copy;
the acceptance evaluator still enforces the same fixed hashes. Keep the files
immutable. Future live collector snapshots include all their current imported
measurement dependencies and have their own new protocol hash; they do not
relabel these sealed9a3 fixtures or existing matrices.
