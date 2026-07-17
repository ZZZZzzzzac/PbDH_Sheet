# System Package Skins own package-scoped presentation

Status: accepted

A System Package may bundle selectable Skins while the Base Framework keeps ownership of interaction, Character Data, validation, and the fixed A4 page box. Every Skin owns one package-wide scoped CSS file and may optionally override individual Shell/Page HTML Layout Templates; omitted overrides fall back to Base Layout Templates, and overrides must preserve the same module ownership within each Page or Shell. This costs additional Loader, Validator, Renderer, preference, and test paths, but avoids both global CSS pollution and a single shared DOM becoming the permanent limit on visual design.

Third-party Skin installation, bundled fonts, per-Page Skin selection, cross-Page module movement, and gameplay behavior changes are excluded. Framework-owned surfaces use a separate neutral Light/Dark Color Scheme so a System Package can express its identity without styling the App Shell.
