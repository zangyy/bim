import { Viewer } from "@xbim/viewer";
import { ClickPanelChecker } from "../plugins/ClickPanelChecker/ClickPanelChecker";
import XbimCenter from "../XbimCenter";
import { vec3 } from "gl-matrix";
import { MovingPlane } from "../plugins/MovingPlane/MovingPlane";
import { LinesDrawer } from "../plugins/LinesDrawer/LinesDrawer";

export default class ManagerMark {
  linesDrawer: LinesDrawer[] = [];
  hintTouchingPlane: MovingPlane;
  parent!: XbimCenter;
  viewer!: Viewer;
  clickChecker!: ClickPanelChecker;

  throttle(fn: any, wait = 100) {
    var pre = Date.now();
    let func = function(arg: any) {
      var args: any = arguments;
      var now = Date.now();
      if (now - pre >= wait) {
        fn.apply(ManagerMark, args);
        pre = Date.now();
      }
    };
    return func;
  }
  constructor(viewer: Viewer, parent: XbimCenter) {
    this.parent = parent;
    this.viewer = viewer;
    this.clickChecker = new ClickPanelChecker();
    this.viewer.addPlugin(this.clickChecker);

    this.hintTouchingPlane = new MovingPlane();
    this.hintTouchingPlane.stopped = true;
    this.viewer.addPlugin(this.hintTouchingPlane);

    let lastPos: any = null;
    let lastXYZ: vec3;
    let lastLineDrawer!: LinesDrawer | undefined;

    let funcDraw = this.throttle((xyz: any) => {
      if (lastLineDrawer) {
        lastLineDrawer.pointes.push(xyz);
        lastLineDrawer.doDraw();
      }
    }, 30);

    this.viewer.on("mousedown", arg => {
      let event: any = arg.event;
      lastPos = [event.clientX, event.clientY];
      if (arg.xyz) {
        lastXYZ = arg.xyz;

        lastLineDrawer = new LinesDrawer();
        this.viewer.addPlugin(lastLineDrawer);
        this.linesDrawer.push(lastLineDrawer);
        lastLineDrawer.pointes = [];
        funcDraw(arg.xyz);
      }
    });

    let flagDraw = false;
    this.viewer.on("mousemove", arg => {
      if (!this.parent.flagMarking) {
        return;
      }
      let event: any = arg.event;

      if (lastPos) {
        // let offset = [event.clientX - lastPos[0], event.clientY - lastPos[1]];
        // lastPos = [event.clientX, event.clientY];
        // // lastXYZ[0] += offset[0] * 1000;
        // // lastXYZ[1] += offset[1] * 1000;
        // console.log(lastXYZ, "lastXYZlastXYZlastXYZlastXYZ");
        // funcDraw(lastXYZ);
      }

      if (arg.xyz) {
        funcDraw(arg.xyz);
        flagDraw = true;
        // 有接触到模型
        let prodId = arg.id;
        let modelId = arg.model;

        let len = 500;

        // 计算方向
        let box = this.viewer.getProductBoundingBox(prodId, modelId);
        let panel = this.clickChecker.getClickPanel(box, arg.event);
        if (!panel) {
          return;
        }
        // this.hintTouchingPlane.stopped = false;
        let [A, B, C, D] = panel.plane;

        // let plane=
        // 根据法线，画一个小方块，标记当前选中的面
        let vecA = vec3.fromValues(A[0], A[1], A[2]);
        let vecB = vec3.fromValues(B[0], B[1], B[2]);
        let vecC = vec3.fromValues(C[0], C[1], C[2]);
        let vecD = vec3.fromValues(D[0], D[1], D[2]);

        let vecAB = vec3.create();
        vec3.subtract(vecAB, vecA, vecB);
        vec3.normalize(vecAB, vecAB);
        vec3.scale(vecAB, vecAB, len);

        let vecCD = vec3.create();
        vec3.subtract(vecCD, vecC, vecD);
        vec3.normalize(vecCD, vecCD);
        vec3.scale(vecCD, vecCD, len);

        let vecAC = vec3.create();
        vec3.subtract(vecAC, vecA, vecC);
        vec3.normalize(vecAC, vecAC);
        vec3.scale(vecAC, vecAC, len);

        let xyz = arg.xyz;

        let A1 = vec3.create();
        let B1 = vec3.create();
        let C1 = vec3.create();
        let D1 = vec3.create();
        vec3.add(A1, xyz, vecAB);
        vec3.subtract(B1, xyz, vecAB);
        vec3.add(C1, xyz, vecAC);
        vec3.subtract(D1, xyz, vecAC);

        this.hintTouchingPlane.pointes = [A1, C1, D1, B1];
        this.hintTouchingPlane.dirId = panel.id;

        this.hintTouchingPlane.doDraw();
      }
    });

    this.viewer.on("mouseup", arg => {
      lastLineDrawer = undefined;
      if (!this.parent.flagMarking) {
        return;
      }
      if (!flagDraw) {
        alert("起始点必须在某个面上");
      }
    });
  }

  clearAll() {
    this.linesDrawer.forEach((drawer: LinesDrawer) => {
      drawer.stopped = true;
      drawer.pointes = [];
      drawer.stopped = false;
      drawer.doDraw();
    });
  }
  getTouchPoint() {}
  getGridData() {
    // let len
  }
}
