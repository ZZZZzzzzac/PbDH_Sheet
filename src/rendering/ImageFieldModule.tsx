import { X } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import type { PlayerImageValue } from "../domain/characterData";
import type { ImageFieldModule as ImageFieldModuleConfig } from "../domain/systemPackage";
import { useRuntimeStore } from "../store/runtimeStore";

interface ImageFieldModuleProps {
  module: ImageFieldModuleConfig;
}

export function ImageFieldModule({ module }: ImageFieldModuleProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const value = useRuntimeStore((state) => state.characterData?.character.values[module.ID]);
  const playerImages = useRuntimeStore((state) => state.characterData?.playerImages ?? {});
  const uploadPlayerImage = useRuntimeStore((state) => state.uploadPlayerImage);
  const removePlayerImage = useRuntimeStore((state) => state.removePlayerImage);
  const imageValue = isPlayerImageValue(value) ? value : null;
  const image = imageValue ? playerImages[imageValue.imageId] : undefined;
  const altText = module.替代文本 ?? module.标签;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await uploadPlayerImage(module.ID, file);
    event.target.value = "";
  };

  return (
    <figure className="container container-stack image" data-module-id={module.ID} data-module-type={module.类型} data-part="container">
      <figcaption className="label" data-part="label">{module.标签}</figcaption>
      <div className="image-surface-frame" data-part="surface-frame">
        <button
          className="image-upload-surface"
          data-part="surface"
          type="button"
          aria-label={`${imageValue ? "更换" : "上传"}${module.标签}`}
          onClick={() => inputRef.current?.click()}
        >
          {image ? (
            <img className="value image-preview" data-part="image" src={image.dataUrl} alt={altText} />
          ) : (
            <span className="image-fallback" data-part="image-fallback">点击上传图片</span>
          )}
        </button>
        {imageValue ? (
          <button className="image-remove-button" data-part="remove-button" type="button" aria-label={`移除${module.标签}`} onClick={() => void removePlayerImage(module.ID)}>
            <X aria-hidden="true" size={16} />
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        className="visually-hidden"
        data-part="input"
        type="file"
        accept="image/*"
        aria-label={`${module.标签}图片文件`}
        onChange={handleFileChange}
      />
    </figure>
  );
}

function isPlayerImageValue(value: unknown): value is PlayerImageValue {
  return typeof value === "object" && value !== null && "kind" in value && (value as PlayerImageValue).kind === "player-image";
}
