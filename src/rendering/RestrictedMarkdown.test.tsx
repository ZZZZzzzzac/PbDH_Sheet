import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RestrictedMarkdown } from "./RestrictedMarkdown";

describe("Restricted Markdown", () => {
  it("renders CommonMark emphasis through its public React output", () => {
    const result = render(<RestrictedMarkdown value="**bold** *italic* ***both***" />);

    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("italic").tagName).toBe("EM");
    const combined = screen.getByText("both");
    expect(combined.closest("strong")).not.toBeNull();
    expect(combined.closest("em")).not.toBeNull();
    expect(result.container).toHaveTextContent("bold italic both");
  });

  it("closes adjacent Chinese emphasis at each explicit delimiter", () => {
    const result = render(
      <RestrictedMarkdown value="**转移：**当你成为攻击目标时，可以**标记 1 护甲槽**，使针对你的攻击检定具有劣势。" />,
    );

    expect([...result.container.querySelectorAll("strong")].map((element) => element.textContent)).toEqual([
      "转移：",
      "标记 1 护甲槽",
    ]);
  });

  it("renders only the seven approved colors and composes them with emphasis", () => {
    const colors = ["red", "orange", "yellow", "green", "blue", "purple", "gray"];
    const result = render(
      <RestrictedMarkdown value={`${colors.map((color) => `:${color}[${color}]`).join(" ")} :blue[***strong blue***]`} />,
    );

    colors.forEach((color) => {
      expect(screen.getByText(color)).toHaveAttribute("data-markdown-color", color);
    });
    const composed = screen.getByText("strong blue");
    expect(composed.closest('[data-markdown-color="blue"]')).not.toBeNull();
    expect(composed.closest("strong")).not.toBeNull();
    expect(composed.closest("em")).not.toBeNull();
    expect(result.container.querySelectorAll("[data-markdown-color]")).toHaveLength(8);
  });

  it("keeps unsupported syntax non-interactive and rejects unknown or nested colors", () => {
    const result = render(
      <RestrictedMarkdown value={'# heading\n\n[link](https://example.com) ![image](bad.png) `code` ~~strike~~\n\n> quote\n\n- [x] task\n\n| table |\n| --- |\n| cell |\n\n<em>html</em>\n\n:pink[unknown] :red[outer :blue[inner]]'} />,
    );

    expect(result.container).toHaveTextContent("heading");
    expect(result.container).toHaveTextContent("link");
    expect(result.container).toHaveTextContent("image");
    expect(result.container).toHaveTextContent("code");
    expect(result.container).toHaveTextContent("html");
    expect(result.container.querySelector("h1, a, img, code, table, blockquote, del, input")).toBeNull();
    expect(result.container.querySelector("[data-markdown-color]")).toBeNull();
  });

  it("renders ordered and unordered CommonMark lists", () => {
    const result = render(<RestrictedMarkdown value={'- ***first:*** text\n\n- ***second:*** text\n\n- ***third:*** text\n\n1. one\n2. two'} />);

    expect(result.container.querySelector("ul")?.querySelectorAll("li")).toHaveLength(3);
    expect(result.container.querySelectorAll("ul > li > p")).toHaveLength(3);
    expect(result.container.querySelector("ol")?.querySelectorAll("li")).toHaveLength(2);
  });

  it("preserves ordinary text line breaks one-for-one in the rendered output", () => {
    const single = render(<RestrictedMarkdown value={'ABC\nabc'} />);
    expect(single.container.querySelector("p")?.innerHTML).toBe("ABC<br>\nabc");

    const oneBlankLine = render(<RestrictedMarkdown value={'ABC\n\nabc'} />);
    expect([...oneBlankLine.container.querySelector('[data-restricted-markdown="true"]')!.children].map((element) => element.tagName)).toEqual([
      "P",
      "BR",
      "P",
    ]);

    const twoBlankLines = render(<RestrictedMarkdown value={'ABC\n\n\nabc'} />);
    expect([...twoBlankLines.container.querySelector('[data-restricted-markdown="true"]')!.children].map((element) => element.tagName)).toEqual([
      "P",
      "BR",
      "BR",
      "P",
    ]);
  });

  it("exposes stable CSS variables for every approved color", () => {
    const css = readFileSync("src/styles/variables.css", "utf8");

    ["red", "orange", "yellow", "green", "blue", "purple", "gray"].forEach((color) => {
      expect(css).toContain(`--restricted-markdown-${color}:`);
    });
  });
});
