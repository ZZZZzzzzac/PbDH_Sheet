import { useState } from "react";
import type { ReadOnlyDisplayModule as ReadOnlyDisplayModuleConfig } from "../domain/systemPackage";
import { useRuntimeStore } from "../store/runtimeStore";

interface ReadOnlyDisplayModuleProps {
  module: ReadOnlyDisplayModuleConfig;
}

export function ReadOnlyDisplayModule({ module }: ReadOnlyDisplayModuleProps) {
  const [failed, setFailed] = useState(false);
  const assetUrl = useRuntimeStore((state) => (module.资源ID ? state.packageAssetUrls[module.资源ID] : undefined));
  const altText = module.替代文本 ?? module.标签;

  return (
    <article className="container container-stack" data-module-id={module.ID} data-module-type={module.类型}>
      <h3 className="label">{module.标签}</h3>
      {module.内容 ? <p className="value display-text">{module.内容}</p> : null}
      {module.资源ID ? (
        assetUrl && !failed ? (
          <img className="value image-preview" src={assetUrl} alt={altText} onError={() => setFailed(true)} />
        ) : (
          <div className="image-fallback" role="img" aria-label={altText}>
            图片不可用
          </div>
        )
      ) : null}
    </article>
  );
}
