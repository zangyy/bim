// @ts-nocheck
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

import ElementPlus from "element-plus";
import "element-ui/lib/theme-chalk/index.css";

// import PluginTest from "./plugin/xBim/index.js";

createApp(App, {})
  .use(store)
  .use(router)
  // .use(PluginTest)
  .use(ElementPlus)
  .mount("#app");
