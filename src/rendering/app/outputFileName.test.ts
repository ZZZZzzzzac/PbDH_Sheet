import { describe, expect, it } from "vitest";
import { buildOutputFileName } from "./outputFileName";

describe("buildOutputFileName", () => {
  it("uses the Character Save name for native exports", () => {
    expect(buildOutputFileName("阿青", ".json")).toBe("阿青.json");
    expect(buildOutputFileName(" 阿青/游侠 ", "html")).toBe("阿青_游侠.html");
  });

  it("adds the target format name for Character Format Adapter exports", () => {
    expect(buildOutputFileName("阿青", ".json", "ZZZ Format")).toBe("阿青.ZZZ.json");
    expect(buildOutputFileName("阿青", ".json", "dhSheet Format")).toBe("阿青.dhSheet.json");
    expect(buildOutputFileName("阿青", ".json", "自定义格式")).toBe("阿青.自定义.json");
  });
});
