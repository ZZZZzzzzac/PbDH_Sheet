import { describe, expect, it, vi } from "vitest";
import { createEmptyCharacterData, exportCharacterData, updateCharacterValue } from "../domain/characterData";
import { minimalSystemPackage } from "../test/fixtures";
import printCss from "../styles/print.css?raw";
import { buildReadonlyHtmlSnapshot, extractEmbeddedCharacterJson, parseCharacterDataText, waitForVisibleImages } from "./output";

describe("HTML snapshot export/import", () => {
  it("exports a read-only HTML snapshot with inert embedded Character JSON", async () => {
    const data = updateCharacterValue(createEmptyCharacterData(minimalSystemPackage), "character-name", "阿青");
    const html = await buildReadonlyHtmlSnapshot(data);

    expect(html).toContain('aria-label="Read-only Character Snapshot"');
    expect(html).toContain('type="application/json"');
    expect(html).not.toContain("/src/main");
    expect(html).not.toContain("createRoot");

    const extracted = extractEmbeddedCharacterJson(html);
    expect(extracted.ok).toBe(true);
    if (extracted.ok) {
      expect(JSON.parse(extracted.text).character.values["character-name"]).toBe("阿青");
    }
  });

  it("can export the current printed Sheet Tool DOM instead of a data summary", async () => {
    const data = updateCharacterValue(createEmptyCharacterData(minimalSystemPackage), "character-name", "阿青");
    document.body.innerHTML = `
      <style>.sheet-page { color: rgb(1, 2, 3); }</style>
      <main class="sheet-tool" aria-label="Sheet Tool">
        <article class="sheet-page" data-template-page-id="main">
          <div class="module-slot" data-module-slot-id="character-name">
            <label>姓名 <input aria-label="姓名" value=""></label>
          </div>
          <button type="button">编辑按钮</button>
        </article>
      </main>`;
    const input = document.querySelector("input")!;
    input.value = "阿青";

    const html = await buildReadonlyHtmlSnapshot(data, document.querySelector(".sheet-tool")!);

    expect(html).toContain('class="sheet-tool"');
    expect(html).toContain('data-module-slot-id="character-name"');
    expect(html).toContain('value="阿青"');
    expect(html).toContain("break-inside: avoid");
    expect(html).not.toContain("编辑按钮");
  });

  it("embeds blob-backed Card artwork in the exported HTML snapshot", async () => {
    const data = createEmptyCharacterData(minimalSystemPackage);
    document.body.innerHTML = `
      <main class="sheet-tool">
        <article class="play-card">
          <img class="play-card-image" src="blob:card-art" alt="卡图">
        </article>
      </main>`;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), { headers: { "Content-Type": "image/png" } }),
    );

    const html = await buildReadonlyHtmlSnapshot(data, document.querySelector(".sheet-tool")!);

    expect(fetchMock).toHaveBeenCalledWith("blob:card-art");
    expect(html).toContain('src="data:image/png;base64,iVBORw=="');
    expect(html).not.toContain("blob:card-art");
  });

  it("exports rendered Markdown instead of a focused raw editor", async () => {
    const data = updateCharacterValue(createEmptyCharacterData(minimalSystemPackage), "character-name", "**勇者**");
    document.body.innerHTML = `
      <main class="sheet-tool">
        <div data-markdown-editor="true"><input value="**勇者**"></div>
        <div data-markdown-preview="true" hidden aria-hidden="true" role="button" tabindex="0"><p><strong>勇者</strong></p></div>
      </main>`;

    const html = await buildReadonlyHtmlSnapshot(data, document.querySelector(".sheet-tool")!);

    expect(html).toContain("<strong>勇者</strong>");
    expect(html).not.toContain("data-markdown-editor");
    expect(html).not.toContain("aria-hidden");
    expect(html).not.toContain('role="button"');
  });

  it("preserves empty Free Text and Long Text placeholders in HTML snapshots", async () => {
    const data = createEmptyCharacterData(minimalSystemPackage);
    document.body.innerHTML = `
      <main class="sheet-tool">
        <div data-module-type="freeText">
          <div data-markdown-editor="true" data-markdown-empty="true"><input placeholder="填写姓名" value=""></div>
          <div data-markdown-preview="true" data-markdown-empty="true" hidden></div>
        </div>
        <div data-module-type="longText">
          <div data-markdown-editor="true" data-markdown-empty="true"><textarea placeholder="填写背景"></textarea></div>
          <div data-markdown-preview="true" data-markdown-empty="true" hidden></div>
        </div>
      </main>`;

    const html = await buildReadonlyHtmlSnapshot(data, document.querySelector(".sheet-tool")!);

    expect(html).toContain('placeholder="填写姓名"');
    expect(html).toContain('placeholder="填写背景"');
    expect(html).toContain('data-markdown-editor="true"');
    expect(html).not.toContain('data-markdown-preview="true" data-markdown-empty="true"');
  });

  it("includes print-only Card Table grid rules so browser PDF output does not reuse absolute drag positions", async () => {
    const data = createEmptyCharacterData(minimalSystemPackage);
    document.body.innerHTML = `
      <main class="sheet-tool" aria-label="Sheet Tool">
        <article class="sheet-page" data-template-page-id="cards">
          <section class="card-table-module">
            <div class="card-table-surface" style="--play-card-width: 250px;">
              <article class="play-card" style="left: 80%; top: 90%; transform: rotate(4deg);">A</article>
            </div>
          </section>
        </article>
      </main>`;

    const html = await buildReadonlyHtmlSnapshot(data, document.querySelector(".sheet-tool")!);

    expect(html).toContain(".snapshot-shell .card-table-surface");
    expect(html).toContain("@page");
    expect(html).toContain("size: A4 portrait");
    expect(html).toContain("width: 210mm");
    expect(html).toContain("height: 297mm");
    expect(html).toContain("grid-template-columns: repeat(auto-fill, minmax(0, var(--play-card-width)))");
    expect(html).toContain("gap: 4px");
    expect(html).toContain("padding: 0");
    expect(html).toContain("border: 0");
    expect(html).toContain("left: auto !important");
    expect(html).toContain("width: var(--play-card-width) !important");
    expect(html).toContain("transform: none !important");
    expect(html).toContain("box-shadow: none !important");
    expect(html).toContain(".snapshot-shell .play-card *");
    expect(html).toContain("-webkit-print-color-adjust: exact");
    expect(html).toMatch(/\.snapshot-shell \.sheet-page,\s*\.snapshot-shell \[data-print-page="true"\]\s*\{[^}]*padding:\s*0/s);
    expect(html).toMatch(/\.snapshot-shell \[data-print-page="true"\]:has\(\[data-module-type="cardTable"\]\)\s*\{[^}]*padding:\s*var\(--card-table-print-page-padding, 3mm\)/s);
  });

  it("keeps ordinary A4 page boxes padding-free and gives Card Table print pages a default inset", () => {
    expect(printCss).toMatch(/\.print-mode \.sheet-page,\s*\.print-mode \[data-print-page="true"\]\s*\{[^}]*box-sizing:\s*border-box[^}]*width:\s*210mm[^}]*height:\s*297mm[^}]*padding:\s*0/s);
    expect(printCss).toMatch(/@media print\s*\{[\s\S]*?\.sheet-page,\s*\[data-print-page="true"\]\s*\{[^}]*padding:\s*0\s*!important/s);
    expect(printCss).toMatch(/\.print-mode \[data-print-page="true"\]:has\(\[data-module-type="cardTable"\]\)\s*\{[^}]*padding:\s*var\(--card-table-print-page-padding, 3mm\)\s*!important/s);
    expect(printCss).toMatch(/@media print\s*\{[\s\S]*?\[data-print-page="true"\]:has\(\[data-module-type="cardTable"\]\)\s*\{[^}]*padding:\s*var\(--card-table-print-page-padding, 3mm\)\s*!important/s);
    expect(printCss).toMatch(/@page\s*\{[^}]*size:\s*A4 portrait[^}]*margin:\s*0/s);
    expect(printCss).not.toContain("zoom:");
    expect(printCss).toMatch(/@media print\s*\{[\s\S]*?\.play-card\s*\{[^}]*width:\s*var\(--play-card-width\) !important/s);
    expect(printCss).toMatch(/\.play-card,\s*\.play-card \*\s*\{[^}]*print-color-adjust:\s*exact[^}]*-webkit-print-color-adjust:\s*exact/s);
    expect(printCss).toMatch(/\.sheet-page \+ \.sheet-page,[^{]*\{[^}]*break-before:\s*page[^}]*page-break-before:\s*always/s);
    expect(printCss).toMatch(/\.print-mode \[data-markdown-editor\]\[data-markdown-empty="true"\]\s*\{[^}]*display:\s*block\s*!important/s);
    expect(printCss).toMatch(/\.print-mode \[data-markdown-preview\]\[data-markdown-empty="true"\]\s*\{[^}]*display:\s*none\s*!important/s);
    expect(printCss).toMatch(/\.print-mode input::placeholder,\s*\.print-mode textarea::placeholder\s*\{[^}]*color:\s*#e6e8e9 !important[^}]*-webkit-text-fill-color:\s*#e6e8e9 !important[^}]*print-color-adjust:\s*exact/s);
  });

  it("keeps Free Text on one line while preparing output and browser printing", () => {
    expect(printCss).toMatch(/\.print-mode \[data-module-type="freeText"\] \[data-markdown-preview\][^{]*\{[^}]*overflow:\s*hidden[^}]*white-space:\s*nowrap/s);
    expect(printCss).toMatch(/@media print\s*\{[\s\S]*?\[data-module-type="freeText"\] \[data-markdown-preview\][^{]*\{[^}]*overflow:\s*hidden[^}]*white-space:\s*nowrap/s);
  });

  it("removes Countable Resource stepper shadows while preparing output and printing", () => {
    expect(printCss).toMatch(/\.print-mode \[data-module-type="countableResource"\] \[data-part="decrement-button"\],[^{]*\[data-part="increment-button"\]\s*\{[^}]*box-shadow:\s*none\s*!important[^}]*filter:\s*none\s*!important/s);
    expect(printCss).toMatch(/@media print\s*\{[\s\S]*?\[data-module-type="countableResource"\] \[data-part="decrement-button"\],[^{]*\[data-part="increment-button"\]\s*\{[^}]*box-shadow:\s*none\s*!important[^}]*filter:\s*none\s*!important/s);
  });

  it("renders empty field placeholder text in light gray in HTML snapshots", async () => {
    const html = await buildReadonlyHtmlSnapshot(createEmptyCharacterData(minimalSystemPackage));

    expect(html).toContain(".snapshot-shell input::placeholder");
    expect(html).toContain(".snapshot-shell textarea::placeholder");
    expect(html).toContain("color: #e6e8e9 !important");
    expect(html).toContain("-webkit-text-fill-color: #e6e8e9 !important");
    expect(html).toContain("print-color-adjust: exact");
  });

  it("imports HTML snapshots through the Character JSON compatibility path", async () => {
    const data = updateCharacterValue(createEmptyCharacterData(minimalSystemPackage), "character-name", "阿青");
    const result = parseCharacterDataText(await buildReadonlyHtmlSnapshot(data), minimalSystemPackage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.character.values["character-name"]).toBe("阿青");
    }
  });

  it("reports invalid HTML without embedded Character JSON", () => {
    const result = parseCharacterDataText("<html><body>no data</body></html>", minimalSystemPackage);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("没有嵌入的 Character JSON");
    }
  });

  it("still rejects package mismatches after extracting HTML Character JSON", async () => {
    const data = createEmptyCharacterData({
      ...minimalSystemPackage,
      manifest: { ...minimalSystemPackage.manifest, ID: "other-package" },
    });
    const result = parseCharacterDataText(await buildReadonlyHtmlSnapshot(data), minimalSystemPackage);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("不属于当前 System Package");
    }
  });
});

describe("output image waiting", () => {
  it("resolves immediately when visible images are already complete", async () => {
    document.body.innerHTML = '<main><img src="ok.png" alt="ok"></main>';
    const image = document.querySelector("img")!;
    Object.defineProperty(image, "complete", { value: true, configurable: true });
    Object.defineProperty(image, "offsetWidth", { value: 10, configurable: true });

    await expect(waitForVisibleImages(document.body)).resolves.toBeUndefined();
  });

  it("resolves on failed image and preserves fallback-oriented alt content", async () => {
    document.body.innerHTML = '<main><img src="bad.png" alt="文字 fallback"></main>';
    const image = document.querySelector("img")!;
    Object.defineProperty(image, "complete", { value: false, configurable: true });
    Object.defineProperty(image, "offsetWidth", { value: 10, configurable: true });
    const waiting = waitForVisibleImages(document.body);

    image.dispatchEvent(new Event("error"));

    await expect(waiting).resolves.toBeUndefined();
    expect(image.alt).toBe("文字 fallback");
  });

  it("does not block forever on timeout", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<main><img src="slow.png" alt="slow"></main>';
    const image = document.querySelector("img")!;
    Object.defineProperty(image, "complete", { value: false, configurable: true });
    Object.defineProperty(image, "offsetWidth", { value: 10, configurable: true });
    const waiting = waitForVisibleImages(document.body, 50);

    await vi.advanceTimersByTimeAsync(50);

    await expect(waiting).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it("leaves raw JSON import behavior unchanged", () => {
    const data = createEmptyCharacterData(minimalSystemPackage);
    const result = parseCharacterDataText(exportCharacterData(data), minimalSystemPackage);

    expect(result.ok).toBe(true);
  });
});
