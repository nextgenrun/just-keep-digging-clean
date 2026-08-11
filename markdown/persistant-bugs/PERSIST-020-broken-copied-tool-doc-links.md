# PERSIST-020: Copied MCP rule document contains broken local links

- Status: confirmed
- Severity: P3
- Category: broken documentation references / copied external content
- Evidence: `tools/video-audio-mcp/.cursor/rules/mcp-python.md:337` links to `src/mcp/server/auth/provider.py`, `:461-462` link to two `examples/servers/...` directories, and `:829` links to `CONTRIBUTING.md`. Resolved relative to `.cursor/rules/`, all four targets are missing; the tool repository instead has its own root `CONTRIBUTING.md` and no matching `src` or `examples` paths at the documented relative locations.
- Failure: opening the copied rule’s local links produces dead paths, and the file looks like a local SDK source guide when it is actually an upstream reference copy.
- Permanent solution: either replace the links with the tool repository’s correct relative paths, convert them to pinned upstream URLs, or move the document into an explicitly external-reference area. Add the Markdown-link gate to tool documentation.
- Verification contract: every local Markdown link resolves from its owning file, while external reference documents use explicit external URLs and provenance.
