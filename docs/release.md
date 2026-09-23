# Release provenance

Pushing a version tag such as `v0.1.0` runs the complete repository check and
packages the CLI from that tag. GitHub publishes the package tarball, its
SHA-256 checksum, and a JSON record containing the full source commit. GitHub
attests all three files.

The tag must equal `v` plus the version in `package.json`. Verify the downloaded
tarball with its checksum before installing it, then compare `source_commit` in
the release record with the tag's commit.
