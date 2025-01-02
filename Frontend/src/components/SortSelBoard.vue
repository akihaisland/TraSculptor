<script setup lang="ts">
import { useNetworksData } from '@/stores/networkData'
import { computed, ref } from 'vue'

const networkData = useNetworksData()
const cond_pushing = ref(-1)

const cond_cont = [
  'Average Travel Time',
  'Travel Time Scope',
  'Travel Time Ratio',
  'Travel Time Ratio Scope',
  'Average Travel Flow',
  'Travel Flow Scope',
  'Travel Flow Ratio',
  'Travel Flow Ratio Scope'
]
const sort_btn_img = [
  '/static/edits_btn/cancel_sort.svg',
  '/static/edits_btn/sort-size-up.svg',
  '/static/edits_btn/sort-size-down.svg'
]
const sort_conds_deltail = computed(() => {
  const res = [] as number[][]
  for (let i = networkData.sorted_cond.length - 1; i >= 0; i--) {
    let now_state = 0
    if (networkData.sorted_cond[i].sorted_reverse) now_state = 1
    res.push([networkData.sorted_cond[i].cond_idx, now_state])
  }
  return res
})
const conds_class = computed(() => {
  const res = [] as string[]
  for (let i = 0; i < sort_conds_deltail.value.length; i++) {
    res.push('cond_type' + (sort_conds_deltail.value[i][0] + 1))
  }
  return res
})
function update_sort_cond(e: MouseEvent, detail_idx: number) {
  e.stopPropagation()
  e.preventDefault()

  const cond_id = sort_conds_deltail.value[detail_idx][0]
  // delete
  if (e.button == 2) {
    networkData.set_sort_cond(cond_id, -1)
  } else if (e.button == 0) {
    if (sort_conds_deltail.value[detail_idx][1] == 1) {
      networkData.set_sort_cond(cond_id, 0)
    } else {
      networkData.set_sort_cond(cond_id, 1)
    }
  }
}

// exchange priortiy
function get_show_index(node_content: string) {
  for (let i = networkData.sorted_cond.length - 1; i >= 0; i--) {
    if (cond_cont[networkData.sorted_cond[i].cond_idx] == node_content) {
      return i
    }
  }
  return -1
}
// drag element to new position
function switch_conds_priority(e: DragEvent) {
  const drag_element = e.target as HTMLElement
  const target_idx = get_show_index(drag_element.innerText)

  if (cond_pushing.value == -1 || target_idx == -1 || target_idx == cond_pushing.value) {
    return
  }
  const tmp_cond_arr = networkData.sorted_cond
  const former_val = tmp_cond_arr[cond_pushing.value]
  tmp_cond_arr.splice(cond_pushing.value, 1)
  if (target_idx == tmp_cond_arr.length) {
    tmp_cond_arr.push(former_val)
  } else {
    tmp_cond_arr.splice(target_idx, 0, former_val)
  }

  cond_pushing.value = -1
  networkData.sorted_cond = tmp_cond_arr
}
// save the element dragged
function handle_cond_push(e: DragEvent) {
  const drag_element = e.target as HTMLElement
  const detail_idx = get_show_index(drag_element.innerText)
  cond_pushing.value = detail_idx
}
</script>
<template>
  <div
    class="sort_cond_board"
    @dragstart="handle_cond_push($event)"
    @drop="switch_conds_priority($event)"
    @dragover="$event.preventDefault()"
  >
    <div
      class="sort_cond_box"
      v-for="(cond_detail, detail_idx) in sort_conds_deltail"
      :key="detail_idx"
      :class="conds_class[detail_idx]"
      :id="'show_idx_' + detail_idx"
      draggable="true"
    >
      <div class="sort_cond_inner_box">
        <div class="cond_content">
          {{ cond_cont[cond_detail[0]] }}
        </div>
        <div class="sort_btn">
          <img
            :src="sort_btn_img[cond_detail[1] + 1]"
            alt=""
            srcset=""
            @click="update_sort_cond($event, detail_idx)"
            @contextmenu="update_sort_cond($event, detail_idx)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sort_cond_board {
  width: calc(100% - 4px);
  /* height: 100%; */
  height: 36px;
  padding: 2px;
  background-color: #3b3b3b;
  /* border-radius: 3px; */

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-items: center;
  text-align: left;
  user-select: none;
}
.sort_cond_box {
  width: 120px;
  height: 32px;
  background-color: #353535aa;
  border-radius: 3px;
  display: inline-block;
  margin: 2px;
}
.sort_cond_box.cond_type1 {
  width: 120px;
}
.sort_cond_box.cond_type2 {
  width: 95px;
}
.sort_cond_box.cond_type3 {
  width: 95px;
}
.sort_cond_box.cond_type4 {
  width: 100px;
}
.sort_cond_box.cond_type5 {
  width: 80px;
}
.sort_cond_box.cond_type6 {
  width: 95px;
}
.sort_cond_box.cond_type7 {
  width: 95px;
}
.sort_cond_box.cond_type8 {
  width: 100px;
}

.sort_cond_box .sort_cond_inner_box {
  height: 100%;
  width: 100%;
  border-radius: 3px;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-items: center;
  text-align: center;
  cursor: pointer;
  transition: all 300ms ease;
}
.sort_cond_box .sort_cond_inner_box:hover {
  border-radius: 5px;
  background-color: #d9eddf33;
  /* filter: brightness(1.2); */
}
.sort_cond_box .sort_cond_inner_box .cond_content {
  /* background-color: #3596B5; */
  font-size: 10px;
  display: inline-block;
  width: calc(100% - 32px - 6px);
  padding: 3px;
  font-size: 10px;
  color: #fff;

  display: flex;
  flex-direction: row;
  user-select: none;
}
.sort_cond_box .sort_cond_inner_box .sort_btn {
  /* width: 32px;
  height: 32px; */
  padding: 3px;
  width: 26px;
  height: 26px;
  /* background-color: #121212; */
}
.sort_cond_box .sort_cond_inner_box .sort_btn img {
  padding: 3px;
  width: calc(100% - 6px);
  height: calc(100% - 6px);
  border-radius: 3px;
  user-select: none;
  transition: all 300ms ease;
}
.sort_cond_box .sort_cond_inner_box .sort_btn img:hover {
  /* background-color: #D3D2E2; */
  cursor: pointer;
  background-color: #d9eddf33;
}
</style>
