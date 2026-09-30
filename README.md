# nicobecodin — website

Personal CV, project portfolio and engineering blog. Built as static pages so it can be hosted on GitHub Pages.

## Local development

Use Node 22 or newer.

```bash
npm ci
npm run dev
```

Open the local URL printed by the development server. `npm run build` creates a static export in `dist/client`.

## Add an article

1. Create `content/posts/your-slug.md` with the same frontmatter fields as the existing post.
2. Import the Markdown file in `lib/posts.ts` and add its slug to `sources`.
3. Run `npm run build`. The writing index and article route are generated from that registry.

The article page generates its title, description and publication date from Markdown frontmatter. The post parser is intended for trusted, repository-owned Markdown.

The first article's diagram sources live in `content/diagrams/`; their rendered, dark-theme SVGs live in `public/diagrams/`. Regenerate the SVGs with the [PlantUML command-line tool](https://plantuml.com/command-line) after editing a `.puml` source. The tmux wallpapers are copied into `public/downloads/` so the download page remains fully static. Files in `content/drafts/` are ignored by Git and are not included in the published site.

## Publish later on GitHub Pages

Create a repository named `NicoBeCodin.github.io` under the `NicoBeCodin` account, push this folder to its `main` branch, then enable **Settings → Pages → Build and deployment → GitHub Actions**. The included workflow builds and deploys the static site on pushes to `main` or a manual workflow run. The default public URL is `https://nicobecodin.github.io/`; do not use a project repository name unless you also update the routing configuration to handle its path prefix. The build output is `dist/client`, but the workflow uploads it automatically, so do not commit that generated folder.

The build produces `robots.txt`, a sitemap covering every exported page, and canonical page URLs. Once the site is public, Google must discover it before it can appear in results; submitting the sitemap in Search Console can help.

Before publishing, review the public contact address, project descriptions and articles. The site intentionally omits a legal name, private email address, precise location, employer and university names; public GitHub links and project details may still identify their author.
