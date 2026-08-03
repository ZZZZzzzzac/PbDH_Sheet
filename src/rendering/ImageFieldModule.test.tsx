import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyCharacterData, updatePlayerImage } from "../domain/characterData";
import { useRuntimeStore } from "../store/runtimeStore";
import { moduleDemoSystemPackage } from "../test/fixtures";
import { ImageFieldModule } from "./ImageFieldModule";
import { cropPlayerImage } from "./playerImageProcessor";

vi.mock("./PlayerImageCropDialog", () => ({
  PlayerImageCropDialog: ({ label, processingError, onCancel, onConfirm }: {
    label: string;
    processingError: string | null;
    onCancel: () => void;
    onConfirm: (selection: { sourceWidth: number; sourceHeight: number; x: number; y: number; width: number; height: number }) => void;
  }) => <section role="dialog" aria-label={`裁剪${label}`}>
    {processingError ? <p role="alert">{processingError}</p> : null}
    <button type="button" onClick={onCancel}>取消</button>
    <button type="button" onClick={() => onConfirm({ sourceWidth: 100, sourceHeight: 100, x: 10, y: 10, width: 80, height: 80 })}>应用裁剪</button>
  </section>,
}));

vi.mock("./playerImageProcessor", () => ({ cropPlayerImage: vi.fn() }));

const portraitModule = moduleDemoSystemPackage.modules.find((module) => module.ID === "portrait")!;

describe("ImageFieldModule crop workflow", () => {
  const uploadPlayerImage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    const characterData = updatePlayerImage(createEmptyCharacterData(moduleDemoSystemPackage), "portrait", {
      id: "portrait-existing",
      name: "existing.png",
      mimeType: "image/png",
      dataUrl: "data:image/png;base64,AA==",
    });
    useRuntimeStore.setState({ characterData, uploadPlayerImage });
  });

  it("does not replace the current Player Image until a crop is applied", async () => {
    const user = userEvent.setup();
    render(<ImageFieldModule module={portraitModule} />);
    const selected = new File(["image"], "replacement.png", { type: "image/png" });

    await user.upload(screen.getByLabelText("头像图片文件"), selected);

    expect(screen.getByRole("dialog", { name: "裁剪头像" })).toBeInTheDocument();
    expect(uploadPlayerImage).not.toHaveBeenCalled();
    expect(useRuntimeStore.getState().characterData?.character.values.portrait).toEqual({ kind: "player-image", imageId: "portrait-existing" });

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("dialog", { name: "裁剪头像" })).not.toBeInTheDocument();
    expect(uploadPlayerImage).not.toHaveBeenCalled();
  });

  it("stores only the processed WebP after confirmation and keeps failures editable", async () => {
    const user = userEvent.setup();
    const processed = new File(["webp"], "replacement.webp", { type: "image/webp" });
    vi.mocked(cropPlayerImage).mockResolvedValueOnce(processed);
    render(<ImageFieldModule module={portraitModule} />);

    await user.upload(screen.getByLabelText("头像图片文件"), new File(["image"], "replacement.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "应用裁剪" }));

    await waitFor(() => expect(uploadPlayerImage).toHaveBeenCalledWith("portrait", processed));
    expect(screen.queryByRole("dialog", { name: "裁剪头像" })).not.toBeInTheDocument();

    vi.mocked(cropPlayerImage).mockRejectedValueOnce(new Error("图片已损坏或无法解码，请更换文件。"));
    await user.upload(screen.getByLabelText("头像图片文件"), new File(["bad"], "bad.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "应用裁剪" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("图片已损坏或无法解码");
    expect(screen.getByRole("dialog", { name: "裁剪头像" })).toBeInTheDocument();
    expect(uploadPlayerImage).toHaveBeenCalledTimes(1);
  });
});
