<template>
  <div class="wrap-tree noselect">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>目录树</span>
          <!-- <el-button class="button" type="text">操作按钮</el-button> -->
        </div>
      </template>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-input clearable @change="doSearch" v-model="searchKey" placeholder="请输入关键字搜索"></el-input>
        </el-col>
        <el-col :span="12">
          <el-select @change="onChangeTag" v-model="searchTag" placeholder="请选择显示条件">
            <el-option
              v-for="item in showOpts"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            ></el-option>
          </el-select>
        </el-col>
      </el-row>

      <!-- <el-row class="mgTop8">
        <el-col :span="6">
          <el-button @click="toggleAll(false)">隐藏选中</el-button>
        </el-col>
        <el-col :span="6">
          <el-button @click="toggleAll(true)">显示选中</el-button>
        </el-col>
      </el-row> -->
      <slot></slot>
      <el-scrollbar max-height="500px">
        <el-tree
          :show-checkbox="true"
          accordion
          class="filter-tree mgTop8"
          :data="listShow"
          :props="defaultProps"
          ref="tree"
          node-key="id"
          :filter-node-method="filterNode"
          @node-click="onSingleClick"
        >
          <template #default="{ node, data }">
            <div
              class="custom-tree-node"
              @dblclick.stop.prevent="onDbClick(data)"
            >
              <!-- <span>{{data}}</span> -->
              <span>{{ data.groupName||data.mark||data[searchTag] }}</span>
              <span>
                <i
                  @click.stop="() => toggleHidden(data,node)"
                  :class="`icon icon-ic_${checkHidden(data)?'invisible':'visible'}`"
                ></i>
              </span>
            </div>
          </template>
        </el-tree>
      </el-scrollbar>
    </el-card>
  </div>
</template>

<script lang="ts">
import axios from "axios";
import { Options, Vue } from "vue-class-component";
@Options({
  watch: {
    treeList() {
      // console.log("watch");
      this.updateData();
    },
    displayflag() {
      this.toggleAll(this.displayflag)
    }
  },
  props: {
    treeList: {
      type: Array,
      default() {
        return [];
      }
    },
    displayflag: {
      type: Boolean,
      default: null
    }
  },
  computed: {
    selectedIds() {
      return (this as any).$refs.tree
        .getCheckedNodes(true)
        .map((item: any) => item.id);
    }
  }
})
export default class Tree extends Vue {
  timerClick!: any;
  delayClick = 300;
  // 触发单击
  onSingleClick(data: any) {
    clearTimeout(this.timerClick); // 清除第一个单击事件
    this.timerClick = setTimeout(() => {
      console.log("触发单击", data);
      this.doSelPord(data);
    }, this.delayClick);
  }
  // 触发双击
  onDbClick(data: any) {
    clearTimeout(this.timerClick); // 清除第一个单击事件
    if (data.parts) {
      console.log("触发lookat", data);
      this.doLookAt(data.parts.split(","));
    }
  }
  filterNode(value: any, data: any) {
    return !data.isProd && ("" + data[this.searchTag]).indexOf(value) > -1;
  }
  checkHidden(data: any) {
    let listParts = this.getProdId(data);
    return listParts.every((e: any) => e.hidden);
  }
  doLookAt(list: any) {
    this.$emit("doLookAt", list);
  }
  getProdId(data: any) {
    let listProd: any = [];
    if (data.children) {
      data.children.forEach((sub1: any) => {
        listProd = listProd.concat(this.getProdId(sub1));
      });
    } else {
      listProd = listProd.concat([data]);
    }
    return listProd;
  }
  doSelPord(data: any) {
    // let listParts = this.getProdId(data);

    // let parId = listParts[0].parId;

    if (data.groupName) {
      this.$emit("getDetailInfo", {});
    } else {
      console.log(222, data);
      this.$emit("getDetailInfo", data);
      this.$emit("selInModel", data.parts.split(","), data.id);
    }
  }
  mounted() {
    this.updateData();
  }
  showOpts = [
    {
      label: "typeName",
      value: "typeName"
    },
    {
      label: "name",
      value: "name"
    },
    {
      label: "width",
      value: "width"
    },
    {
      label: "mark",
      value: "mark"
    },
    {
      label: "unitWeight",
      value: "unitWeight"
    },
    {
      label: "bottomElevation",
      value: "bottomElevation"
    },
    {
      label: "id",
      value: "id"
    }
  ];
  treeList!: any[];
  listShow: Object[] = [];
  searchTag = "name";
  searchKey = "";
  defaultProps = {
    children: "children",
    label: "name"
  };
  onChangeTag() {
    this.searchKey = "";
    this.doSearch();
  }
  updateVisible() {
    let listWillHide: any[] = [];
    let listParts = this.getProdId({ children: this.listShow });
    this.listShow.forEach((itemGroup: any) => {
      itemGroup.children.forEach((item: any) => {
        if (item.hidden) {
          item.parts.split(",").forEach((id: string) => {
            listWillHide.push(+id);
          });
        }
      });
    });
    this.$emit("hideItems", listWillHide);
  }
  toggleAll(flag: boolean) {
    let list = (this as any).$refs.tree.getCheckedNodes(true);
    list.forEach((element: any) => {
      let node = (this as any).$refs.tree.getNode(element.id);
      node.data.hidden = !flag;
    });
    this.updateVisible();
  }
  toggleHidden(data: any, node?: any) {
    data.hidden = !data.hidden;
    let listParts = this.getProdId(data);
    listParts.forEach((confPart: any) => {
      confPart.hidden = data.hidden;
    });
    this.updateVisible();
  }
  doSearch() {
    this.updateData();
  }
  listParts!: any[];
  updateData() {
    let listShow: any[] = [];
    let listChildren: any[] = [];
    // 分组
    let objGroup = {};
    this.listParts = [];
    this.treeList.forEach(itemModel => {
      itemModel.children.forEach((itemSub: any) => {
        let itemGroup = listShow.find(
          (e: any) => e.groupName == itemSub[this.searchTag]
        );
        if (!itemGroup) {
          itemGroup = {
            groupName: itemSub[this.searchTag],
            children: [],
            isGroup: true
          };
          listShow.push(itemGroup);
        }
        itemGroup.children.push(itemSub);
        this.listParts.push(itemSub);
      });
    });

    this.listShow = listShow;

    this.$nextTick(() => {
      (this as any).$refs.tree.filter(this.searchKey);
    });
  }
}
</script>




