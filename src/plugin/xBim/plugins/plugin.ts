import { Viewer } from "@xbim/viewer";
import { ProductIdentity } from "@xbim/viewer/src/common/product-identity";

export interface IPlugin {
  init(viewer: Viewer): void;

  onBeforeDraw(width: number, height: number): void;
  onAfterDraw(width: number, height: number): void;

  onBeforeDrawId(): void;
  onAfterDrawId(): void;
  onAfterDrawModelId(): void;
}
