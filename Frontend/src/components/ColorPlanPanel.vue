<script setup lang="ts">
import { useNetworksData } from '@/stores/networkData';
import { computed, ref, onMounted, watch } from 'vue';

const networkData = useNetworksData()
const now_sel_view = ref(0)
const now_sel_color_bar = ref(0)
function sel_color_bar(view_idx: number, bar_idx: number) {
  now_sel_view.value = view_idx
  now_sel_color_bar.value = bar_idx
}
const map_view_gradients_data = computed(() => {
  const res = [] as {bg: string, pos: number, w: number}[]
  const color_len = networkData.personalize_color_plan.length-1
  for (let c_idx=0; c_idx<color_len; c_idx += 1) {
    const now_c = networkData.personalize_color_plan[c_idx]
    const later_c = networkData.personalize_color_plan[c_idx+1]
    const c1 = `rgb(${now_c[0]}, ${now_c[1]}, ${now_c[2]})`
    const c2 = `rgb(${later_c[0]}, ${later_c[1]}, ${later_c[2]})`
    res.push({
      bg: `linear-gradient(to right, ${c1}, ${c2})`,
      pos: c_idx/color_len*100,
      w: 1/color_len*100
    })
  }
  return res
})
const map_view_gradient_bars_data = computed(() => {
  const res = [] as {bg: string, pos: number}[]
  const color_len = networkData.personalize_color_plan.length-1
  for (let c_idx=0; c_idx<color_len+1; c_idx += 1) {
    const now_c = networkData.personalize_color_plan[c_idx]
    const c = `rgb(${now_c[0]}, ${now_c[1]}, ${now_c[2]})`
    res.push({
      bg: c,
      pos: c_idx/color_len*100
    })
  }
  return res
})
const comparison_view_gradients_data = computed(() => {
  const res = [] as {bg: string, pos: number, w: number}[]
  const color_len = networkData.personalize_bg_color_plan.length-1
  for (let c_idx=0; c_idx<color_len; c_idx += 1) {
    const now_c = networkData.personalize_bg_color_plan[c_idx]
    const later_c = networkData.personalize_bg_color_plan[c_idx+1]
    const c1 = `rgb(${now_c[0]}, ${now_c[1]}, ${now_c[2]})`
    const c2 = `rgb(${later_c[0]}, ${later_c[1]}, ${later_c[2]})`
    res.push({
      bg: `linear-gradient(to right, ${c1}, ${c2})`,
      pos: c_idx/color_len*100,
      w: 1/color_len*100
    })
  }
  return res
})
const comparison_view_gradient_bars_data = computed(() => {
  const res = [] as {bg: string, pos: number}[]
  const color_len = networkData.personalize_bg_color_plan.length-1
  for (let c_idx=0; c_idx<color_len+1; c_idx += 1) {
    const now_c = networkData.personalize_bg_color_plan[c_idx]
    const c = `rgb(${now_c[0]}, ${now_c[1]}, ${now_c[2]})`
    res.push({
      bg: c,
      pos: c_idx/color_len*100
    })
  }
  return res
})

// color transfer
/**
 * Convert HSL to RGB
 * @param x - The HSL color
 * @param y - The HSL color
 * @param l - The HSL color
 * @returns The RGB color
 */
function panelToRgb(x: number, y: number, l: number) {
  // solve black situation
  if (l == 0) {
    return {r: 0, g: 0, b: 0}
  }

  let r=0, g=0, b=0
  if (x >= 1/6 && x < 1/2) {
    g = 255
  } else if (x >= 1/2 && x < 5/6) {
    b = 255
  } else {
    r = 255
  }
  if (x >= 1/6 && x < 1/3) {
    r = 255*(1/3 - x) * 6
    r += (255-r)*y
  } else if (x >= 2/3 && x < 5/6) {
    r = 255*(x - 2/3) * 6
    r += (255-r)*y
  }
  if (x >= 0 && x < 1/6) {
    g = 255 * x * 6
    g += (255-g)*y
  } else if (x >= 1/2 && x < 2/3) {
    g = 255*(2/3 - x) * 6
    g += (255-g)*y
  }
  if (x >= 1/3 && x < 1/2) {
    b = 255*(x - 1/3)*6
    b += (255-b)*y
  } else if (x >= 5/6) {
    b = 255 * (1 - x) * 6
    b += (255-b)*y
  }

  if (x >= 0 && x < 1/3) {
    b = 255*y
  } else if (x >= 1/3 && x < 2/3) {
    r = 255*y
  } else {
    g = 255*y
  }

  r *= l
  g *= l
  b *= l

  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

/**
 * Convert RGB to Panel Color
 * @param r - The RGB color
 * @param g - The RGB color
 * @param b - The RGB color
 * @returns The Panel color
 */
function rgbToPanel(r: number, g: number, b: number) {
    let x = 0, y = 0, l = 0

    const max_channel = Math.max(r, g, b)
    if (max_channel == 0) {
      return {x: 255, y: 255, l: 255}
    }
    l = max_channel / 255
    if (max_channel < 255) {
      r *= (255 / max_channel)
      g *= (255 / max_channel)
      b *= (255 / max_channel)
    }
    const new_min_channel = Math.min(r, g, b)
    if (new_min_channel == r) {
      y = r / 255
    } else if (new_min_channel == g) {
      y = g / 255
    } else if (new_min_channel == b) {
      y = b / 255
    }

    if (y == 1) {
      x = 0
    } else {
    const new_max_channel = Math.max(r, g, b)
      if (new_max_channel == r) {
        if (g > b) {
          g = (g - 255*y)/(1-y)
          x = g / 255 / 6
        } else {
          b = (b - 255*y)/(1-y)
          x = 1 - b / 255 / 6
        }
      } else if (new_max_channel == g) {
        if (r > b) {
          r = (r - 255*y)/(1-y)
          x = 1/3 - r / 255 / 6
        } else {
          b = (b - 255*y)/(1-y)
          x = 1/3 + b / 255 / 6
        }
      } else if (new_max_channel == b) {
        if (g > r) {
          g = (g - 255*y)/(1-y)
          x = 2/3 - g / 255 / 6
        } else {
          r = (r - 255*y)/(1-y)
          x = 2/3 + r / 255 / 6
        }
      }
    }


    return {
      x: x,
      y: y,
      l: l,
    };
}

const now_panel_color = ref({x: 0, y: 0, l: 0})
function set_by_hsl_color(x: number, y: number, l: number) {
  if (l <= 0) l = 0.0001
  now_panel_color.value = {x: x, y: y, l: l}
  const rgb_color = panelToRgb(x,y,l)
  if (now_sel_view.value == 0) {
    if (now_sel_color_bar.value < networkData.personalize_color_plan.length) {
      networkData.personalize_color_plan[now_sel_color_bar.value] = [rgb_color.r, rgb_color.g, rgb_color.b]
    }
  } else if (now_sel_view.value == 1) {
    if (now_sel_color_bar.value < networkData.personalize_bg_color_plan.length) {
      networkData.personalize_bg_color_plan[now_sel_color_bar.value] = [rgb_color.r, rgb_color.g, rgb_color.b]
    }
  }
}
function drag_color_bar(event: MouseEvent) {
  // console.log("event: ", event);
  
  if (event.button == 0 && event.buttons == 1) {
    const panel_container = document.getElementById("color_choose_panel") as HTMLElement
    const cont_rect = panel_container.getBoundingClientRect()
    let new_x = (event.clientX - cont_rect.left)/cont_rect.width
    let new_y = (event.clientY - cont_rect.top)/cont_rect.height
    if (new_x < 0) new_x = 0
    else if (new_x > 1) new_x = 1
    if (new_y < 0) new_y = 0
    else if (new_y > 1) new_y = 1
    
    set_by_hsl_color(new_x, new_y, now_panel_color.value.l)
  }
}
function now_edit_color() {
  if (now_sel_view.value == 0) {
    if (now_sel_color_bar.value >= networkData.personalize_color_plan.length) {
      now_sel_color_bar.value = 0
    }
    const now_color = networkData.personalize_color_plan[now_sel_color_bar.value]
    const max_channel = Math.max(...now_color)
    let full_color = [255,255,255]
    if (max_channel != 0)
      full_color = [now_color[0]*255/max_channel, now_color[1]*255/max_channel, now_color[2]*255/max_channel]
    return {
      color_str: `rgb(${now_color[0]}, ${now_color[1]}, ${now_color[1]})`,
      f_color_str: `rgb(${full_color[0]}, ${full_color[1]}, ${full_color[2]})`,
    }
  } else {
    if (now_sel_color_bar.value >= networkData.personalize_bg_color_plan.length) {
      now_sel_color_bar.value = 0
    }
    const now_color = networkData.personalize_bg_color_plan[now_sel_color_bar.value]
    const max_channel = Math.max(...now_color)
    let full_color = [255,255,255]
    if (max_channel != 0)
      full_color = [now_color[0]*255/max_channel, now_color[1]*255/max_channel, now_color[2]*255/max_channel]
    return {
      color_str: `rgb(${now_color[0]}, ${now_color[1]}, ${now_color[1]})`,
      f_color_str: `rgb(${full_color[0]}, ${full_color[1]}, ${full_color[2]})`,
    }
  }
}
const now_edit_color_val = computed(() => {
  if (now_sel_view.value == 0) {
    if (now_sel_color_bar.value < networkData.personalize_color_plan.length) {
      const now_color = networkData.personalize_color_plan[now_sel_color_bar.value]
      return now_color
    } else return [255,255,255]
  } else {
    if (now_sel_color_bar.value < networkData.personalize_bg_color_plan.length) {
      const now_color = networkData.personalize_bg_color_plan[now_sel_color_bar.value]
      return now_color
    }else return [255,255,255]
  }
})

// edit color by input
const red_val4input = ref(0)
const green_val4input = ref(0)
const blue_val4input = ref(0)
watch(() => now_edit_color_val.value, (newValue) => {
  red_val4input.value = newValue[0]
  green_val4input.value = newValue[1]
  blue_val4input.value = newValue[2]
  const panel_color = rgbToPanel(newValue[0], newValue[1], newValue[2])
  now_panel_color.value = panel_color
}, {deep: true})
function input_color_value(channel_idx: number) {
  let color_obj = []
  if (now_sel_view.value == 0) {
    if (now_sel_color_bar.value < networkData.personalize_color_plan.length) {
      color_obj = networkData.personalize_color_plan[now_sel_color_bar.value]
    }
  } else {
    if (now_sel_color_bar.value < networkData.personalize_bg_color_plan.length) {
      color_obj = networkData.personalize_bg_color_plan[now_sel_color_bar.value]
    }
  }
  if (channel_idx == 0) {
    color_obj[0] = red_val4input.value
  } else if (channel_idx == 1) {
    color_obj[1] = green_val4input.value
  } else {
    color_obj[2] = blue_val4input.value
  }
  const rgb_color = networkData.personalize_color_plan[0]
  const panel_color = rgbToPanel(rgb_color[0], rgb_color[1], rgb_color[2])
  now_panel_color.value = panel_color
}

// reset lightness
function drag_lightness_bar(event: MouseEvent) {
  if (event.button == 0 && event.buttons == 1) {
    const panel_container = document.getElementById("lightness_choose_panel") as HTMLElement
    const cont_rect = panel_container.getBoundingClientRect()
    let new_y = (cont_rect.top + cont_rect.height - event.clientY) / cont_rect.height
    if (new_y < 0) new_y = 0
    else if (new_y > 1) new_y = 1
    set_by_hsl_color(now_panel_color.value.x, now_panel_color.value.y, new_y)
  }
}

// confirm new plan
function confirm_new_color_plan() {
  const color_plan = [] as number[][]
  const matrix_color_plan = [] as number[][]
  networkData.personalize_color_plan.forEach((now_color) => {
    color_plan.push([now_color[0], now_color[1], now_color[2]])
  })
  networkData.personalize_bg_color_plan.forEach((now_color) => {
    matrix_color_plan.push([now_color[0], now_color[1], now_color[2]])
  })
  if (networkData.link_color_plans.length >= 3) {
    networkData.link_color_plans[2] = color_plan
    networkData.matrix_bg_color_plans[2] = matrix_color_plan
  } else {
    networkData.link_color_plans.push(color_plan)
    networkData.matrix_bg_color_plans.push(matrix_color_plan)
  }
  networkData.link_color_plan_sel = 2
  networkData.personalise_color_plan_menu = false
}

function cancel_new_color_plan() {
  networkData.personalise_color_plan_menu = false
}

onMounted(() => {
  const rgb_color = networkData.personalize_color_plan[0]
  const panel_color = rgbToPanel(rgb_color[0], rgb_color[1], rgb_color[2])
  now_panel_color.value = panel_color
  red_val4input.value = rgb_color[0]
  green_val4input.value = rgb_color[1]
  blue_val4input.value = rgb_color[2]
})
</script>
<template>
  <div class="color_gradient_set_menu" @click="$event.stopPropagation()">
    <div class="menu_content">
        <div class="col_btn_box">
          <div class="edit_btn" title="Cancel"  @click="cancel_new_color_plan">
            <img src="/static/edits_btn/cancel.svg" alt="" srcset="" />
          </div>
          <div class="edit_btn" title="Save" @click="confirm_new_color_plan">
            <img src="/static/edits_btn/save.svg" alt="" srcset="" />
          </div>
        </div>
        <div class="gradients_outer_box">
            <div class="input_pair">
                <div class="input_title">
                    Map View
                </div>
                <div class="input_rect">
                    <div class="gradient_bar" v-for="bar_obj, b_idx in map_view_gradient_bars_data" :key="b_idx"
                      :style="{left: `calc(-4px + ${bar_obj.pos}%)`, backgroundColor: bar_obj.bg}"
                      :class="{unsel: now_sel_view!=0 || now_sel_color_bar!=b_idx}"
                      @click="sel_color_bar(0, b_idx)"></div>
                    <div class="gradient_area_box">
                        <div class="gradient_area"
                          v-for="color_grad_obj, c_g_idx in map_view_gradients_data" :key="c_g_idx"
                          :style="{width:  color_grad_obj.w + '%', left: color_grad_obj.pos + '%', background: color_grad_obj.bg }"
                        ></div>
                    </div>
                </div>
            </div>
            <div class="input_pair">
                <div class="input_title">
                    Conparison View
                </div>
                <div class="input_rect">
                    <div class="gradient_bar" v-for="bar_obj, b_idx in comparison_view_gradient_bars_data" :key="b_idx"
                      :style="{left: `calc(-4px + ${bar_obj.pos}%)`, backgroundColor: bar_obj.bg}"
                      :class="{unsel: now_sel_view!=1 || now_sel_color_bar!=b_idx}"
                      @click="sel_color_bar(1, b_idx)"></div>
                    <div class="gradient_area_box">
                        <div class="gradient_area"
                          v-for="color_grad_obj, c_g_idx in comparison_view_gradients_data" :key="c_g_idx"
                          :style="{width:  color_grad_obj.w + '%', left: color_grad_obj.pos + '%', background: color_grad_obj.bg }"
                        ></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="color_panel_box" id="color_choose_panel"
          @mousemove="drag_color_bar">
          <div class="color_inner_panel"></div>
          <div class="white_inner_panel"></div>
          <div class="color_select_bar"
            :style="{left: `calc(-5px + ${now_panel_color.x*100}%)`, top: `calc(-5px + ${now_panel_color.y*100}%)`,
              backgroundColor: now_edit_color().f_color_str
            }">
            <div class="colors_number_title">
                <div class="title_content">
                <div class="input_pair">
                    <div>Red</div>
                    <input type="number" max="255" min="0" step="16" name="" id="" v-model="red_val4input"
                      @change="input_color_value(0)">
                </div>
                <div class="input_pair">
                    <div>Green</div>
                    <input type="number" max="255" min="0" step="16" name="" id="" v-model="green_val4input"
                      @change="input_color_value(1)">
                </div>
                <div class="input_pair">
                    <div>Blue</div>
                    <input type="number" max="255" min="0" step="16" name="" id="" v-model="blue_val4input"
                      @change="input_color_value(2)">
                </div>
                </div>
            </div>
          </div>
            <!-- <div class="test" style="position: absolute; left: 10px; top: 10px;height: 100px;width: 100px;background-color: #c45961; z-index: 99;" ></div> -->
        </div>
        <div class="lightness_panel_box" id="lightness_choose_panel"
          @mousemove="drag_lightness_bar">
            <div class="inner_panel"
              :style="{backgroundColor: now_edit_color().f_color_str}"></div>
            <div class="inner_panel lightness_panel"></div>
            <div class="lightness_bar"
              :style="{bottom: `calc(${now_panel_color.l*100}% - 5.7px)`, backgroundColor: now_edit_color().color_str}">
              <div class="colors_number_title">
                  <div class="title_content">
                  <div class="input_pair">
                      <div>Red</div>
                      <input type="number" max="255" min="0" step="16" name="" id="" v-model="red_val4input"
                        @change="input_color_value(0)">
                  </div>
                  <div class="input_pair">
                      <div>Green</div>
                      <input type="number" max="255" min="0" step="16" name="" id="" v-model="green_val4input"
                        @change="input_color_value(1)">
                  </div>
                  <div class="input_pair">
                      <div>Blue</div>
                      <input type="number" max="255" min="0" step="16" name="" id="" v-model="blue_val4input"
                        @change="input_color_value(2)">
                  </div>
                  </div>
              </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.color_gradient_set_menu {
  position: absolute;
  border-radius: 5px;
  background-color: #232323ee;
  color: #fff;

  
  position: absolute;
  /* left: 10px; */
  /* top: 10px; */
  z-index: 9;
}
.color_gradient_set_menu .menu_content {
  width: 100%;
  height: 100%;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-items: center;
  text-align: center;
}
.color_gradient_set_menu .col_btn_box {
  user-select: none;
  width: 50px;
}
.edit_btn {
  display: inline-block;
  width: 30px;
  height: 30px;
  padding: 5px;
  border-radius: 3px;
  margin: 5px;
  background-color: #33333399;
  user-select: none;
}
.edit_btn:hover {
  background-color: #121212;
  cursor: pointer;
}
.edit_btn img {
  height: 30px;
  width: 30px;
}
.color_gradient_set_menu .gradients_outer_box {
  width: 85px;
  padding: 5px;
  height: calc(100% - 10px);
  /* vertical-align: top; */

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.color_gradient_set_menu .gradients_outer_box .input_pair {
  width: 100%;
  padding: 3px 0;
  /* margin-bottom: 1px; */
}
.color_gradient_set_menu .gradients_outer_box .input_pair .input_title {
  text-align: left;
  font-size: 10px;
  /* height: 13px; */
  width: 100%;
  user-select: none;

  font-family: sans-serif;
  font-weight: normal;
}
.color_gradient_set_menu .gradients_outer_box .input_pair .input_rect {
  width: calc(100% - 10px);
  height: 20px;
  text-align: center;
  margin: 2px 5px;
  margin-top: 5px;
  position: relative;
  cursor: pointer;
}
.color_gradient_set_menu .gradients_outer_box .input_pair .input_rect > .gradient_area_box {
    height: 100%;
    width: 100%;
    border: 1px solid #fff;
    border-radius: 3px;
    overflow: hidden;

    
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
}
.color_gradient_set_menu .gradients_outer_box .input_pair .input_rect > .gradient_area_box > .gradient_area {
    height: 100%;
}
.color_gradient_set_menu .gradients_outer_box .input_pair .input_rect > .gradient_bar {
    width: 8px;
    height: 24px;
    top: calc(50% - 12px);
    left: -4px;
    border-radius: 3px;
    border: 1px solid white;
    /* fill-opacity: 0.5; */
    background-color: #2b957f;
    /* opacity: 0.6; */
    position: absolute;
}
.color_gradient_set_menu .gradients_outer_box .input_pair .input_rect > .gradient_bar.unsel {
  opacity: 0.6;
}
.color_gradient_set_menu .color_panel_box {
  width: 80px;
  height: 80px;

  margin: 5px;
  border: 1px solid white;
  border-radius: 3px;
  background: linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,1));

  /* overflow: hidden; */
  position: relative;
  cursor: pointer;
}
.color_gradient_set_menu .color_panel_box>.color_inner_panel {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(to right, rgb(255,0,0), rgb(255,255,0),rgb(0,255,0),rgb(0,255,255),rgb(0,0,255),rgb(255,0,255),rgb(255,0,0));
}
.color_gradient_set_menu .color_panel_box>.white_inner_panel {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1));
}
.color_gradient_set_menu .color_panel_box>.color_select_bar{
  width: 8px;
  height: 8px;
  border: 2px solid #fff;
  border-radius: 50%;

  position: absolute;
  /* left: 10px;
  top: 10px; */
  /* left: -5px;
  top: -5px; */
  cursor: pointer;
}
.color_gradient_set_menu .lightness_panel_box {
  height: 80px;
  width: 8px;
  margin: 5px;
  margin-right: 10px;
  border: 1px solid #fff;
  border-radius: 5px;

  position: relative;
  cursor: pointer;
}
.color_gradient_set_menu .lightness_panel_box>.inner_panel {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 5px;
}
.color_gradient_set_menu .lightness_panel_box>.inner_panel.lightness_panel {
  background: linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,1));
}
.color_gradient_set_menu .lightness_panel_box>.lightness_bar {
  width: 8px;
  height: 8px;
  border: 2px solid #fff;
  border-radius: 50%;

  position: absolute;
  left: calc(50% - 5.7px);
  /* top: -5.7px; */
  cursor: pointer;
}
</style>
<style scoped>
.color_gradient_set_menu .color_select_bar:hover .colors_number_title,
.color_gradient_set_menu .lightness_bar:hover .colors_number_title {
  display: block;
}

.colors_number_title {
  display: none;
  position: absolute;
  left: 0;
  top: 0;
  padding-left: 10px;
  padding-top: 10px;

  z-index: 10;
}
.colors_number_title > .title_content {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;

  background-color: #232323ee;
  border: 1px solid rgba(255,255,255,0.8);
  border-radius: 3px;
  padding: 0 5px;
}
.colors_number_title > .title_content  > .input_pair {
  width: 50px;
  display: flex;
  flex-direction: column;
  justify-content: left;
  align-items: center;
  padding: 5px;
}
.colors_number_title > .title_content  > .input_pair >div {
  text-align: left;
  font-size: 10px;
  width: 100%;
  user-select: none;
}
.colors_number_title > .title_content  > .input_pair >input {
  border: 1px solid #fff;
  background: none;
  width: calc(100% - 2px);
  
  font-size: 12px;
  color: #fff;
  height: 16px;
  padding: 0 3px;

  margin: 0;
  margin-top: 3px;
  border: 1px solid #fff;
  border-radius: 5px;
  outline: 0;
}
</style>
