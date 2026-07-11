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
      {image ? (
        <img className="value image-preview" data-part="image" src={image.dataUrl} alt={altText} />
      ) : (
        <div className="image-fallback" data-part="image-fallback" role="img" aria-label={altText}>
          图片不可用
        </div>
      )}
      <div className="image-actions" data-part="actions">
        <button className="button image-upload-button" data-part="button" type="button" onClick={() => inputRef.current?.click()}>
          上传图片
        </button>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept="image/*"
          aria-label={`${module.标签}图片文件`}
          onChange={handleFileChange}
        />
      </div>
    </figure>
  );
}

function isPlayerImageValue(value: unknown): value is PlayerImageValue {
  return typeof value === "object" && value !== null && "kind" in value && (value as PlayerImageValue).kind === "player-image";
}
