import type { ReactElement } from "react";
import type { SheetModule, SystemPackage } from "../domain/systemPackage";
import { CheckboxResourceModule } from "./CheckboxResourceModule";
import { CountableResourceModule } from "./CountableResourceModule";
import { FreeTextModule } from "./FreeTextModule";
import { ImageFieldModule } from "./ImageFieldModule";
import { LongTextModule } from "./LongTextModule";
import { ReadOnlyDisplayModule } from "./ReadOnlyDisplayModule";

interface ModuleRendererProps<TModule extends SheetModule> {
  module: TModule;
  systemPackage: SystemPackage;
}

type ModuleRenderer<TModule extends SheetModule> = (props: ModuleRendererProps<TModule>) => ReactElement;

type ModuleRegistry = {
  [TModule in SheetModule as TModule["类型"]]: ModuleRenderer<TModule>;
};

export const moduleRegistry: ModuleRegistry = {
  freeText: FreeTextModule,
  longText: LongTextModule,
  checkboxResource: CheckboxResourceModule,
  countableResource: CountableResourceModule,
  readOnlyDisplay: ReadOnlyDisplayModule,
  imageField: ImageFieldModule,
};

export function RenderSheetModule({ module, systemPackage }: { module: SheetModule; systemPackage: SystemPackage }) {
  const Renderer = moduleRegistry[module.类型] as ModuleRenderer<SheetModule>;
  return <Renderer module={module} systemPackage={systemPackage} />;
}
