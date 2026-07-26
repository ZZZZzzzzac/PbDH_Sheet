import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createEmptyCharacterData } from "../domain/characterData";
import { minimalSystemPackage } from "../test/fixtures";
import type { PendingQuestionnaireResult } from "../store/runtimeStore";
import { QuestionnaireResultDialog } from "./QuestionnaireResultDialog";

function pendingResult(overrides: Partial<PendingQuestionnaireResult> = {}): PendingQuestionnaireResult {
  const characterData = createEmptyCharacterData(minimalSystemPackage, "character:test");
  return {
    questionnaireId: "questionnaire:test",
    questionnaireName: "测试问卷",
    packageId: minimalSystemPackage.manifest.ID,
    characterId: characterData.character.id,
    baseUpdatedAt: characterData.updatedAt,
    selections: [],
    missingResources: [{
      sourceModuleId: "pick-class",
      pickerLabel: "选择职业",
      libraryId: "classes",
      libraryName: "职业",
      entryId: "虚空:职业:女巫",
    }],
    nextCharacterData: characterData,
    ...overrides,
  };
}

describe("QuestionnaireResultDialog", () => {
  it("warns about missing resources and blocks an empty proposal", () => {
    render(<QuestionnaireResultDialog pending={pendingResult()} onConfirm={() => {}} onCancel={() => {}} />);

    expect(screen.getByRole("alert")).toHaveTextContent("虚空:职业:女巫");
    expect(screen.getByText("当前没有可应用的选择。")).toBeVisible();
    expect(screen.getByRole("button", { name: "确认应用" })).toBeDisabled();
  });

  it("allows available selections while retaining the missing-resource warning", () => {
    const onConfirm = vi.fn();
    render(<QuestionnaireResultDialog
      pending={pendingResult({
        selections: [{
          sourceModuleId: "pick-class",
          pickerLabel: "选择职业",
          libraryId: "classes",
          libraryName: "职业",
          entries: [{ id: "职业:德鲁伊", name: "德鲁伊" }],
        }],
      })}
      onConfirm={onConfirm}
      onCancel={() => {}}
    />);

    expect(screen.getByText("职业：德鲁伊")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "确认应用" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
