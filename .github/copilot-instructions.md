# Copilot Instructions for Kiwifan1.github.io

- **Project Type**: Angular 20 standalone app; `bootstrapApplication` in `src/main.ts` wires `App` with providers from `app.config.ts` (router + zone change detection + global error listeners).
- **Build Targets**: `npm start` for local dev (`ng serve`), `npm run build` for production output in `dist/browser`. `npm run deploy` mirrors the GitHub Actions flow by copying `index.html` to `404.html` and adding `.nojekyll`.
- **Node Version**: Use Node 20 (see GitHub Action and Angular 20 requirements) to avoid incompatibilities with Angular CLI.
- **Routing**: All routes declared in `src/app/app.routes.ts`. Add new pages by creating a standalone component (TS/HTML/CSS trio) and registering it in this array; include a catch-all redirect to home.
- **Layout Shell**: `src/app/app.html` hosts `<app-navbar>` and `<router-outlet>`. `App` component only stores the site title.
- **Navigation**: `Navbar` component (`src/app/navbar/*`) uses `RouterLink` and toggles a `filled` class on scroll. Any new menu item must update both `navbar.html` and `app.routes.ts`.
- **Assets**: Static files come from two roots. `public/` is copied verbatim to the output root; `res/` is mounted under `/res` via the custom asset entry in `angular.json`. E.g. `Resume` embeds `/res/files/resume.pdf`, and the navbar logo loads `/res/images/kiwi-running.png`.
- **Styling Conventions**: Global theming lives in `src/styles.css` with CSS custom properties (`--kiwi-*`). Each component links a single `styleUrl` (note singular) matching its folder. Prefer using the shared variables instead of hard-coded colors.
- **Page Structure**: Content components follow the same pattern—`@Component` with empty `imports`, simple HTML templates, and no business logic. Keep new pages declarative and static unless there is a specific need for services.
- **Tools Section**: `tools` route hosts sub-pages like `tools/minecraft` without nested router outlets; each sub-page is another standalone component referenced directly in `app.routes.ts`.
- **Testing**: Karma/Jasmine setup is stock; specs live beside components (`*.spec.ts`). No bespoke helpers exist yet, so scaffold with `ng generate component ... --standalone` for consistency if adding tests.
- **Formatting**: Use the repo-level Prettier config (`package.json`)—notably Angular template parsing and `singleQuote: true`. Run `npx prettier --write .` before committing sizable changes.
- **Deployment**: Automated via `.github/workflows/deploy.yml` when pushing to `main`. The workflow expects the browser build in `dist/browser`; breaking that path will fail Pages deploys.
- **Error Handling**: Global listeners are provided; individual components rarely handle errors. Stick to static content or redirect logic; surface global errors only if absolutely necessary.
- **Adding Assets**: Place new downloads in `res/files`, images under `res/images`, and remember they publish under `/res/...` URLs. Do not import large binaries into component bundles.
- **External Links**: Follow the existing pattern of `target="_blank" rel="noopener"` in templates for outbound anchors.
