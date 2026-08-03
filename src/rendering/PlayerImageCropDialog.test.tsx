import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerImageCropDialog } from "./PlayerImageCropDialog";

describe("PlayerImageCropDialog", () => {
  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:crop-test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      clearRect: vi.fn(), fillRect: vi.fn(), drawImage: vi.fn(), save: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), restore: vi.fn(), strokeRect: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    class TestImage {
      naturalWidth = 1600;
      naturalHeight = 900;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    }
    vi.stubGlobal("Image", TestImage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("exposes a named output-excluded modal with explicit confirmation and cancellation", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<PlayerImageCropDialog
      file={new File(["image"], "portrait.png", { type: "image/png" })}
      label="头像"
      working={false}
      processingError={null}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />);

    const dialog = screen.getByRole("dialog", { name: "裁剪头像" });
    expect(dialog.parentElement).toHaveAttribute("data-output-exclude", "true");
    await waitFor(() => expect(screen.getByRole("button", { name: "应用裁剪" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "应用裁剪" }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ sourceWidth: 1600, sourceHeight: 900 }));
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("prevents crop zoom wheel events from scrolling the background", async () => {
    render(<PlayerImageCropDialog
      file={new File(["image"], "portrait.png", { type: "image/png" })}
      label="头像"
      working={false}
      processingError={null}
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
    />);

    await waitFor(() => expect(screen.getByRole("button", { name: "应用裁剪" })).toBeEnabled());
    const canvas = screen.getByLabelText("拖拽裁剪区域和四角，滚轮缩放");
    const backgroundWheel = vi.fn();
    window.addEventListener("wheel", backgroundWheel);
    const wheelEvent = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 100,
      deltaY: -120,
    });

    canvas.dispatchEvent(wheelEvent);

    expect(wheelEvent.defaultPrevented).toBe(true);
    expect(backgroundWheel).not.toHaveBeenCalled();
    window.removeEventListener("wheel", backgroundWheel);
  });
});
