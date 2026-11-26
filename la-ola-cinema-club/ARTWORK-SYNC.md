# Artwork synchronization

`data/artwork.json` is the image registry; `data/films.json` contains the review metadata and a generated compatibility copy of image paths. Edit the registry for artwork replacements, rather than editing page-specific image URLs.

Each film ID maps to `image`, `thumbnail`, `sha256`, `revision` and an approval status. Existing public images are retained as `previously-published`. To promote a new owner-approved export:

1. Put the approved full image and optional thumbnail inside this world's assets directory; preserve the prior edition for rollback.
2. Update the one film ID in the registry. Use `status: "approved"`, record its approval receipt, exact SHA-256 and a new content-based revision. A separate thumbnail needs `thumbnailSha256` when its bytes differ.
3. Run `python3 scripts/sync-cinema-artwork.py --site la-ola-cinema-club` in the public checkout, or the same script without `--site` in the private canonical checkout.
4. Review the generated film metadata, static review page and Home references. Runtime Reviews, Guide examples, Stats and shelves resolve from that same registry. The image URL carries the revision; data requests revalidate the registry and film metadata.
5. Run the Cinema tests and normal HQ release guard, compare fresh main, publish with the existing release workflow, then verify the actual public responses.

The synchronizer validates all records before writing. It rejects draft status, an unapproved path replacement, missing approval receipt, files outside this world's assets directory and checksum mismatches. It does not fetch Canva or guess approval from the latest modified image. Keep image pixels, written scores and edition labels consistent; an older retained image must be identified when the current rating has changed.

## Final Canva master and temporary drafts — owner requirement, November 26, 2026

The canonical final design is **La Ola Cinema 2026**, design ID `DAHAZmy7qts`. A saved temporary design is not completion. For every future review:

1. Finish the owner-approved card using the existing template and original icons/logos/stamps.
2. Transfer it into the final master in the appropriate collection position. If the owner already transferred it, verify it rather than insert a duplicate.
3. Reopen/read the saved master and verify the card, scores, placement and page identity. Record both page ID and current page number because page numbers can move. Preserve the protected baseline artwork.
4. Export the final master page at full resolution, promote that approved export through the registry, and verify the deployed result.
5. Tell the owner the card is in the final master and where it is.
6. Only after transfer, saved readback and export verification, move the exact completed temporary design to recoverable Canva Trash. Never empty Trash or remove canonical masters, reusable templates or unrelated work. Keep local approved exports and receipts for rollback.

Verified owner transfers: Bank page 98, Focker page 103 (`PBhL3zXW07WnCv2S`). Temporary two-page design `DAHb_wZ0Tu8` was moved to recoverable Trash after both master pages were verified and the corrected Focker export completed. Other historical drafts are outside this bounded cleanup.
