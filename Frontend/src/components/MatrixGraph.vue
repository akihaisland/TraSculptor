<script setup lang="ts">
import '@/assets/historgram_content.css'
import { useNetworksData } from '@/stores/networkData'
import { computed } from 'vue'

interface rgbColorObj {
  r: number
  g: number
  b: number
  a: number
}

// encode val to color
function rgb_color_obj_transition(std_val: number, colors_transition: rgbColorObj[]) {
  let color_domain_idx = 0

  // compute the color
  const domain_size = colors_transition.length - 1
  for (let i = 1; i <= domain_size; i++) {
    if (std_val < i / domain_size) break
    else color_domain_idx += 1
  }
  if (color_domain_idx >= domain_size) color_domain_idx = domain_size - 1

  // color in area
  let domain_std_val = (std_val - color_domain_idx / domain_size) * domain_size
  if (domain_std_val < 0) domain_std_val = 0
  else if (domain_std_val > 1) domain_std_val = 1

  const cid = color_domain_idx
  let color_projection = {
    r:
      colors_transition[cid].r +
      (colors_transition[cid + 1].r - colors_transition[cid].r) * domain_std_val,
    g:
      colors_transition[cid].g +
      (colors_transition[cid + 1].g - colors_transition[cid].g) * domain_std_val,
    b:
      colors_transition[cid].b +
      (colors_transition[cid + 1].b - colors_transition[cid].b) * domain_std_val,
    a:
      colors_transition[cid].a +
      (colors_transition[cid + 1].a - colors_transition[cid].a) * domain_std_val
  }

  return color_projection
}


const props = defineProps({
  network_idx: {
    type: Number,
    default: 0
  },
  show_link_idx: {
    type: Number,
    default: 0
  }
})
const networkData = useNetworksData()
const compute_attr_shape = computed(() => {
  const tf_ratio_scope = networkData.historgram_data.graph_scope[6]
  const speed_scope = networkData.historgram_data.graph_scope[2]
  const network_link_idx =
    networkData.sel_links_networks_idx[props.network_idx][props.show_link_idx]
  if (network_link_idx == -1) {
    return {
      w: 0,
      h: 0
    }
  }
  const now_link = networkData.networksInfoArr[props.network_idx].links[network_link_idx]
  let flow_width = (100 * (now_link.flow / now_link.capacity)) / tf_ratio_scope[1]
  let tt_height = (100 * now_link.speed) / speed_scope[1]
  // console.log(now_link.flow, now_link.travelTime, now_link.speed, 'id:', now_link.globalId + 1)
  return {
    w: flow_width,
    h: tt_height
  }
})
const compute_attr_shape1 = computed(() => {
  const tf_ratio_scope = networkData.historgram_data.graph_scope[6]
  const speed_scope = networkData.historgram_data.graph_scope[2]
  const network_link_idx =
    networkData.sel_links_networks_idx[props.network_idx][props.show_link_idx]
  if (network_link_idx == -1) {
    return {
      i_h_l: 0,
      i_h_r: 0,
      o_h_l: 0,
      o_h_r: 0,
    }
  }
  const now_link = networkData.networksInfoArr[props.network_idx].links[network_link_idx]
  const outer_speed_h = 90 / speed_scope[1]
  const inner_speed_h = 90 * now_link.freeFlowTravelTime/ now_link.travelTime / speed_scope[1]
  const cap_h = 90 / tf_ratio_scope[1]
  const flow_h = cap_h * now_link.flow / now_link.capacity
  return {
      i_h_l: inner_speed_h/outer_speed_h*100,
      i_h_r: flow_h/cap_h*100,
      o_h_l: outer_speed_h,
      o_h_r: cap_h,
  }
})
const compute_attr_shape2 = computed(() => {
  const tf_ratio_scope = networkData.historgram_data.graph_scope[6]
  const speed_scope = networkData.historgram_data.graph_scope[2]
  const network_link_idx =
    networkData.sel_links_networks_idx[props.network_idx][props.show_link_idx]
  if (network_link_idx == -1) {
    return {
      l_h: 0,
      r_h: 0,
      h_h2: -2
    }
  }
  const now_link = networkData.networksInfoArr[props.network_idx].links[network_link_idx]
  const speed_h = 100 * now_link.freeFlowTravelTime / now_link.travelTime  
  const cap_h = 100 / tf_ratio_scope[1]
  const flow_h = cap_h * now_link.flow / now_link.capacity

  return {
    l_h: speed_h,
    r_h: flow_h,
    r_h2: cap_h-1
  }
})
// const box_bgc_transition_arr = [
//   { r: 255, g: 130, b: 130, a: 0.3 },
//   { r: 255, g: 255, b: 255, a: 0.3 },
//   { r: 130, g: 255, b: 130, a: 0.3 }
// ] as rgbColorObj[]
const bg_opcaity = 0.4
const box_bgc_transition_arr = computed(() => {
  let now_color_plan = [] as number[][]
  // if (networkData.link_color_plan_sel!=2)
  now_color_plan = networkData.matrix_bg_color_plans[networkData.link_color_plan_sel]
  // else now_color_plan = networkData.personalize_bg_color_plan

  const res = [] as rgbColorObj[]
  now_color_plan.forEach(color_node => {
    res.push({r: color_node[0], g: color_node[1], b: color_node[2], a: bg_opcaity})
  })

  return res
})
const box_bgc = computed(() => {
  const network_link_idx =
    networkData.sel_links_networks_idx[props.network_idx][props.show_link_idx]
  if (network_link_idx == -1) {
    return 'rgba(255,255,255,' + bg_opcaity + ')'
  }
  const now_link = networkData.networksInfoArr[props.network_idx].links[network_link_idx]
  const now_sumcost = now_link.travelTime
  let std_now_sumcost =
    0.5 +
    (now_sumcost / networkData.global_links_init_sumcost[now_link.globalId] - 1) /
      networkData.matrix_element_radius /
      2
  if (networkData.matrix_element_radius == 0) std_now_sumcost = 0.5

  const now_bgc_obj = rgb_color_obj_transition(1 - std_now_sumcost, box_bgc_transition_arr.value)
  return (
    'rgba(' + now_bgc_obj.r + ',' + now_bgc_obj.g + ',' + now_bgc_obj.b + ',' + now_bgc_obj.a + ')'
  )
})

const if_unshow = computed(() => {
  const network_link_idx =
    networkData.sel_links_networks_idx[props.network_idx][props.show_link_idx]
  return {
    unshow: network_link_idx == -1
  }
})

</script>
<template>
  <div class="matrix_link_info_box" :class="if_unshow" :style="{ backgroundColor: box_bgc }">
    <div
      class="inherent_attr_rect" v-show="networkData.matrix_show_type==0"
      :style="{ width: 100 / networkData.historgram_data.graph_scope[6][1] + '%' }"
    ></div>
    <div
      class="compute_attr_rect" v-show="networkData.matrix_show_type==0"
      :style="{ width: compute_attr_shape.w + '%', height: compute_attr_shape.h + '%' }"
    ></div>
    <div class="attr_bar left_bar" v-show="networkData.matrix_show_type==1"
      :style="{height: compute_attr_shape2.l_h + '%'}"></div>
    <div class="attr_bar right_bar" v-show="networkData.matrix_show_type==1"
      :style="{height: compute_attr_shape2.r_h + '%'}"></div>
    <div class="attr_bar2" v-show="networkData.matrix_show_type==1"
      :style="{bottom: compute_attr_shape2.r_h2 + '%'}"></div>
  </div>
</template>

<style scoped>
.matrix_link_info_box {
  width: 100%;
  height: 100%;
  position: relative;
  text-align: center;
  overflow: hidden;
}
.matrix_link_info_box .inherent_attr_rect,
.matrix_link_info_box .compute_attr_rect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
}
.matrix_link_info_box .inherent_attr_rect {
  /* width: 60%; */
  height: 100%;
  background-color: #d3d2e2;
}
.matrix_link_info_box .compute_attr_rect {
  /* width: 70%;
    height: 50%; */
  background-color: #6362aeca;
}
.unshow {
  display: none;
}
</style>
<style scoped>
  /* .matrix_link_info_box {
    position: relative;
    text-align: center;
    overflow: hidden;

  } */
  .outer_attr_rect {
    position: absolute;
    bottom: 0;
    width: 28px;
    /* height: 80px; */

    background-color: #d3d2e2;
  }
  .outer_attr_rect.left_bar {
    left: calc(100% / 3 - 28px * 2 / 3);
    background-color: #d3d2e2;
  }
  .outer_attr_rect.right_bar {
      right: calc(100% / 3 - 28px * 2 / 3);
      background-color: #d3d2e2;
  }

  
  .inner_attr_rect {
    position: absolute;
    bottom: 0;
    width: 18px;
    /* height: 60px; */

    background-color: #6362aeca;
  }
  .inner_attr_rect.left_bar {
    left: calc(100% / 2 - 18px / 2);
    background-color: #6362aeca;
  }
  .inner_attr_rect.right_bar {
    right: calc(100% / 2 - 18px / 2);
    background-color: #6362aeca;
  }
</style>
<style scoped>

.matrix_link_info_box .attr_bar {
  position: absolute;
  bottom: 0;
  width: 22px;
  /* height: 60px; */

  background-color: #6362aeca;
  margin-left: auto;

  box-shadow: inset 0 0 1px #f3f2f1;
}

.attr_bar.left_bar {
  left: calc(100% / 3 - 22px * 2 / 3);
  background-color: #6362aeca;
  /* height: 60px; */
}

.attr_bar.right_bar {
  /* height: 80px; */
  right: calc(100% / 3 - 22px * 2 / 3);
  background-color: #6362aeca;
}
.attr_bar2 {
  position: absolute;
  /* bottom: 20px; */
  width: 26px;
  height: 2px;
  /* height: 60px; */

  background-color: #d3d2e2;
  right: calc(100% / 3 - 24px * 2 / 3);
}

</style>