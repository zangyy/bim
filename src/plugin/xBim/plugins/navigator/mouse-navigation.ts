import { Viewer } from "@xbim/viewer";
import { ProductIdentity } from "@xbim/viewer/src/common/product-identity";
import { vec3, mat4, quat, vec2 } from "gl-matrix";

export class MouseNavigation {
  static onMouseMove1(x: number, y: number, origin: any) {}
  static onMouseMove(deltaX: number, deltaY: number, origin: any) {}
  public static initMouseEvents(viewer: Viewer) {
    let mouseDown = false;
    let lastMouseX: any = null;
    let lastMouseY: any = null;
    let startX: any = null;
    let startY: any = null;
    let button = "L";
    let id = -1;
    let modelId = -1;
    let xyz: any = null;
    let isPointerLocked = false;

    let origin = vec3.create();

    //set initial conditions so that different gestures can be identified
    const handleMouseDown = (event: MouseEvent) => {
      mouseDown = true;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      startX = event.clientX;
      startY = event.clientY;

      //get coordinates within canvas (with the right orientation)
      let r = viewer.canvas.getBoundingClientRect();
      let viewX = startX - r.left;
      let viewY = viewer.height - (startY - r.top);

      //this is for picking
      const data = viewer.getEventData(viewX, viewY);
      if (data == null) {
        mouseDown = false;
        return;
      }

      id = data.id;
      modelId = data.model;
      xyz = data.xyz;

      if (data == null || data.id == null || data.model == null) {
        const region = viewer.getMergedRegion();
        if (region == null || region.centre == null) {
          // there is nothing in the viewer
          mouseDown = false;
          return;
        }
        origin = vec3.fromValues(
          region.centre[0],
          region.centre[1],
          region.centre[2]
        );
      } else if (data.xyz == null) {
        const bb = viewer.getTargetBoundingBox(data.id, data.model);
        origin = vec3.fromValues(
          bb[0] + bb[3] / 2.0,
          bb[1] + bb[4] / 2.0,
          bb[2] + bb[5] / 2.0
        );
      } else {
        origin = data.xyz;
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (!mouseDown) return;

      mouseDown = false;
    };

    var handleLookAround = (event: MouseEvent) => {
      const sensitivity = 0.5;
      if (viewer.navigationMode !== "walk") {
        return;
      }

      viewer.navigate(
        "look-at",
        event.movementX * sensitivity,
        event.movementY * sensitivity,
        origin
      );
    };

    var handleMouseMove = (event: MouseEvent) => {
      var newX = event.clientX;
      var newY = event.clientY;

      var deltaX = newX - lastMouseX;
      var deltaY = newY - lastMouseY;

      lastMouseX = newX;
      lastMouseY = newY;

      this.onMouseMove(deltaX, deltaY, origin);
      this.onMouseMove1(newX, newY, origin);
    };

    //attach callbacks
    viewer.canvas.addEventListener(
      "mousedown",
      event => handleMouseDown(event),
      true
    );
    window.addEventListener("mouseup", event => handleMouseUp(event), true);
    window.addEventListener("mousemove", event => handleMouseMove(event), true);
  }
}
