
// 为组件提供 install 安装方法，供按需引入
import PluginTest from "./xBim.vue";
PluginTest.install = (Vue) => Vue.component(PluginTest.name, PluginTest);
export default PluginTest;
