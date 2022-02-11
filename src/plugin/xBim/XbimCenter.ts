// @ts-nocheck

import { Viewer, ViewType, State, NavigationCube, RenderingMode } from "@xbim/viewer";
import { vec3 } from "gl-matrix";
import { ClickPanelChecker } from "./plugins/ClickPanelChecker/ClickPanelChecker";
import { Measure } from "./plugins/Measure/Measure";
import { MovingPlane } from "./plugins/MovingPlane/MovingPlane";
import { MouseNavigation } from "./plugins/navigator/mouse-navigation";
import ManagerMark from "./manager/ManagerMark";
import { ProductMap } from "@xbim/viewer/src/common/product-map";
import { TextRender } from "./plugins/TextRender/TextRender";
import { TextRender2 } from "./plugins/TextRender2/TextRender2";
import { BoxTest } from "./plugins/BoxTest/TextRender";
import axios from "axios";
import _ from "lodash"

// 颜色定义
enum COLOR_DEFINED {
  SELECTED = 1, // 高亮颜色
  HIDDEN,
  IN_TRANSPORT = 11, // 运输中
  IN_PRODUCED = 12, // 加工中
  IN_INSTALL = 13, // 安装中
  NOT_PRODUCED = 14, // 未开始
  PRODUCED_COMPLETED = 15, // 加工完成
  INSTALL_COMPLETED = 16, // 安装完成
  TRANSPORT_COMPLETED = 17 // 运输完成
}

export default class XbimCenter {
  lookAt(prodList: { model: number; id: number }[]) {
    this.viewer.zoomTo(prodList);
  }

  action = 0;
  fps = 0;

  // 标记模式
  _flagMarking = false;
  set flagMarking(flag: boolean) {
    this._flagMarking = flag;
    if (flag) {
      this.flagClipping = false;
      this.flagWalking = false;
    }
    this.checkHighlight();
    this.updateMouseMove();
  }
  get flagMarking() {
    return this._flagMarking;
  }
  _flagWalking = false;
  set flagWalking(flag: boolean) {
    if (flag) {
      this.flagMarking = false;
      this.flagClipping = false;
    }
    this._flagWalking = flag;
  }
  get flagWalking() {
    return this._flagWalking;
  }

  // 高亮选中相关
  _flagHighlightSelect = true;
  get flagHighlightSelect() {
    return this._flagHighlightSelect;
  }
  set flagHighlightSelect(flag) {
    this._flagHighlightSelect = flag;
    this.updateSelHighlight();
  }
  checkHighlight() {
    this.flagHighlightSelect =
      !this.flagMeasuring && !this.flagClipping && !this.flagMarking;
  }
  doLookAt(list: any) {
    let modelId = this.selectedData ? this.selectedData.model : 1;
    let listLookAt: any[] = [];
    list.forEach(id => {
      listLookAt.push({
        model: modelId,
        id
      });
    });
    console.log(listLookAt);
    
    this.lookAt(listLookAt);
  }
  hilightedDataList: any = []; // 构件
  selectedChildren: any[] = []; // 零件数组
  ComponentID: Number = null
  state= ""
  // 更新选中高亮
  updateSelHighlight() {
    // console.log(this.hilightedDataList, this.selectedChildren);
    if (!this.stateFlag) {
      // 每次给上次选中的构件加上取消样式
      this.hilightedDataList.forEach((conf: any) => {
        // 每一个上次选中的零件加上取消样式
        // this.viewer.setStyle(State.UNSTYLED, conf.list, conf.model);
        this.viewer.setStyle(State.UNSTYLED, conf.list, conf.model);
      });
      this.hilightedDataList = []
      if (this.selectedData) {
        if (this.flagHighlightSelect) {
          this.viewer.setStyle(
            COLOR_DEFINED.SELECTED,
            this.selectedChildren || [this.selectedData.id],
            this.selectedData.model
          );
          this.hilightedDataList.push({
            list: this.selectedChildren || [this.selectedData.id],
            modal: this.selectedData.model
          });
        } else {
          this.viewer.setStyle(
            State.UNSTYLED,
            [this.selectedData.id],
            this.selectedData.model
          );
        }
      }
    } else {
      console.log('着色' + this.state,this.hilightedDataList);
      
      switch (this.state) {
        case "运输中": {
          this.hilightedDataList.forEach((conf: any) => {
            this.viewer.setStyle(COLOR_DEFINED.IN_TRANSPORT, conf.list, conf.model);
            this.state=''
          });
          break;
        }
        case "加工中": {
          this.hilightedDataList.forEach((conf: any) => {
            this.viewer.setStyle(COLOR_DEFINED.IN_PRODUCED, conf.list, conf.model);
            this.state=''
          });
          break;
        }
        case "安装中": {
          this.hilightedDataList.forEach((conf: any) => {
            this.viewer.setStyle(COLOR_DEFINED.IN_INSTALL, conf.list, conf.model);
            this.state=''
          });
          break;
        }
        case "未开始": {
          this.hilightedDataList.forEach((conf: any) => {
            this.viewer.setStyle(COLOR_DEFINED.NOT_PRODUCED, conf.list, conf.model);
            this.state=''
          });
          break;
        }
        case "加工完成": {
          this.hilightedDataList.forEach((conf: any) => {
            this.viewer.setStyle(COLOR_DEFINED.PRODUCED_COMPLETED, conf.list, conf.model);
            this.state=''
          });
          break;
        }
        case "安装完成": {          
          this.hilightedDataList.forEach((conf: any) => {
            this.viewer.setStyle(COLOR_DEFINED.INSTALL_COMPLETED, conf.list, conf.model);
            this.state=''
          });
          break;
        }
        case "运输完成": {
          this.hilightedDataList.forEach((conf: any) => {
            this.viewer.setStyle(COLOR_DEFINED.TRANSPORT_COMPLETED, conf.list, conf.model);
            this.state=''
          });
          break;
        }
        default: {          
            this.hilightedDataList.forEach((conf: any) => {
              this.viewer.setStyle(State.UNSTYLED, conf.list, conf.model);
            });
        }
        
      }
      // this.hilightedDataList.forEach((conf: any) => {
      //   this.viewer.setStyle(COLOR_DEFINED.COMPLETED, conf.list, conf.model);
      // });
      this.hilightedDataList = []
      if (this.selectedData) {
        if (this.flagHighlightSelect) {          
          this.viewer.setStyle(
            COLOR_DEFINED.SELECTED,
            this.selectedChildren || [this.selectedData.id],
            this.selectedData.model
          );
          this.hilightedDataList.push({
            list: this.selectedChildren || [this.selectedData.id],
            modal: this.selectedData.model
          })
        } else {
          this.viewer.setStyle(
            COLOR_DEFINED.COMPLETED,
            [this.selectedData.id],
            this.selectedData.model
          );
        }
      }
    }
  }
  IN_TRANSPORT_DataList: any = [] // 运输中状态构件数组
  IN_PRODUCED_DataList: any = [] // 加工中状态构件数组
  IN_INSTALL_DataList: any = [] // 安装中状态构件数组
  NOT_PRODUCED_DataList: any = [] // 未开始状态构件数组
  PRODUCED_COMPLETED_DataList: any = [] // 加工完成状态构件数组
  INSTALL_COMPLETED_DataList: any = [] // 安装完成状态构件数组
  TRANSPORT_COMPLETED_DataList: any = [] // 运输完成状态构件数组
  id = ''
  // 状态视图切换
  updateState() {
    this.viewer.setStyle(COLOR_DEFINED.IN_TRANSPORT, this.IN_TRANSPORT_DataList);
    this.viewer.setStyle(COLOR_DEFINED.IN_PRODUCED, this.IN_PRODUCED_DataList);
    this.viewer.setStyle(COLOR_DEFINED.IN_INSTALL, this.IN_INSTALL_DataList);
    this.viewer.setStyle(COLOR_DEFINED.NOT_PRODUCED, this.NOT_PRODUCED_DataList);
    this.viewer.setStyle(COLOR_DEFINED.PRODUCED_COMPLETED, this.PRODUCED_COMPLETED_DataList);
    this.viewer.setStyle(COLOR_DEFINED.INSTALL_COMPLETED, this.INSTALL_COMPLETED_DataList);
    this.viewer.setStyle(COLOR_DEFINED.TRANSPORT_COMPLETED, this.TRANSPORT_COMPLETED_DataList);
    // this.viewer.setState(252, this.NOT_PRODUCED_DataList);
    // this.viewer.setState(252, this.IN_PRODUCED_DataList);
    // this.viewer.setState(252, this.IN_TRANSPORT_DataList);
    // this.viewer.setState(252, this.IN_INSTALL_DataList);
    // this.viewer.setState(252, this.COMPLETED_DataList);
  }
  resetState() {
    // 重置为其默认样式
    this.viewer.resetStyles()
  }
  //  测距模式相关
  _flagMeasuring = false;
  get flagMeasuring() {
    return this._flagMeasuring;
  }
  set flagMeasuring(flag) {
    if (flag) {
      // 关闭会冲突的模式
    } else {
      this.clearMeasure();
    }
    this._flagMeasuring = flag;
    this.checkHighlight();
  }

  currentPoint = [-1, -1, -1];

  _selectedData?: { model: number; id: number };
  get selectedData() {
    return this._selectedData;
  }
  set selectedData(data: { model: number; id: number } | undefined) {
    this._selectedData = data;

    if (this.selectedData) {
      this.selectedChildren = [this.selectedData.id];
    }
  }
  // 待重写
  onUpdateSel(data: any) {}
  /**
   * 待重写的方法
   */
  selectedHandler(id: number, model: number) {}

  /**
   *内部数据
   */
  viewer!: Viewer;
  models: any[] = [];
  Frequency = null // 是否点击标识（定时器编号）
  stateFlag = false
  fid: "" // 文件id
  token = ""
  newDataTree: any[] = []
  stateTree: any[] = []
  /**
   *初始化用的方法
   */
  pannelClickChecker!: ClickPanelChecker;
  measure!: Measure;

  lastClickId = -1;

  ctrMarking!: ManagerMark;
  init(canvas: any) {
    this.viewer = new Viewer(canvas);

    this.ctrMarking = new ManagerMark(this.viewer, this);

    this.definedColor();
    // 背景色RGBA
    this.viewer.background = [255, 255, 255];
    // this.viewer.hoverPickEnabled = true;
    this.pannelClickChecker = new ClickPanelChecker();
    this.viewer.addPlugin(this.pannelClickChecker);

    this.measure = new Measure();
    this.measure.init(this.viewer);
    this.viewer.addPlugin(this.measure);

    this.listen();
    // 导航盒
    var cube = new NavigationCube();
    cube.ratio = 0.1;
    cube.passiveAlpha = 1.2
    cube.activeAlpha = 1.0;
    cube.highlighting = 2
    cube.minSize = 100;
    this.viewer.addPlugin(cube);
    // let txt = new BoxTest(this.viewer);
    // txt.renderText("asdsadadsadad");
    // this.viewer.addPlugin(txt);
  }
  lastPickArg!: any;
  constructor() {}
  scrollFunc(event: WheelEvent) {
    if (event.stopPropagation) {
      event.stopPropagation();
    }
    if (event.preventDefault) {
      event.preventDefault();
    }

    let selClipping = this.clippingPlanes.find(
      (plane: any) => plane.plugin.flagSelected
    );
    if (selClipping) {
      let prgNew = selClipping.plugin.lastPrg + event.deltaY * 0.01;
      this.lastPrg = prgNew;
      selClipping.plugin.doMoveByPrg(prgNew);
    } else {
    }
  }
  listen() {
    this.viewer.canvas.addEventListener(
      "wheel",
      e => {
        this.scrollFunc(e);
      },
      true
    );

    this.viewer.on("error", arg => {
      var container = this.viewer.canvas.parentNode as HTMLElement;
      if (container) {
        //preppend error report
        container.innerHTML =
          "<pre style='color:red;'>" +
          arg.message +
          "</pre>" +
          container.innerHTML;
      }
    });

    let lastMousePos: any = null;

    MouseNavigation.initMouseEvents(this.viewer);

    // MouseNavigation.onMouseMove1 = (x: number, y: number, origin: any) => {
    //   // return;
    //   if (!this.flagMouseDownClip || !this.showClipping) {
    //     return;
    //   }
    //   let selPlane = this.clippingPlanes.find(
    //     c => c.plugin.id == this.selectedClipPlane
    //   );
    //   if (selPlane) {
    //     selPlane.plugin.doMove1(x, y, origin);
    //   }
    // };
    // MouseNavigation.onMouseMove = (
    //   deltaX: number,
    //   deltaY: number,
    //   origin: any
    // ) => {
    //   return;
    //   if (!this.flagMouseDownClip || !this.showClipping) {
    //     return;
    //   }
    //   let selPlane = this.clippingPlanes.find(
    //     c => c.plugin.id == this.selectedClipPlane
    //   );
    //   if (selPlane) {
    //     selPlane.plugin.doMove(deltaX, deltaY, origin);
    //   }
    // };

    this.viewer.on("pick", arg => {
      let wcs = this.viewer.getCurrentWcs();
      let evt: any = arg.event;
      if (lastMousePos) {
        let offX = evt.clientX - lastMousePos.x;
        let offY = evt.clientX - lastMousePos.x;
      }
      lastMousePos = evt;
    });
    // 单击
    this.viewer.on("pick", arg => {
      if (this.Frequency) { // 取消上次未执行完的方法
        this.Frequency = clearInterval(this.Frequency)
      }
      this.Frequency =setTimeout(() => { // 定时器事件
        // this.viewer.stopPicking(arg.id)
        // this.id = arg.id
        // let id = this.viewer.getStyle(arg.id)
        // console.log(this.viewer.isProductInModel(arg.id,arg.model));
        this.lastPickArg = arg;
        let wcs = this.viewer.getCurrentWcs();
        if (arg.xyz) {
          this.handlePick(arg);
          if (this.stateFlag) {            
            this.newDataTree.forEach(item => {
              if (item.parts.includes(String(arg.id))) {
                _.forIn(this.stateTree, (value, key) => {                  
                  if (value.includes(item.id)) {
                    console.log(key);
                    this.state = key
                    return false
                  }
                })
              }
            })
          }
          // this.textRender.drawCube()
          this.viewer.draw();
          let point = vec3.add(vec3.create(), wcs, arg.xyz);
          this.onUpdateSel(Object.assign({ fromModelClick: true }, this.selectedData));
        }
        this.flagCreateNew = false;
      },300)
    });
    // 双击
    this.viewer.on("dblclick", (arg) => {
      if (this.Frequency) { // 取消上次未执行完的方法
        this.Frequency = clearInterval(this.Frequency)
      }
      if (arg.id) {
        // let prodId = arg.id;
        // let modelId = arg.model;
        // this.selectedData = {
        //   id: prodId,
        //   model: modelId
        // };
        this.lookAt([arg]);
        // this.updateSelHighlight()
      }
      // viewer.addState(State.HIDDEN, [arg.id], arg.model);
  });
    this.viewer.on("fps", fps => {
      this.fps = fps;
    });
    this.viewer.on("mouseup", e => {
      this.flagMouseDownClip = false;
    });
    this.viewer.on("mousedown", arg => {
      this.flagMouseDownClip = true;
      this.selectedClipPlane = 0;
      this.clippingPlanes.forEach(conf => {
        let selId = conf.plugin.checkSelMian(arg.event);
        if (selId) {
          this.selectedClipPlane = selId;
        }
      });
      this.flagRotate = false;
    });
  }
  // 定义颜色样式最多224个 将索引值传递给setState就能改变外观样式
  definedColor() {
    this.viewer.defineStyle(COLOR_DEFINED.SELECTED, [0, 255, 0, 170]);
    this.viewer.defineStyle(COLOR_DEFINED.HIDDEN, [0, 255, 0, 0]);
    this.viewer.defineStyle(COLOR_DEFINED.IN_TRANSPORT, [245,36,67, 255]); // 运输中
    this.viewer.defineStyle(COLOR_DEFINED.IN_PRODUCED, [240,131,0, 255]); // 加工中
    this.viewer.defineStyle(COLOR_DEFINED.IN_INSTALL, [255,255,36, 255]); // 安装中
    this.viewer.defineStyle(COLOR_DEFINED.NOT_PRODUCED, [2,179,64, 255]); // 未开始
    this.viewer.defineStyle(COLOR_DEFINED.PRODUCED_COMPLETED, [121,210,210, 255]); // 加工完成
    this.viewer.defineStyle(COLOR_DEFINED.INSTALL_COMPLETED, [46,98,205, 255]); // 安装完成
    this.viewer.defineStyle(COLOR_DEFINED.TRANSPORT_COMPLETED, [204,153,255, 255]); // 运输完成
  }
  clearMeasure() {
    this.measure.points = [];
    this.measure.stopped = true;
    this.measure.clearAll();
    this.measure.doDraw();
  }
  handlePick(arg: any) {
    let wcs = this.viewer.getCurrentWcs();
    let point = vec3.add(vec3.create(), wcs, arg.xyz);
    let prodId = arg.id;
    let modelId = arg.model;
    let pos = [point[0], point[1], point[2]];

    if (this.flagMeasuring) {
      if (prodId && modelId) {
        this.measure.stopped = false;
        this.measure.points.push(pos);
        this.measure.doDraw();
        return;
      }
    }
    if (this.flagClipping) {
      this.createClippingPlane(arg);
      return;
    }
    if (this.flagMarking) {
      return;
    }

    this.currentPoint = pos;
    if (this.selectedData && this.selectedData.id == prodId) {
      this.resetSelected();
    } else {
      this.selectedData = {
        id: prodId,
        model: modelId
      };
    }

    // let bbox=this.viewer.activeHandles[0]._model['productMaps'][prodId]

    this.updateSelHighlight();
  }

  /**
   *实用方法
   */
  changeSelected(id: number, model: number) {
    this.selectedHandler && this.selectedHandler(id, model);
    this.selectedData = { id, model };
  }
  walk(dir: number, timeOffset: number) {
    if (!this.flagWalking) {
      return;
    }
    let x = 0;
    let y = 0;
    let offset = timeOffset / 5;
    if (dir == 1) {
      y += offset * 2;
    }
    if (dir == 2) {
      x -= offset;
    }
    if (dir == 3) {
      y -= offset * 2;
    }
    if (dir == 4) {
      x += offset;
    }
    if (y != 0) {
      this.viewer.navigate("walk", x, y, vec3.fromValues(0, 0, 0));
    } else if (x != 0) {
      this.viewer.navigate("pan", x, y, vec3.fromValues(0, 0, 0));
    }
  }
  // 只显示选中的元素
  showAllItems(model: number) {
    this.viewer.setState(State.UNSTYLED, this.listHidden, model);
    this.listHidden = [];
  }
  listHidden: any[] = [];
  // 只显示选中的元素
  hideItems(prodList: number[], model: number) {
    // this.viewer.isolate(prodList, model);
    this.showAllItems(model);
    this.listHidden = this.listHidden.concat(prodList);
    this.viewer.setState(State.HIDDEN, prodList, model);
  }
  resetSelected() {
    this.selectedData = undefined;
  }
  async loadViewAsync(url: string) {
    this.viewer.load(url, undefined, undefined, e => {});
  }
  // 加载wexbim文件
  loadView(file: any, loadCall?: any) {
    // console.log(file, file.name);
    this.viewer.load(file, file.name);
    this.viewer.xrayColour = [245, 0, 0, 20]
    // this.viewer.renderingMode = RenderingMode.XRAY
    let funcFinish = (evt: any) => {
      this.models.push({ id: evt.model, name: evt.tag, stopped: false });
      this.viewer.show(ViewType.DEFAULT, undefined, undefined, false);
      loadCall && loadCall(evt);
      this.viewer.off("loaded", funcFinish);
      this.viewer.start(evt.model);
      // console.log(this.viewer.getModelState(evt.model));      
    };
    this.viewer.on("loaded", funcFinish);
  }

  unload(id: number) {
    this.viewer.unload(id);
    this.models = this.models.filter(m => m.id !== id);
    this.viewer.draw();
  }
  stop(id: number) {
    this.viewer.stop(id);
    var model = this.models.filter(m => m.id === id).pop();
    model.stopped = true;
  }

  start(id: number) {
    this.viewer.start(id);
    var model = this.models.filter(m => m.id === id).pop();
    model.stopped = false;
  }

  // 裁切相关部分
  updateMouseMove() {
    let flag = this.selectedClipPlane || this.flagMarking;
    this.toggleMouseMove(!flag);
    return flag;
  }
  _flagMouseDownClip = false;
  get flagMouseDownClip() {
    return this._flagMouseDownClip;
  }
  set flagMouseDownClip(flag: boolean) {
    this._flagMouseDownClip = flag;
    this.updateMouseMove();
  }
  _showClipping = true;
  set showClipping(flag: boolean) {
    this._showClipping = flag;
    this.clippingPlanes.forEach((conf: any) => {
      conf.plugin.stopped = !flag;
    });
  }
  get showClipping() {
    return this._showClipping;
  }
  moveClippingplane(prg: number) {
    let selClipping = this.clippingPlanes.find(
      (plane: any) => plane.plugin.flagSelected
    );
    if (selClipping) {
      selClipping.plugin.doMoveByPrg(prg);
    } else {
    }
  }

  flagClippingCreating = false;
  _flagClipping = false;
  set flagClipping(flag) {
    if (flag) {
      // 关闭会冲突的模式
      this.flagWalking = false;
      this.flagMarking = false;
    } else {
      this.toggleClipping(false);
    }
    this._flagClipping = flag;
    this.checkHighlight();
  }
  get flagClipping() {
    return this._flagClipping;
  }

  flagCreateNew = false;
  flagClip = false;

  clippingId = "A";
  toggleClipping(flag = true) {
    if (!flag) {
      this.resetClipBox();
    }
  }

  _selectedClipPlane!: any;
  get selectedClipPlane() {
    return this._selectedClipPlane;
  }
  set selectedClipPlane(arg: any) {
    console.log(arg, "arg");

    this._selectedClipPlane = arg;
    this.clippingPlanes.forEach(conf => {
      let plugin = conf.plugin;
      plugin.stopped = true;
      plugin.toggleSelected(plugin.id == this.selectedClipPlane);
      if (this.showClipping) {
        plugin.stopped = false;
      }
    });

    this.changeClippingPrg = false;
    let selPlane = this.clippingPlanes.find(
      c => c.plugin.id == this.selectedClipPlane
    );
    if (selPlane) {
      this.changeClippingPrg = true;
      this.lastPrg = selPlane.plugin.lastPrg;
    }
    this.updateMouseMove();
  }

  changeClippingPrg = false;
  lastPrg = 50;

  clippingPlanes: any[] = [];
  createClippingPlane(arg: any) {
    if (!this.flagCreateNew) {
      return;
    }
    let prodId = arg.id;
    let modelId = arg.model;

    // 计算方向
    let box = this.viewer.getProductBoundingBox(prodId, modelId);
    this.createClipBox(box);
  }

  createClipBox(box: any) {
    if (this.clippingPlanes.length >= 2) {
      return;
    }
    let panelId = this.clippingPlanes.length;
    let panel = this.pannelClickChecker.getClickPanel(
      box,
      this.lastPickArg.event
    );
    let ffDrawClip = () => {
      let arrFrom = panel.faxian[0];
      let arrTo = panel.faxian[1];
      let vec = vec3.fromValues(
        arrTo[0] - arrFrom[0],
        arrTo[1] - arrFrom[1],
        arrTo[2] - arrFrom[2]
      );
      // 标准化成方向向量
      vec3.normalize(vec, vec);
      let planeClip = this.getPanel(panel.faxian[0], [vec[0], vec[1], vec[2]]);
      if (panelId == 0) {
        this.viewer.unclip();
        this.viewer.setClippingPlaneA(planeClip);
      } else {
        this.viewer.setClippingPlaneB(planeClip);
      }
    };
    ffDrawClip();
    let plugin = new MovingPlane();
    this.viewer.addPlugin(plugin);
    plugin.pointes = panel.plane1;
    plugin.faxian = panel.faxian;
    plugin.pointesBack = JSON.parse(JSON.stringify(panel.plane1));
    plugin.dirId = panel.id;
    plugin.doDraw();
    plugin.doOnChangePos = (point: number[], dir: number[][]) => {
      let arrFrom = dir[0];
      let arrTo = dir[1];
      let vec = vec3.fromValues(
        arrTo[0] - arrFrom[0],
        arrTo[1] - arrFrom[1],
        arrTo[2] - arrFrom[2]
      );
      // 标准化成方向向量
      vec3.normalize(vec, vec);
      let planeClip = this.getPanel(dir[0], [vec[0], vec[1], vec[2]]);
      if (panelId == 0) {
        this.viewer.unclip();
        this.viewer.setClippingPlaneA(planeClip);
      } else {
        this.viewer.setClippingPlaneB(planeClip);
      }
    };
    let planeObj = {
      plugin,
      clipId: panelId
    };
    plugin.id = 1000 + planeObj.clipId;
    this.clippingPlanes.push(planeObj);
    // this.selectedClipPlane = plugin.id;
  }
  cancelSelClipPlane() {
    this.selectedClipPlane = null;
  }

  toggleMouseMove(flag: boolean) {
    this.viewer.navigationMode = flag ? "orbit" : "none";
  }
  getPanel(point: number[], normal: number[]) {
    var d =
      0.0 - normal[0] * point[0] - normal[1] * point[1] - normal[2] * point[2];
    return [normal[0], normal[1], normal[2], d];
  }
  resetClipBox() {
    this.clippingPlanes.forEach(conf => {
      conf.plugin.beforeDestroy && conf.plugin.beforeDestroy();
      this.viewer.removePlugin(conf.plugin);
    });
    this.clippingPlanes = [];
    this.selectedClipPlane = null;
    this.viewer.unclip();
  }
  // 旋转相关
  _flagRotate = false;
  set flagRotate(flag: boolean) {
    this._flagRotate = flag;
    if (flag) {
      this.viewer.startRotation();
    } else {
      this.viewer.stopRotation();
    }
  }
  get flagRotate() {
    return this._flagRotate;
  }
}
