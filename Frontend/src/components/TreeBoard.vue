<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useNetworksData } from '@/stores/networkData'
import { useNetworkSel } from '@/stores/networkSel'
import { useLineEdit } from '@/stores/lineEdit'
import '@/assets/matrix_element.css'
import ThumbnailMap from './ThumbnailMap.vue'
import MatrixGraph from './MatrixGraph.vue'

// basic interface
interface treeNodeStyle {
  left: number
  top: number
  border_width: number
  color: string
  bgcolor: string
}
interface treeLinkeStyle {
  start: number[]
  end: number[]
  border_width: number
  dash: boolean
  color: string
  arrow_d: string
}
interface hslColorObj {
  h: number
  s: number
  l: number
  a: number
}
interface rgbColorObj {
  r: number
  g: number
  b: number
  a: number
}

// basic info
const tree_shape_args = {
  horizontal_dis: 50,
  vertical_dis: 0,
  horizontal_padding: 50,
  vertical_padding: 50,
  node_block_half_width: 25,
  node_block_half_height: 25,
  node_block_radius: 25
}

const bg_color_transition_arr = computed(() => {
  let now_color_plan = [] as number[][]
  // if (networkData.link_color_plan_sel!=2)
  now_color_plan = networkData.matrix_bg_color_plans[networkData.link_color_plan_sel]
  // else now_color_plan = networkData.personalize_bg_color_plan

  const res = [] as rgbColorObj[]
  for (let i = now_color_plan.length - 1; i >= 0; i -= 1) {
    const color_node = now_color_plan[i]
    res.push({ r: color_node[0], g: color_node[1], b: color_node[2], a: 1 })
  }

  return res
})

// val to color
function rgb_color_obj_transition(
  min_val: number,
  max_val: number,
  val: number,
  colors_transition: rgbColorObj[]
) {
  let color_domain_idx = 0
  let std_val = (val - min_val) / (max_val - min_val)
  if (max_val == min_val) std_val = 0.5

  const domain_size = colors_transition.length - 1
  for (let i = 1; i <= domain_size; i++) {
    if (std_val < i / domain_size) break
    else color_domain_idx += 1
  }
  if (color_domain_idx >= domain_size) color_domain_idx = domain_size - 1

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
function rgb_color_transition(
  min_val: number,
  max_val: number,
  val: number,
  colors_transition: rgbColorObj[]
) {
  const color_projection = rgb_color_obj_transition(min_val, max_val, val, colors_transition)
  return (
    'rgba(' +
    color_projection.r +
    ',' +
    color_projection.g +
    ',' +
    color_projection.b +
    ',' +
    color_projection.a +
    ')'
  )
}

// network info
const networkData = useNetworksData()
const networkSel = useNetworkSel()
const lineEditData = useLineEdit()

// tree info
const tree_childs_idxs = ref([] as number[][])
const child_tree_width = ref([] as number[])
const node_top_idx = ref([] as number[])

// svg size
const svg_shape = computed(() => {
  let svg_w =
    2 * tree_shape_args.horizontal_padding +
    2 * tree_shape_args.node_block_half_width * node_top_idx.value.length +
    2 * tree_shape_args.horizontal_dis * (node_top_idx.value.length - 1)
  let svg_h =
    2 * tree_shape_args.vertical_padding +
    2 * tree_shape_args.node_block_half_height * child_tree_width.value[0] +
    tree_shape_args.vertical_dis * (child_tree_width.value[0] - 1)
  if (svg_w == undefined || svg_h == undefined) {
    svg_w = 2 * tree_shape_args.horizontal_padding
    svg_h = 2 * tree_shape_args.vertical_padding
  }
  return {
    width: svg_w + 30,
    height: svg_h
  }
})

// node position
const nodes_styles_in_tree = computed(() => {
  const bg_opacity = 0.5

  // start compute
  const res = [] as treeNodeStyle[]
  for (let i = 0; i < node_top_idx.value.length; i++) {
    const colorMid = networkData.networksInfoArr[0].costSum
    const colorRadius = Math.max(
      colorMid - networkData.min_cost_sum,
      networkData.max_cost_sum - colorMid
    )
    const t = node_top_idx.value[i]

    const nodeColor_obj = rgb_color_obj_transition(
      colorMid - colorRadius,
      colorRadius + colorMid,
      networkData.networksInfoArr[i].costSum,
      bg_color_transition_arr.value
    )
    const nodeColor =
      'rgba(' +
      nodeColor_obj.r +
      ',' +
      nodeColor_obj.g +
      ',' +
      nodeColor_obj.b +
      ',' +
      nodeColor_obj.a +
      ')'

    const bgcolorMid = 0
    const bgcolorRadius = networkData.matrix_element_radius
    const network_node_bgc_val =
      networkData.networksInfoArr[i].costSum / networkData.networksInfoArr[0].costSum - 1
    const nodebg_Color_obj = rgb_color_obj_transition(
      bgcolorMid - bgcolorRadius,
      bgcolorRadius + bgcolorMid,
      network_node_bgc_val,
      bg_color_transition_arr.value
    )

    const nodeBGColor = 'rgba(127, 127, 127, 0.4)'

    res.push({
      left:
        tree_shape_args.horizontal_padding +
        i * (tree_shape_args.horizontal_dis + tree_shape_args.node_block_half_width * 2),
      top:
        tree_shape_args.vertical_padding +
        t * (tree_shape_args.vertical_dis + tree_shape_args.node_block_half_height * 2),
      border_width: 4,
      color: nodeColor,
      bgcolor: nodeBGColor
    })
  }
  return res
})

// arrow position
const end_skewing = 5
const half_arrow_angle = Math.PI / 10
const tria_edge_len = 15
const link_border_width = 3
function link_arrow_pos(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  end_skewing: number,
  half_arrow_angle: number,
  tria_edge_len: number
) {
  let former_angle = 0
  if (x1 == x2) {
    if (y1 > y2) {
      former_angle = Math.PI / 2
    } else former_angle = -Math.PI / 2
  } else {
    if (x2 > x1) {
      former_angle = Math.atan((y2 - y1) / (x2 - x1)) + Math.PI
    } else former_angle = Math.atan((y2 - y1) / (x2 - x1))
  }

  const former_link_len = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  const end_x = x2 + ((x1 - x2) / former_link_len) * end_skewing
  const end_y = y2 + ((y1 - y2) / former_link_len) * end_skewing

  const arrow_n1x = end_x + Math.cos(former_angle - half_arrow_angle) * tria_edge_len
  const arrow_n2x = end_x + Math.cos(former_angle + half_arrow_angle) * tria_edge_len
  const arrow_n1y = end_y + Math.sin(former_angle - half_arrow_angle) * tria_edge_len
  const arrow_n2y = end_y + Math.sin(former_angle + half_arrow_angle) * tria_edge_len
  return {
    end_x: end_x,
    end_y: end_y,
    d:
      'M' +
      arrow_n1x +
      ' ' +
      arrow_n1y +
      ' L' +
      end_x +
      ' ' +
      end_y +
      ' L' +
      arrow_n2x +
      ' ' +
      arrow_n2y
  }
}
// linked lines positon
const links_styles_in_tree = computed(() => {
  const res = [] as treeLinkeStyle[]
  for (let i = 1; i < networkData.networksFatherIdx.length; i++) {
    // connect position
    const end_pos = [
      nodes_styles_in_tree.value[i].left,
      nodes_styles_in_tree.value[i].top + tree_shape_args.node_block_half_height
    ]
    const pt2 = networkData.networksFatherIdx[i]
    const start_pos = [
      nodes_styles_in_tree.value[pt2].left + tree_shape_args.node_block_half_width * 2,
      nodes_styles_in_tree.value[pt2].top + tree_shape_args.node_block_half_height
    ]

    // compute style
    const colorRadius = Math.max(
      Math.abs(networkData.max_diff_cost_sum),
      Math.abs(networkData.min_diff_cost_sum)
    )
    const colorVal =
      networkData.networksInfoArr[i].costSum - networkData.networksInfoArr[pt2].costSum
    const nodeColor = rgb_color_transition(
      -colorRadius,
      +colorRadius,
      colorVal,
      bg_color_transition_arr.value
    )
    const now_arrow_info = link_arrow_pos(
      start_pos[0],
      start_pos[1],
      end_pos[0],
      end_pos[1],
      end_skewing,
      half_arrow_angle,
      tria_edge_len
    )
    res.push({
      start: start_pos,
      end: [now_arrow_info.end_x, now_arrow_info.end_y],
      border_width: link_border_width,
      dash: false,
      color: nodeColor,
      arrow_d: now_arrow_info.d
    })
  }
  return res
})

// node top
function get_node_top_dis() {
  // init arr
  node_top_idx.value = Array(tree_childs_idxs.value.length).fill(0)

  const node_to_compute = [0]
  const node_over_dis = [0]
  let lst_len = node_to_compute.length
  let start_idx = 0

  // from root to leaf nodes
  while (lst_len - start_idx > 0) {
    for (let i = start_idx; i < lst_len; i++) {
      let now_node_idx = node_to_compute[i]

      if (
        now_node_idx >= networkData.networksInfoArr.length ||
        now_node_idx >= tree_childs_idxs.value.length
      )
        return

      // now node top
      node_top_idx.value[now_node_idx] =
        (child_tree_width.value[now_node_idx] - 1) / 2 + node_over_dis[i]

      // insert node
      let init_h = node_over_dis[i]
      for (let j = 0; j < tree_childs_idxs.value[now_node_idx].length; j++) {
        const now_child_node_idx = tree_childs_idxs.value[now_node_idx][j]
        node_to_compute.push(now_child_node_idx)
        node_over_dis.push(init_h)

        // update height
        init_h += child_tree_width.value[now_child_node_idx]
      }
    }
    start_idx = lst_len
    lst_len = node_to_compute.length
  }
}

// listen to height changes
watch(
  () => networkData.networksInfoArr,
  () => {
    // if loaded all data
    if (networkData.networksFatherIdx.length == 0) return

    // reset child arrs
    child_tree_width.value = []
    tree_childs_idxs.value = []

    for (let i = 0; i < networkData.networksFatherIdx.length; i++) {
      child_tree_width.value.push(0)
      tree_childs_idxs.value.push([])
      const tmp_fa_idx = networkData.networksFatherIdx[i]
      if (tmp_fa_idx >= 0) {
        tree_childs_idxs.value[tmp_fa_idx].push(i)
      }
    }

    // each child tree height
    for (let i = networkData.networksFatherIdx.length - 1; i >= 0; i -= 1) {
      if (tree_childs_idxs.value[i].length == 0) {
        child_tree_width.value[i] = 1
      } else {
        for (let j = 0; j < tree_childs_idxs.value[i].length; j++) {
          child_tree_width.value[i] += child_tree_width.value[tree_childs_idxs.value[i][j]]
        }
      }
    }

    // node height
    get_node_top_dis()
  },
  { deep: true }
)

// delete one network
async function del_network_node_recursion(e: MouseEvent, network_idx: number) {
  e.preventDefault()
  const networks_to_del = [network_idx]
  let now_pos = 0
  while (now_pos < networks_to_del.length) {
    const now_network = networks_to_del[now_pos]
    for (let i = 0; i < tree_childs_idxs.value[now_network].length; i++) {
      networks_to_del.push(tree_childs_idxs.value[now_network][i])
    }
    now_pos++
  }
  networkSel.deleteNetworks(networks_to_del)
  await networkData.networkRecursionDelete(networks_to_del)
}

function get_network_state(network_idx: number) {
  if (network_idx <= 0 || network_idx >= networkData.networksInfoArr.length) {
    return ''
  }
  let diff =
    (networkData.networksInfoArr[network_idx].costSum / networkData.networksInfoArr[0].costSum) *
      100 -
    100
  let mark = ''
  if (diff < 0) {
    diff = -diff
  }
  return diff.toFixed(1) + '%'
}

// specific link info in a specific network
function get_network_info(network_idx: number, show_link_idx: number) {
  const link_global_idx = networkData.sel_links_global_idx[show_link_idx]
  const link_idx_in_network = networkData.sel_links_networks_idx[network_idx][show_link_idx]
  if (
    link_idx_in_network == -1 ||
    link_idx_in_network > networkData.networksInfoArr[network_idx].links.length
  ) {
    console.log('[link click] Not exist!')
  } else {
    const link = networkData.networksInfoArr[network_idx].links[link_idx_in_network]
    console.log(
      '[link click] ID(network) = ',
      link_idx_in_network,
      ', freeFlowTravelTime: ',
      link.freeFlowTravelTime,
      ', capacity: ',
      link.capacity,
      ', travelTime: ',
      link.travelTime,
      ', flow: ',
      link.flow
    )
  }
}
function light_up_link(show_link_idx: number) {
  const link_global_idx = networkData.sel_links_global_idx[show_link_idx]
  // highlight road
  let link_now_idx = -1
  const now_network_idx = networkSel.last_sel_network_id
  if (now_network_idx == -1) {
    return
  }
  for (let i = 0; i < networkData.networksInfoArr[now_network_idx].links.length; i++) {
    if (networkData.networksInfoArr[now_network_idx].links[i].globalId == link_global_idx) {
      link_now_idx = i
      break
    }
  }
  if (link_now_idx == -1) {
    return
  }
  lineEditData.lineIdx = link_now_idx
  lineEditData.link_to_lightup = !lineEditData.link_to_lightup
}
let light_up_timer = 0
function handleMouseInMatrixLink(show_link_idx = -1) {
  clearTimeout(light_up_timer)
  if (show_link_idx == -1) return
  light_up_timer = setTimeout(() => {
    light_up_link(show_link_idx)
  }, 500)
}

// handle
function handleNodePush(network_idx: number) {
  networkSel.selectNetwork(network_idx)
}

const road_name_col_width = 30
const node_space_width = 2 * tree_shape_args.node_block_half_width + tree_shape_args.horizontal_dis
const svg_left =
  road_name_col_width +
  2 * node_space_width -
  (tree_shape_args.horizontal_padding - tree_shape_args.horizontal_dis / 2)
const svg_bg_left =
  road_name_col_width +
  2 * (2 * tree_shape_args.node_block_half_width + tree_shape_args.horizontal_dis)
const edit_log_icons = [
  '/static/edits/capacity_up.svg',
  '/static/edits/capacity_down.svg',
  '/static/edits/add_pt.svg',
  '/static/edits/del_pt.svg',
  '/static/edits/add_link.svg',
  '/static/edits/del_link.svg',
  '/static/edits/speed_up.svg',
  '/static/edits/speed_down.svg'
]

// zoom and move
const zoomRat = ref(100)
const matrix_block_left = ref(0)
const matrix_block_top = ref(0)
// wheel zoom
function handleWheel(e: WheelEvent) {
  // e.
  const touch_board = document.getElementById('matrix_put_area') as HTMLElement
  const touch_board_pos = touch_board.getBoundingClientRect()
  const touch_board_cx = touch_board_pos.left + touch_board_pos.width / 2
  const touch_board_cy = touch_board_pos.top + touch_board_pos.height / 2
  const mouse_in_top = touch_board_cx - e.clientY
  const mouse_in_left = touch_board_cy - e.clientX
  // console.log("mouse_dis: ", mouse_in_top, ", ", mouse_in_left);

  if (e.deltaY > 0 && zoomRat.value > 20) {
    zoomRat.value /= 1.2
  } else if (e.deltaY < 0) {
    zoomRat.value *= 1.2
  }
}
// move event
let matrix_move_start = [-1, -1]
function matrixMoveStart(e: MouseEvent) {
  matrix_move_start = [e.clientX, e.clientY]
  if (matrix_move_start[0] == -1 && matrix_move_start[1] == -1) matrix_move_start = [-1.1, -1.1]
}
function matrixMoveEnd(e: MouseEvent) {
  matrix_move_start = [-1, -1]
}
function handleMouseMove(e: MouseEvent) {
  if (matrix_move_start[0] == -1 && matrix_move_start[1] == -1) return
  if (e.buttons == 1) {
    e.preventDefault()

    matrix_block_left.value += (e.clientX - matrix_move_start[0]) / (zoomRat.value / 100)
    matrix_block_top.value += (e.clientY - matrix_move_start[1]) / (zoomRat.value / 100)
    matrix_move_start = [e.clientX, e.clientY]
  }
}

const networks_as_filter_icons = (now_state: boolean) => {
  if (now_state) {
    return '/static/matrix_btns/sel_filter.svg'
  } else return '/static/matrix_btns/un_sel.svg'
}
const link_if_alt_top = (link_idx: number) => {
  if (link_idx < 0 || link_idx > networkData.linksAltTop.length) {
    return '/static/matrix_btns/un_sel.svg'
  }
  if (networkData.linksAltTop[link_idx]) {
    return '/static/matrix_btns/sel_top.svg'
  } else return '/static/matrix_btns/un_sel.svg'
}
function shift_link_alt_to_top(link_global_id: number) {
  if (link_global_id < networkData.linksAltTop.length && link_global_id >= 0) {
    networkData.linksAltTop[link_global_id] = !networkData.linksAltTop[link_global_id]
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(2)} B`
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)} M`
  } else {
    return num.toString()
  }
}
</script>
<template>
  <div class="main_board">
    <div
      class="matrix_box"
      id="matrix_show_area"
      @mousedown="matrixMoveStart"
      @mouseleave="matrixMoveEnd"
      @mouseup="matrixMoveEnd"
      @wheel="handleWheel"
      @mousemove="handleMouseMove"
    >
      <div
        class="matrix_block_outer_box"
        :style="{
          width: svg_shape.width + svg_left + 'px',
          transform: `scale(${zoomRat / 100})`
        }"
      >
        <div
          class="matrix_block"
          id="matrix_put_area"
          :style="{
            width: svg_shape.width + svg_left + 'px',
            left: matrix_block_left + 'px',
            top: matrix_block_top + 'px'
          }"
        >
          <div
            class="matrix_state__sel_bar"
            :style="{ width: svg_shape.width + svg_left + 'px', paddingTop: 0 + 'px' }"
          >
            <div :style="{ height: '100%', width: svg_bg_left + 'px' }"></div>
            <div
              class="svg_node_selblock"
              :style="{ height: '100%', width: node_space_width + 'px' }"
              v-for="(network_as_filter, network_idx) in networkData.networksAsFilter"
              :key="network_idx"
            >
              <span
                class="state_filter_sel_btn"
                @click="networkData.shift_network_as_filter_state(network_idx)"
              >
                <img :src="networks_as_filter_icons(network_as_filter)" alt="" srcset="" />
              </span>
            </div>
          </div>
          <div
            class="matrix_deck"
            :style="{
              height: svg_shape.height + 'px',
              width: svg_shape.width + svg_left + 'px',
              paddingTop: 0 + 'px'
            }"
          >
            <div :style="{ height: '100%', width: svg_bg_left + 'px' }"></div>
            <div
              class="svg_node_bgblock"
              v-for="(network_edit_logs, network_idx) in networkData.all_edit_logs"
              :key="network_idx"
              :style="{
                width: node_space_width + 'px',
                backgroundColor: nodes_styles_in_tree[network_idx].bgcolor
              }"
            >
              <div class="matrix_deck_element">
                <div class="state_digital_info">
                  {{ get_network_state(network_idx) }}
                </div>
                <div class="cost_box" v-show="network_idx > 0">
                  <!-- ${{ formatNumber(test_cont[network_idx]) }} -->
                  ${{ formatNumber(networkData.networks_edit_cost[network_idx]) }}
                </div>
                <div class="edit_log_box">
                  <span
                    class="edit_log_entity"
                    v-for="(edit_log, el_idx) in network_edit_logs"
                    :key="el_idx"
                    :class="{ this_edit: edit_log.edit_on_this }"
                  >
                    <img :src="edit_log_icons[edit_log.edit_type - 1]" alt="" srcset="" />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="matrix_part" :style="{ width: svg_shape.width + svg_left + 'px' }">
            <div class="matrix_col" :style="{ width: node_space_width + 'px' }">
              <div
                class="matrix_element"
                v-for="link_global_id in networkData.sel_links_global_idx"
                style="border: 2px solid transparent"
                :key="link_global_id"
              ></div>
            </div>
            <div class="matrix_col" :style="{ width: road_name_col_width + 'px' }">
              <div
                class="matrix_element road_name_box"
                v-for="link_global_id in networkData.sel_links_global_idx"
                :key="link_global_id"
              >
                Road {{ link_global_id + 1 }}
              </div>
            </div>
            <div class="matrix_col road_img_show_col" :style="{ width: node_space_width + 'px' }">
              <div
                class="matrix_element matrix_element_with_border"
                v-for="(link_global_id, show_idx) in networkData.sel_links_global_idx"
                :key="link_global_id"
                @mouseenter="handleMouseInMatrixLink(show_idx)"
                @mouseleave="handleMouseInMatrixLink()"
              >
                <ThumbnailMap :thumb_map_idx="show_idx"></ThumbnailMap>
              </div>
            </div>
            <div
              class="matrix_col"
              v-for="(network_flow_info, network_idx) in networkData.sel_links_networks_idx"
              :key="network_idx"
              :style="{
                width: node_space_width + 'px'
                // backgroundColor: nodes_styles_in_tree[network_idx].bgcolor
              }"
            >
              <div
                class="matrix_element matrix_element_with_border"
                v-for="(link_flow_info, link_show_idx) in network_flow_info"
                :key="link_show_idx"
                @click="get_network_info(network_idx, link_show_idx)"
              >
                <MatrixGraph
                  :network_idx="network_idx"
                  :show_link_idx="link_show_idx"
                ></MatrixGraph>
              </div>
            </div>
            <!-- <div class="matrix_col links_alt_top_btns_box">
              <div
                class="link_alt_top_btn_box"
                v-for="(link_global_id, show_idx) in networkData.sel_links_global_idx"
                :key="show_idx"
              >
                <span class="links_alt_top_btn" @click="shift_link_alt_to_top(link_global_id)">
                  <img :src="link_if_alt_top(link_global_id)" alt="" srcset="" />
                </span>
              </div>
            </div> -->
          </div>
          <svg
            version="1.1"
            class="tree_svg"
            baseProfile="full"
            :style="{
              left: svg_left + 'px',
              width: svg_shape.width + 'px',
              height: svg_shape.height + 'px'
            }"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              v-for="(line_style, line_idx) in links_styles_in_tree"
              :key="line_idx"
              :x1="line_style.start[0]"
              :y1="line_style.start[1]"
              :x2="line_style.end[0]"
              :y2="line_style.end[1]"
              :style="{ stroke: line_style.color, strokeWidth: line_style.border_width }"
            />
            <path
              v-for="(line_style, line_idx) in links_styles_in_tree"
              :key="line_idx"
              :d="line_style.arrow_d"
              :style="{
                stroke: line_style.color,
                strokeWidth: line_style.border_width,
                fill: 'transparent'
              }"
            />
            <rect
              v-for="(node_pos, node_idx) in nodes_styles_in_tree"
              :key="node_idx"
              :circle_id="node_idx"
              :class="{ rect_sel2show: networkSel.last_sel_network_id == node_idx }"
              :x="node_pos.left"
              :y="node_pos.top"
              :style="{ strokeWidth: node_pos.border_width, stroke: node_pos.color }"
              :width="tree_shape_args.node_block_half_width * 2"
              :height="tree_shape_args.node_block_half_height * 2"
              :rx="tree_shape_args.node_block_radius"
              :ry="tree_shape_args.node_block_radius"
              fill="#409eff00"
              @click="handleNodePush(node_idx)"
              @contextmenu="del_network_node_recursion($event, node_idx)"
            ></rect>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.main_board {
  width: 100%;
  height: 100%;
  /* border-radius: 8px; */
  background-color: grey;
  /* box-shadow: 2px 5px 5px rgba(255, 255, 255, 0.2); */

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-items: center;
  text-align: center;
}

/* selected network to show */
@keyframes dash_moving {
  0% {
    /* transform: rotate(0deg); */
    stroke-dashoffset: 0px;
  }
  100% {
    /* transform: rotate(360deg); */
    stroke-dashoffset: 120px;
  }
}

.rect_sel2show {
  border-style: dashed;
  stroke-dasharray: 6;
  animation: dash_moving 5s linear infinite;
}

.matrix_box {
  margin-left: auto;
  margin-right: auto;
  width: calc(100% - 18px);
  height: calc(100% - 18px);
  /* border-radius: 3px; */
  background-color: #dfdfdf;
  overflow: hidden;

  z-index: 3;

  position: relative;
}
.matrix_block_outer_box {
  position: absolute;
  width: 100px;
  height: 100%;
}
.matrix_block {
  width: 500px;
  position: relative;
  top: 0px;
  z-index: 1;
}

.matrix_block * {
  user-select: none;
}

/* svg图片的样式 */
.tree_svg {
  position: absolute;
  top: 30px;
  transition: all 0.3s ease;
}
/* svg background */
.matrix_deck {
  margin: 0;
  /* background-color: firebrick; */

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-items: center;
  text-align: center;
}
.matrix_deck .svg_node_bgblock,
.matrix_state__sel_bar .svg_node_selblock {
  height: 100%;
}
.matrix_part {
  margin: 0;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-items: center;
  text-align: center;
}
.matrix_col {
  height: 100%;
}
.matrix_element {
  width: calc(100% - 2px);
  height: 90px;
  /* border-width: 5px; */
  /* border-color: red; */
  /* margin: 0; */
}
.matrix_element.road_name_box {
  writing-mode: vertical-rl;
  user-select: none;
  /* text-orientation: upright; */
  border: 2px solid transparent;
  color: #121212;
}
.matrix_element_with_border,
.matrix_deck_element {
  border: 2px solid #3b3b3b;
  background-color: #fff;
}
.matrix_deck_element {
  height: calc(100% - 2px);
  width: calc(100% - 2px);
  position: relative;
  vertical-align: bottom;
  background-color: #aaa !important;
  /* vertical-align: bottom; */
}

/* state percentage info */
.matrix_deck_element .state_digital_info {
  width: 100%;
  color: #121212aa;
  font-size: 16px;
  /* font-family: 'Consolas'; */
}

/* show edit logs */
.matrix_deck_element .edit_log_box {
  position: absolute;
  bottom: 0;
  width: 100%;
  /* height: 20px; */
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  /* background-color: aquamarine; */
}
.matrix_deck_element .edit_log_entity {
  display: inline-block;
  width: 20px;
  height: 20px;
  margin: 2px;
  background-color: #adadad;
  border-radius: 3px;
}
.matrix_deck_element .edit_log_entity.this_edit {
  background-color: #fafafa;
}
.matrix_deck_element .edit_log_entity img {
  width: 100%;
  height: 100%;
  user-select: none;
}

/* map collumn */
.road_img_show_col {
  user-select: none;
}

/* choose network for filtering */
.matrix_state__sel_bar {
  height: 30px;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-items: center;
  text-align: center;
}
.svg_node_selblock {
  text-align: right;
  /* border: 2px solid transparent; */
}
.svg_node_selblock .state_filter_sel_btn {
  display: inline-block;
  padding: 2px;
  padding-right: 0;
  height: 26px;
  width: 26px;

  user-select: none;
  cursor: pointer;
}
.svg_node_selblock .state_filter_sel_btn img {
  width: 100%;
  height: 100%;
}
.svg_node_selblock .state_filter_sel_btn:hover img {
  filter: brightness(0.8);
}
/* top links */
.links_alt_top_btns_box {
  width: 30px;
}
.links_alt_top_btns_box .link_alt_top_btn_box {
  height: 100px;
  width: 100%;
  border: 2px solid transparent;
}
.links_alt_top_btns_box .links_alt_top_btn {
  display: inline-block;
  width: 26px;
  height: 26px;
  padding: 2px;
  padding-top: 0;
  cursor: pointer;
  user-select: none;
}
.links_alt_top_btns_box .links_alt_top_btn img {
  width: 100%;
  height: 100%;
}
.links_alt_top_btns_box .links_alt_top_btn:hover img {
  filter: brightness(0.8);
}
</style>
<style>
.cost_box {
  width: 100%;
  position: absolute;
  bottom: 30px;
  font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;
  font-size: 15px;
  color: #121212;
}
</style>
