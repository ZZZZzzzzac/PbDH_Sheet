import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCardInstance } from "../domain/cardEngine";
import { applyEffectiveResourceCatalog, createEffectiveResourceCatalog } from "../domain/effectiveResourceCatalog";
import { loadResourceExtensionJson } from "../domain/resourceExtension";
import { resourceAssetUrlKey } from "../loaders/assetResolver";
import { createEmptyCharacterData, updatePlayerImage } from "../domain/characterData";
import type { SystemPackage } from "../domain/systemPackage";
import { moduleDemoSystemPackage } from "../test/fixtures";
import { useRuntimeStore } from "../store/runtimeStore";
import { SheetRenderer } from "./SheetRenderer";
import { createCardTablePackage, createMultiResourcePickerPackage, createResourcePickerPackage, renderModuleDemo, resetModuleRegistryTestState } from "./moduleRegistry.testSupport";

describe("Card rendering", () => {
  beforeEach(() => {
    resetModuleRegistryTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders an empty Card Table without a redundant empty-state panel", () => {
    const systemPackage = createCardTablePackage();
    useRuntimeStore.setState({
      currentPackage: systemPackage,
      characterData: createEmptyCharacterData(systemPackage),
    });

    const result = render(<SheetRenderer systemPackage={systemPackage} />);
    const surface = result.container.querySelector(".card-table-surface");

    expect(surface).toHaveAttribute("aria-label", "领域卡牌桌面自由桌面");
    expect(surface?.querySelector('[data-part="empty"]')).toBeNull();
    expect(screen.queryByText("选择卡牌后会放到这里。")).not.toBeInTheDocument();
  });

  it("renders text cards with recall in the tag row above the description", () => {
    const systemPackage = createCardTablePackage();
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "card-instance-1",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:recall-test",
    });
    useRuntimeStore.setState({
      currentPackage: systemPackage,
      packageAssetUrls: {},
      characterData,
      packageIssues: [],
      derivedReadOnlyDisplayContent: {},
      moduleVisibility: {},
      pageVisibility: {},
      resourcePickerDefaultQueries: {},
      cardTableCardWidths: {},
      bootStatus: "ready",
      storageStatus: "idle",
      importError: null,
      importNotice: null,
    });

    const result = render(<SheetRenderer systemPackage={systemPackage} />);
    const card = screen.getByRole("article", { name: "回想测试" });
    const tagRow = card.querySelector(".play-card-tags");

    expect(tagRow).not.toBeNull();
    expect(tagRow).toHaveTextContent("贤者");
    expect(tagRow).toHaveTextContent("1");
    expect(card.querySelector(".play-card-recall")).toBeNull();
    expect(result.container.querySelector(".play-card-description")).toHaveTextContent("描述应该独立显示。");
  });

  it("renders Restricted Markdown in Card names, descriptions, inferred tags, and Card Detail", () => {
    const systemPackage = createCardTablePackage();
    const definition = systemPackage.resourceLibraries[0].entries[0];
    definition.fields.名称 = "**回想测试**";
    definition.fields.领域 = ":purple[贤者]";
    definition.fields.描述 = "*描述*\n\n- 第一项\n- 第二项";
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "markdown-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: definition.ID,
    });
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData });

    const result = render(<SheetRenderer systemPackage={systemPackage} />);
    const card = screen.getByRole("article", { name: "**回想测试**" });
    expect(within(card).getByText("回想测试").tagName).toBe("STRONG");
    expect(within(card).getByText("贤者")).toHaveAttribute("data-markdown-color", "purple");
    expect(within(card).getByText("描述").tagName).toBe("EM");
    expect(card.querySelectorAll(".play-card-description li")).toHaveLength(2);

    fireEvent.contextMenu(card);
    const contextMenu = screen.getByRole("menu");
    expect(contextMenu.parentElement).toBe(document.body);
    expect(result.container.querySelector(".card-table-surface")?.contains(contextMenu)).toBe(false);
    fireEvent.click(screen.getByRole("menuitem", { name: "查看详情" }));
    const dialog = screen.getByRole("dialog", { name: "**回想测试**详情" });
    expect(within(dialog).getByText("回想测试").tagName).toBe("STRONG");
    expect(result.container.querySelector(".card-context-menu strong")).toBeNull();
  });

  it("uses the same Restricted Markdown output after Card artwork fails", () => {
    const systemPackage = createCardTablePackage();
    const definition = systemPackage.resourceLibraries[0].entries[0];
    definition.fields.名称 = "**故障回退**";
    definition.fields.卡图 = "assets/cards/failure.png";
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "image-fallback-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: definition.ID,
    });
    useRuntimeStore.setState({
      currentPackage: systemPackage,
      packageAssetUrls: { "assets/cards/failure.png": "blob:failure" },
      characterData,
    });

    render(<SheetRenderer systemPackage={systemPackage} />);
    fireEvent.error(screen.getByRole("img", { name: "**故障回退**" }));

    expect(screen.getByText("故障回退").tagName).toBe("STRONG");
  });

  it("resolves Card artwork from the owning Resource Extension namespace", () => {
    const basePackage = createCardTablePackage();
    const loaded = loadResourceExtensionJson(JSON.stringify({
      ID: "void", 名称: "虚空", 版本: "1", 目标系统包ID: basePackage.manifest.ID,
      resourceLibraries: [{ ID: "domain-cards", 名称: "领域卡", entries: [{
        ID: "extension-card", 名称: "扩展卡", 描述: "扩展描述", 卡图: "assets/cards/shared.png",
      }] }],
    }), basePackage.manifest.ID);
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.issues));
    const catalog = createEffectiveResourceCatalog(basePackage, [loaded.extension]);
    const systemPackage = applyEffectiveResourceCatalog(basePackage, catalog);
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "extension-instance",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "extension-card",
    });
    useRuntimeStore.setState({
      currentPackage: systemPackage,
      resourceCatalog: catalog,
      packageAssetUrls: { [resourceAssetUrlKey("resourceExtension", "void", "assets/cards/shared.png")]: "blob:void-card" },
      characterData,
    });

    render(<SheetRenderer systemPackage={systemPackage} />);
    expect(screen.getByRole("img", { name: "扩展卡" })).toHaveAttribute("src", "blob:void-card");
  });

  it("marks descriptions that still overflow at 9px without shrinking names, tags, or Card Detail", async () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("play-card-description") ? 100 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("play-card-description") ? 200 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("play-card-description") ? 200 : 0;
    });
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("play-card-description") ? 200 : 0;
    });
    const systemPackage = createCardTablePackage();
    const definition = systemPackage.resourceLibraries[0].entries[0];
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "overflow-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: definition.ID,
    });
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData });

    render(<SheetRenderer systemPackage={systemPackage} />);
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

    const card = screen.getByRole("article", { name: "回想测试" });
    const description = card.querySelector<HTMLElement>(".play-card-description");
    expect(description).toHaveStyle({ fontSize: "9px" });
    expect(description).toHaveAttribute("data-card-description-fit", "overflow");
    expect(card.querySelector<HTMLElement>(".play-card-name")?.style.fontSize).toBe("");
    expect(card.querySelector<HTMLElement>(".play-card-tag")?.style.fontSize).toBe("");
    expect(within(card).getByRole("img", { name: "卡牌描述未完全显示；查看卡牌详情可阅读完整内容" })).toBeVisible();

    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByRole("menuitem", { name: "查看详情" }));
    const dialog = screen.getByRole("dialog", { name: "回想测试详情" });
    expect(dialog.querySelector<HTMLElement>(".play-card-description")?.style.fontSize).toBe("");
    expect(within(dialog).queryByRole("img", { name: "卡牌描述未完全显示；查看卡牌详情可阅读完整内容" })).toBeNull();
  });

  it("resolves colliding Card Definition IDs from each instance's Resource Library", () => {
    const systemPackage = createCardTablePackage();
    const first = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "domain-instance",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:recall-test",
    });
    const characterData = createCardInstance(first, {
      instanceId: "ancestry-instance",
      tableModuleId: "domain-card-table",
      libraryId: "ancestry-cards",
      definitionId: "domain-card:recall-test",
    });
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData });

    render(<SheetRenderer systemPackage={systemPackage} />);

    expect(screen.getByRole("article", { name: "回想测试" })).toBeVisible();
    expect(screen.getByRole("article", { name: "种族能力" })).toBeVisible();
  });

  it("flips to a reverse Card Definition and rotates from the Card context menu", () => {
    const systemPackage = createCardTablePackage();
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "physical-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:recall-test",
      state: "configured",
    });
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData });

    render(<SheetRenderer systemPackage={systemPackage} />);
    let card = screen.getByRole("article", { name: "回想测试" });
    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByRole("menuitem", { name: "翻至背面" }));

    card = screen.getByRole("article", { name: "卡牌背面" });
    expect(useRuntimeStore.getState().characterData?.cards.instances[0].face).toBe("back");
    fireEvent.contextMenu(card);
    expect(screen.queryByRole("menuitem", { name: "逆时针旋转 90°" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "顺时针旋转 90°" }));
    expect(card).toHaveStyle({ transform: "rotate(90deg) scale(1)" });

    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByRole("menuitem", { name: "查看详情" }));
    expect(screen.getByRole("dialog", { name: "卡牌背面详情" })).toHaveTextContent("这是独立的背面 Card Definition。");
  });

  it("flips an image Card to its direct back asset without a reverse Resource Entry", () => {
    const systemPackage = createCardTablePackage();
    const table = systemPackage.modules.find((module) => module.ID === "domain-card-table");
    if (table?.类型 !== "cardTable") throw new Error("card table fixture missing");
    table.显示方式 = "image";
    const front = systemPackage.resourceLibraries?.find((library) => library.ID === "domain-cards")?.entries[0];
    if (!front) throw new Error("front fixture missing");
    front.fields.卡图 = "assets/cards/front.webp";
    front.fields.卡背 = "assets/cards/back.webp";
    delete front.fields.背面卡牌ID;
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "direct-back-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: front.ID,
    });
    useRuntimeStore.setState({
      currentPackage: systemPackage,
      characterData,
      packageAssetUrls: {
        "assets/cards/front.webp": "blob:front",
        "assets/cards/back.webp": "blob:back",
      },
    });

    render(<SheetRenderer systemPackage={systemPackage} />);
    const card = screen.getByRole("article", { name: "回想测试" });
    expect(within(card).getByRole("img", { name: "回想测试" })).toHaveAttribute("src", "blob:front");
    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByRole("menuitem", { name: "翻至背面" }));
    expect(within(card).getByRole("img", { name: "回想测试" })).toHaveAttribute("src", "blob:back");
  });

  it("lets a Card Definition override an image Table with text presentation", () => {
    const systemPackage = createCardTablePackage();
    const table = systemPackage.modules.find((module) => module.ID === "domain-card-table");
    if (table?.类型 !== "cardTable") throw new Error("card table fixture missing");
    table.显示方式 = "image";
    table.显示方式字段 = "卡牌显示方式";
    const definition = systemPackage.resourceLibraries?.find((library) => library.ID === "domain-cards")?.entries[0];
    if (!definition) throw new Error("definition fixture missing");
    definition.fields.卡图 = "assets/cards/front.webp";
    definition.fields.卡牌显示方式 = "text";
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "text-override-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: definition.ID,
    });
    useRuntimeStore.setState({
      currentPackage: systemPackage,
      characterData,
      packageAssetUrls: { "assets/cards/front.webp": "blob:front" },
    });

    render(<SheetRenderer systemPackage={systemPackage} />);
    const card = screen.getByRole("article", { name: "回想测试" });
    expect(within(card).queryByRole("img", { name: "回想测试" })).not.toBeInTheDocument();
    expect(card).toHaveTextContent("描述应该独立显示。");
  });

  it("shows an image as soon as its URL becomes available without requiring a Card interaction", () => {
    const systemPackage = createCardTablePackage();
    const table = systemPackage.modules.find((module) => module.ID === "domain-card-table");
    if (table?.类型 !== "cardTable") throw new Error("card table fixture missing");
    table.显示方式 = "image";
    const definition = systemPackage.resourceLibraries?.find((library) => library.ID === "domain-cards")?.entries[0];
    if (!definition) throw new Error("definition fixture missing");
    definition.fields.卡图 = "assets/cards/front.webp";
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "late-image-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: definition.ID,
    });
    const packageAssetUrls: Record<string, string> = {};
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData, packageAssetUrls });

    render(<SheetRenderer systemPackage={systemPackage} />);
    const card = screen.getByRole("article", { name: "回想测试" });
    expect(within(card).queryByRole("img", { name: "回想测试" })).not.toBeInTheDocument();

    act(() => {
      packageAssetUrls["assets/cards/front.webp"] = "blob:front";
      useRuntimeStore.setState({ storageStatus: "saved" });
    });

    expect(within(card).getByRole("img", { name: "回想测试" })).toHaveAttribute("src", "blob:front");
  });

  it("uses Author-defined state outlines and badges for image Cards and Card Detail", () => {
    const systemPackage = createCardTablePackage();
    systemPackage.resourceLibraries[0].entries[0].fields.卡图 = "assets/cards/front.webp";
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "colored-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:recall-test",
      state: "configured",
    });
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData, packageAssetUrls: { "assets/cards/front.webp": "blob:front" } });

    render(<SheetRenderer systemPackage={systemPackage} />);
    const card = screen.getByRole("article", { name: "回想测试" });
    expect(within(card).getByRole("img", { name: "回想测试" })).toBeInTheDocument();
    expect(card).toHaveAttribute("data-card-state", "configured");
    expect(card.style.getPropertyValue("--play-card-state-color")).toBe("");
    expect(within(card).queryByText("宝库")).not.toBeInTheDocument();
    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByRole("menuitem", { name: "标记为vault" }));

    expect(card).toHaveAttribute("data-card-state", "vault");
    expect(card.style.getPropertyValue("--play-card-state-color")).toBe("#abcdef");
    expect(within(card).getByText("宝库")).toHaveClass("play-card-state-badge");
    expect(within(card).getByRole("img", { name: "回想测试" })).toBeInTheDocument();
    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByRole("menuitem", { name: "查看详情" }));
    const detail = screen.getByRole("dialog", { name: "回想测试详情" });
    expect(detail.querySelector(".card-detail-face")).toHaveAttribute("data-card-state", "vault");
    expect(detail.querySelector(".card-detail-face")).toHaveStyle({ "--play-card-state-color": "#abcdef" });
    expect(within(detail).getByText("宝库")).toHaveClass("play-card-state-badge");
  });

  it("uses the same Author-defined state outline and badge for text Cards", () => {
    const systemPackage = createCardTablePackage();
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "text-state-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:recall-test",
      state: "vault",
    });
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData, packageAssetUrls: {} });

    render(<SheetRenderer systemPackage={systemPackage} />);
    const card = screen.getByRole("article", { name: "回想测试" });

    expect(card.querySelector(".play-card-text")).not.toBeNull();
    expect(card).toHaveClass("has-card-state-appearance");
    expect(card).toHaveAttribute("data-card-state", "vault");
    expect(card).toHaveStyle({ "--play-card-state-color": "#abcdef" });
    expect(within(card).getByText("宝库")).toHaveClass("play-card-state-badge");
  });

  it("does not invent Card states when the Author omits state options", () => {
    const configuredPackage = createCardTablePackage();
    const systemPackage: SystemPackage = {
      ...configuredPackage,
      modules: configuredPackage.modules.map((module) => module.类型 === "cardTable"
        ? { ...module, 状态选项: undefined, 状态外观: undefined }
        : module),
    };
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "stateless-card", tableModuleId: "domain-card-table", libraryId: "domain-cards", definitionId: "domain-card:recall-test",
    });
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData });

    render(<SheetRenderer systemPackage={systemPackage} />);
    fireEvent.contextMenu(screen.getByRole("article", { name: "回想测试" }));

    expect(screen.queryByRole("menuitem", { name: /^标记为/ })).not.toBeInTheDocument();
  });

  it("places persistent edge indicators and removes only when decrementing at zero", () => {
    const systemPackage = createCardTablePackage();
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "indicator-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:recall-test",
    });
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData });

    const result = render(<SheetRenderer systemPackage={systemPackage} />);
    const card = screen.getByRole("article", { name: "回想测试" });
    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByRole("menuitem", { name: "添加指示物" }));
    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByRole("menuitem", { name: "添加指示物" }));

    let badge = screen.getByRole("button", { name: /青色指示物：0/ });
    const secondBadge = screen.getByRole("button", { name: /红色指示物：0/ });
    expect(badge).toHaveClass("card-indicator-badge");
    expect(badge).toHaveAttribute("data-color-index", "0");
    expect(secondBadge).toHaveAttribute("data-color-index", "1");
    expect(card.querySelector(".play-card-text")?.contains(badge)).toBe(false);
    fireEvent.click(badge);
    badge = screen.getByRole("button", { name: /青色指示物：1/ });
    fireEvent.contextMenu(badge);
    expect(screen.getByRole("button", { name: /青色指示物：0/ })).toBeVisible();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    badge = screen.getByRole("button", { name: /青色指示物：0/ });
    fireEvent.keyDown(badge, { key: "+" });
    badge = screen.getByRole("button", { name: /青色指示物：1/ });
    fireEvent.keyDown(badge, { key: "ArrowDown" });
    badge = screen.getByRole("button", { name: /青色指示物：0/ });
    fireEvent.contextMenu(badge);

    expect(screen.queryByRole("button", { name: /青色指示物/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /红色指示物：0/ })).toBeVisible();
    expect(useRuntimeStore.getState().characterData?.cards.instances[0].indicators).toHaveLength(1);
    expect(result.container.querySelectorAll(".card-indicator-badge")).toHaveLength(1);
  });

  it("renders an existing Card Instance saved before indicators were introduced", () => {
    const systemPackage = createCardTablePackage();
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "legacy-card",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:recall-test",
    });
    delete (characterData.cards.instances[0] as Partial<typeof characterData.cards.instances[number]>).indicators;
    useRuntimeStore.setState({ currentPackage: systemPackage, characterData });

    expect(() => render(<SheetRenderer systemPackage={systemPackage} />)).not.toThrow();
    expect(screen.getByRole("article", { name: "回想测试" })).toBeVisible();
  });

  it("lets the player resize Card Table cards from the table toolbar", () => {
    const systemPackage = createCardTablePackage();
    const characterData = createCardInstance(createEmptyCharacterData(systemPackage), {
      instanceId: "card-instance-1",
      tableModuleId: "domain-card-table",
      libraryId: "domain-cards",
      definitionId: "domain-card:recall-test",
    });
    useRuntimeStore.setState({
      currentPackage: systemPackage,
      packageAssetUrls: {},
      characterData,
      packageIssues: [],
      derivedReadOnlyDisplayContent: {},
      moduleVisibility: {},
      pageVisibility: {},
      resourcePickerDefaultQueries: {},
      cardTableCardWidths: {},
      bootStatus: "ready",
      storageStatus: "idle",
      importError: null,
      importNotice: null,
    });

    const result = render(<SheetRenderer systemPackage={systemPackage} />);
    const sizeSlider = screen.getByLabelText("领域卡牌桌面卡牌大小");

    expect(sizeSlider).toHaveValue("250");
    expect(result.container.querySelector(".card-table-surface")).toHaveStyle({ "--play-card-width": "250px" });

    fireEvent.change(sizeSlider, { target: { value: "300" } });

    expect(useRuntimeStore.getState().cardTableCardWidths["domain-card-table"]).toBe(300);
    expect(result.container.querySelector(".card-table-surface")).toHaveStyle({ "--play-card-width": "300px" });
  });

  it("expands the Card Table surface to the height allocated by its container", () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("card-table-module") ? 1200 : 0;
    });
    const systemPackage = createCardTablePackage();
    useRuntimeStore.setState({
      currentPackage: systemPackage,
      characterData: createEmptyCharacterData(systemPackage),
    });

    const result = render(<SheetRenderer systemPackage={systemPackage} />);

    expect(result.container.querySelector(".card-table-surface")).toHaveStyle({ height: "1200px", minHeight: "1200px" });
  });
});
