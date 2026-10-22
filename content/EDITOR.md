# Edit articles in your browser

1. Open https://app.pagescms.org and sign in with GitHub.
2. Install/authorize the Pages CMS GitHub app for **only** `nicobecodin.github.io`.
3. Select `NicoBeCodin/nicobecodin.github.io`, then the `main` branch.
4. Open **Making sense of HotStuff**, **Optimization tricks for a DEX validator**, or **How a Solana ZK mixer works: building LeafPay** in the sidebar.
5. Edit the formatted Article field and save.

The editor is separate from the public website. Repository write permissions and
GitHub authentication control editing access. No credentials or public editing
endpoints are added to the website. The field restrictions are conveniences,
not security boundaries for someone who already has repository write access.

## Saving and publishing

Saving on `main` commits to GitHub and starts the existing Pages build. When that
deployment succeeds, the changes appear on the [Writing page](https://nicobecodin.github.io/writing/).

For unpublished edits, create/select an editorial branch in GitHub/Pages CMS
instead. Only pushes to `main` trigger this site's automatic publication.

After browser edits, fetch the remote changes before the coding agent edits the
same article. The local checkout contains unrelated unpublished work; do not
reset it or blindly pull over local modifications. Inspect the diff and merge
the article changes while preserving the rest of the worktree.

## Figures

Leave each standalone **Figure:** link in the article body. They become the
animations or diagrams on the site. Article 3 has two, article 4 has three,
and LeafPay has three.
They are standard Markdown links so the rich-text editor need not preserve
custom HTML comments or figure markup. The CMS displays placeholders rather
than live animations; see the published article for those.

The build checks their presence before deployment. Accidentally removing a link
will fail the new build rather than publish an article missing its illustration.
Restore the link in the editor and save again. A failed build does not undo the
GitHub commit; the previously deployed website stays live.

The two earlier Light DEX articles are not in the CMS yet.

Run `node --experimental-strip-types --test scripts/article-figures.test.mjs`
and `npm run build` after changing the renderer or editor configuration.
