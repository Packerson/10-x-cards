Jesteś specjalistą GitHub Actions i Cloudflare.

1) Zapoznaj się z projektem:

- Tech Stack @tech-stack.md
- Aktualna konfiguracja projektu @astro.config.mjs
- Zależności i skrypty @package.json
- Dostępne zmienne środowiskowe @.env.example

2) Dostosuj projekt aby wspierać deployment na Cloudflare

3) Utwórz scenariusz CI/CD "master.yml" gdzie przeprowadzimy wdrożenie na istniejący projekt Cloudflare Pages. Bazuj na @pull-request.yml ale w nowym scenariuszu nie testuj E2E.

4) Na koniec popraw scenariusz z wykorzystaniem @github-action.mdc