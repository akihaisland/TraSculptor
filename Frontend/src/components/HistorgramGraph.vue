<script setup lang="ts">
import '@/assets/historgram_content.css'
import { useNetworksData } from '@/stores/networkData'
// import { useNetworkSel } from '@/stores/networkSel'
import { onMounted, ref, watch, computed } from 'vue'

// passed from parent component
const props = defineProps({
  content_id: {
    type: Number,
    default: 0
  }
})
const networkData = useNetworksData()
// Selected interval
const mini_bound = ref(0)
const max_bound = ref(8)

// calculate bar height
const max_bar_height = 60
const bars_height = computed(() => {
  let max_bar_num = 0
  const res = [] as number[][]
  for (let i = 0; i < 8; i++) {
    res.push([
      networkData.historgram_data.graph_data[props.content_id][i],
      networkData.historgram_data.graph_data[props.content_id][i + 8]
    ])
    if (res[i][0] + res[i][1] > max_bar_num) max_bar_num = res[i][0] + res[i][1]
  }
  // console.log("content" + props.content_id + ": ", networkData.historgram_data.graph_data[props.content_id]);
  for (let i = 0; i < 8; i++) {
    res[i][0] = (max_bar_height * res[i][0]) / max_bar_num
    res[i][1] = (max_bar_height * res[i][1]) / max_bar_num
  }

  return res
})

// Format and display numbers
function formatNumber(num: number): string {
  if (num >= 0 && num < 10) {
    return `${num.toFixed(4).replace('.', '.')}`
  } else if (num >= 10 && num < 100) {
    return `${num.toFixed(3)}`
  } else if (num >= 100 && num < 1000) {
    return `${num.toFixed(2)}`
  } else if (num >= 1000 && num < 10000) {
    const k = num / 1000
    return `${k.toFixed(4)}k`
  } else if (num >= 10000 && num < 100000) {
    const k = num / 1000
    return `${k.toFixed(3)}k`
  } else {
    return num.toString()
  }
}
const sel_mini_val = computed(() => {
  const val_all_scope = networkData.historgram_data.graph_scope[props.content_id]
  const res = val_all_scope[0] + ((val_all_scope[1] - val_all_scope[0]) * mini_bound.value) / 8
  return formatNumber(res)
})
const sel_max_val = computed(() => {
  const val_all_scope = networkData.historgram_data.graph_scope[props.content_id]
  const res = val_all_scope[0] + ((val_all_scope[1] - val_all_scope[0]) * max_bound.value) / 8
  return formatNumber(res)
})

let bound_push = -1
// update filter info for bars
function update_filter() {
  networkData.filter_bounds[props.content_id] = [mini_bound.value, max_bound.value]
  // update sortedpos
  networkData.link_filter_update()
}
function reset_update_filter() {
  mini_bound.value = 0
  max_bound.value = 8
  update_filter()
}

// push bound of the historgram bars
function handle_bound_push(bound_idx: number) {
  if (bound_idx != -1) {
    if (sel_mini_val.value == sel_max_val.value) return
  }
  bound_push = bound_idx
}
function handle_bound_reset() {
  handle_bound_push(-1)
  mini_bound.value = networkData.filter_bounds[props.content_id][0]
  max_bound.value = networkData.filter_bounds[props.content_id][1]
}
// Listen for changes in boundary values based on mouse movement
function handle_mouse_drag(e: MouseEvent) {
  let change_size = 0
  if (e.buttons == 1) {
    let move_dis = 0
    if (bound_push == 0) {
      const bar_element = document.getElementById(
        'select_bar_left' + props.content_id
      ) as HTMLElement
      move_dis = bar_element.getBoundingClientRect().left + 9 - e.clientX
    } else if (bound_push == 1) {
      const bar_element = document.getElementById(
        'select_bar_right' + props.content_id
      ) as HTMLElement
      move_dis = bar_element.getBoundingClientRect().left + 1 - e.clientX
    } else return

    if (move_dis > 12) change_size = -1
    else if (move_dis < -12) change_size = 1
    else return
  } else return

  if (bound_push == 0) {
    // 操作左边界
    if (mini_bound.value + change_size >= max_bound.value || mini_bound.value + change_size < 0)
      return
    else mini_bound.value += change_size
  } else if (bound_push == 1) {
    // 操作右边界
    if (max_bound.value + change_size <= mini_bound.value || max_bound.value + change_size > 8)
      return
    else max_bound.value += change_size
  }
}

// sort related info
const if_show_sort_btn = computed(() => {
  return (
    mini_bound.value == networkData.filter_bounds[props.content_id][0] &&
    max_bound.value == networkData.filter_bounds[props.content_id][1]
  )
})
const sort_btn_state = computed(() => {
  return networkData.sort_cond_state[props.content_id]
})
function update_sort_cond(e: MouseEvent) {
  // stop default events
  e.preventDefault()

  // check if right click
  if (e.button == 2) {
    networkData.set_sort_cond(props.content_id, -1)
  } else if (e.button == 0) {
    // left click
    if (sort_btn_state.value == 1) {
      // now status: reverse
      networkData.set_sort_cond(props.content_id, 0)
    } else {
      networkData.set_sort_cond(props.content_id, 1)
    }
  }
}

// const graph_title = [
//   'Average Travel Time',
//   'Travel Time Scope',
//   // 'Average Travel Time Ratio',
//   'Travel Time Ratio',
//   'Travel Time Ratio Scope',
//   'Average Travel Flow',
//   'Travel Flow Scope',
//   // 'Average Travel Flow Ratio',
//   'Travel Flow Ratio',
//   'Travel Flow Ratio Scope'
// ]
const graph_title = [
  'Average Free Flow Travel Time',
  'Travel Time Scope',
  'Travel Time Ratio',
  'Travel Time Ratio Scope',
  'Average Capacity',
  'Travel Flow Scope',
  'Travel Flow Ratio',
  'Travel Flow Ratio Scope'
]
const sort_btn_img = [
  '/static/edits_btn/cancel_sort.svg',
  '/static/edits_btn/sort-size-up.svg',
  '/static/edits_btn/sort-size-down.svg'
]
</script>
<template>
  <div
    class="historgram_box"
    @mouseleave="handle_bound_reset"
    @mouseup="handle_bound_push(-1)"
    @mousemove="handle_mouse_drag"
  >
    <div class="title_box">
      <span class="title_content">
        {{ graph_title[content_id] }}
      </span>
      <span class="title_btn_box">
        <span class="title_btn" @click="reset_update_filter">
          <img src="/static/edits_btn/cancel.svg" alt="" srcset="" />
        </span>
        <span
          class="title_btn"
          @click="update_filter"
          :class="{ hidden_container: if_show_sort_btn }"
        >
          <img src="/static/edits_btn/save.svg" alt="" srcset="" />
        </span>
        <span
          class="title_btn"
          @click="update_sort_cond"
          @contextmenu="update_sort_cond"
          :class="{ hidden_container: !if_show_sort_btn }"
        >
          <img :src="sort_btn_img[sort_btn_state + 1]" alt="" srcset="" />
        </span>
      </span>
    </div>
    <div class="bars_box">
      <div class="bars_content">
        <div class="bar_content"></div>
        <div class="bar_content" v-for="(bar_height, bar_idx) in bars_height" :key="bar_idx">
          <div class="upper_bar" :style="{ height: bar_height[0] + 'px' }"></div>
          <div class="lower_bar" :style="{ height: bar_height[1] + 'px' }"></div>
        </div>
        <div class="bar_content"></div>
        <div
          class="select_bar_left"
          :id="'select_bar_left' + content_id"
          :style="{ left: 12 * mini_bound + 5 + 'px' }"
        >
          <div class="direction_instruction_box">
            <div class="direction_instruction_left" @mousedown="handle_bound_push(0)"></div>
          </div>
          <div class="vertical_line" @mousedown="handle_bound_push(0)"></div>
        </div>
        <div
          class="select_bar_right"
          :id="'select_bar_right' + content_id"
          :style="{ left: 12 * max_bound + 11 + 'px' }"
        >
          <div class="vertical_line" @mousedown="handle_bound_push(1)"></div>
          <div class="direction_instruction_box">
            <div class="direction_instruction_right" @mousedown="handle_bound_push(1)"></div>
          </div>
        </div>
      </div>
      <div class="bars_axis">
        <div
          class="bars_select_area"
          :style="{
            left: 9 + 12 * mini_bound + 'px',
            width: 2 + 12 * (max_bound - mini_bound) + 'px'
          }"
        ></div>
      </div>
      <div class="range_show_box">
        <div class="lower_bound_val">
          <!-- 0.000 -->
          {{ sel_mini_val }}
        </div>
        <div class="upper_bound_val">
          <!-- 6.656 -->
          {{ sel_max_val }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hidden_container {
  display: none;
}
</style>
