import type { SystemPackage } from "../domain/systemPackage";
import { findModule } from "../domain/systemPackage";
import { FreeTextModule } from "./FreeTextModule";

interface SheetRendererProps {
  systemPackage: SystemPackage;
}

export function SheetRenderer({ systemPackage }: SheetRendererProps) {
  return (
    <main className="sheet-tool" aria-label="Sheet Tool">
      {systemPackage.pages.map((page) => (
        <article className="sheet-page" key={page.ID}>
          <header className="page-header">
            <div>
              <p className="eyebrow">{systemPackage.manifest.名称}</p>
              <h1>{page.名称}</h1>
            </div>
          </header>

          {page.sections.map((section) => (
            <section className="sheet-section" key={section.ID} aria-labelledby={`section-${section.ID}`}>
              <h2 id={`section-${section.ID}`}>{section.名称}</h2>
              <div className="module-grid">
                {section.modules.map((moduleId) => {
                  const module = findModule(systemPackage, moduleId);
                  if (!module) {
                    return null;
                  }
                  return <FreeTextModule key={module.ID} module={module} />;
                })}
              </div>
            </section>
          ))}
        </article>
      ))}
    </main>
  );
}
