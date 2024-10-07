<script setup lang="ts">
import { useNetworksData } from '@/stores/networkData';
import { computed, ref } from 'vue';
import ColorPlanPanel from "./ColorPlanPanel.vue"

const networkData = useNetworksData()
const color_bar_bg = computed(() => {
  const res = [] as string[]
  networkData.link_color_plans.forEach((link_color_plan) => {
    let now_color_plan = "linear-gradient(to right"
    link_color_plan.forEach(color_node => {
      now_color_plan += `, rgb(${color_node[0]}, ${color_node[1]}, ${color_node[2]})`
    }) 
    now_color_plan += ")"
    res.push(now_color_plan)
  })
  if (res.length < 3) res.push("")
  return res
})

function sel_color_plan(target_color_plan_idx: number) {
  networkData.link_color_plan_sel = target_color_plan_idx
}

function switch_matrix_show_type() {
  networkData.matrix_show_type = 1 - networkData.matrix_show_type
}

function show_color_plan_new_menu() {
  networkData.personalise_color_plan_menu = !networkData.personalise_color_plan_menu
}
</script>
<template>
  <div class="main_bar">
    <div class="title_column">
      <div class="title_title" @click="switch_matrix_show_type">
        TraSculptor
      </div>
    </div>
    <div class="title_input_outer_box">
      <div class="title_input_color_box">
        <div class="input_icon_box">
          <svg xmlns="http://www.w3.org/2000/svg" id="Outline" viewBox="0 0 24 24" width="512" height="512">
            <path d="M17.115,8.05A1.5,1.5,0,1,0,18.95,9.115,1.5,1.5,0,0,0,17.115,8.05Z"/>
            <path d="M12.115,5.05A1.5,1.5,0,1,0,13.95,6.115,1.5,1.5,0,0,0,12.115,5.05Z"/>
            <path d="M7.115,8.05A1.5,1.5,0,1,0,8.95,9.115,1.5,1.5,0,0,0,7.115,8.05Z"/>
            <path d="M7.115,14.05A1.5,1.5,0,1,0,8.95,15.115,1.5,1.5,0,0,0,7.115,14.05Z"/>
            <path d="M12.5.007A12,12,0,0,0,.083,12a12.014,12.014,0,0,0,12,12c.338,0,.67-.022,1-.05a1,1,0,0,0,.916-1l-.032-3.588A3.567,3.567,0,0,1,20.057,16.8l.1.1a1.912,1.912,0,0,0,1.769.521,1.888,1.888,0,0,0,1.377-1.177A11.924,11.924,0,0,0,24.08,11.7,12.155,12.155,0,0,0,12.5.007Zm8.982,15.4-.014-.014a5.567,5.567,0,0,0-9.5,3.985L11.992,22a10,10,0,0,1,.09-20c.117,0,.235,0,.353.006a10.127,10.127,0,0,1,9.645,9.743A9.892,9.892,0,0,1,21.485,15.4Z"/>
          </svg>
        </div>
        <div class="color_sel_bar" id="color_bar1" @click="sel_color_plan(0)"
          :style="{background: color_bar_bg[0]}" :class="{sel_color_plan: networkData.link_color_plan_sel == 0}"></div>
        <div class="color_sel_bar" id="color_bar2" @click="sel_color_plan(1)"
          :style="{background: color_bar_bg[1]}" :class="{sel_color_plan: networkData.link_color_plan_sel == 1}"></div>
        <div class="color_sel_bar" @click="sel_color_plan(2)"
          :style="{background: color_bar_bg[2]}" :class="{sel_color_plan: networkData.link_color_plan_sel == 2}"
          v-show="color_bar_bg[2] != ''"></div>
        <!-- <div class="color_sel_bar"
          :style="{background: personalize_color_bg}" v-show="networkData.link_color_plan_sel == 2"></div> -->
        <div class="color_sel_more" @click="show_color_plan_new_menu">
          ···
          <ColorPlanPanel v-show="networkData.personalise_color_plan_menu" :style="{top: 'calc(100% + 15px)', right: '0px'}" />
        </div>
      </div>
      <div class="title_input_box">
          <div class="input_icon_box">
              <!-- <img src="https://www.flaticon.com/free-icon-font/under-construction_16310083#" alt="" srcset=""> -->
              <svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24">
                  <path d="m22.535,8.458L15.538,1.462c-1.952-1.952-5.128-1.952-7.08,0L1.462,8.458C.517,9.403-.004,10.661-.004,11.998s.521,2.594,1.467,3.54l6.996,6.996c.976.976,2.258,1.464,3.54,1.464s2.564-.488,3.54-1.464l6.996-6.997c1.952-1.952,1.952-5.128,0-7.08Zm-1.414,5.666l-6.996,6.997c-.568.567-1.323.88-2.126.88s-1.558-.313-2.126-.881l-6.996-6.996c-.568-.568-.881-1.323-.881-2.126s.313-1.558.881-2.126l6.996-6.996c.586-.586,1.356-.879,2.126-.879s1.54.293,2.126.879l6.997,6.996c1.172,1.172,1.172,3.08,0,4.252Zm-5.121-.124h-.209s-1.836-7.703-1.863-7.762c-.349-.764-1.088-1.238-1.928-1.238s-1.579.475-1.928,1.238c-.027.059-1.863,7.762-1.863,7.762h-.209c-.552,0-1,.448-1,1s.448,1,1,1h8c.552,0,1-.448,1-1s-.448-1-1-1Zm-3.921-6.974l.706,2.974h-1.57l.706-2.974c.032-.029.125-.029.157,0Zm-1.813,6.974l.475-2h2.52l.475,2h-3.47Z"/>
              </svg>
          </div>
          <div class="title_bar_unit">
              $
          </div>
          <input type="number" class="title_bar_input" v-model="networkData.per_edit_road_cost">
          <div class="title_bar_unit">
              M/KM
          </div>
      </div>
      <div class="title_input_box">
        <div class="input_icon_box">
          <!-- <img src="https://www.flaticon.com/free-icon-font/under-construction_16310083#" alt="" srcset=""> -->
          <svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24">
            <path d="M22,2v2H2V2H0V22H2v-7H22v7h2V2h-2Zm-5.086,4h4.172l-7,7h-4.172l7-7ZM7.086,13H2.914l7-7h4.172l-7,7Zm0-7L2,11.086V6H7.086Zm9.828,7l5.086-5.086v5.086h-5.086Z"/>
          </svg>
        </div>
        <div class="title_bar_unit">
          $
        </div>
        <input type="number" class="title_bar_input" v-model="networkData.per_close_road_cost"/>
        <div class="title_bar_unit">
          M/KM
        </div>
      </div>
      <div class="title_input_box">
        <div class="input_icon_box">
          <svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 24 24">
            <path d="m24,12v12h-2v-12c0-5.514-4.486-10-10-10S2,6.486,2,12v12H0v-12C0,5.383,5.383,0,12,0s12,5.383,12,12Zm-3.959,10h-2.041v2h-3v-2h-6v2h-3v-2h-1.961l-.128-3.228c0-1.305.215-2.55.64-3.74l1.443-4.042c.425-1.19,1.561-1.991,2.825-1.991h6.181c1.265,0,2.4.8,2.825,1.991l1.443,4.042c.425,1.191.641,2.436.641,3.7l.131,3.268ZM7.877,11.664l-.834,2.336h9.733l-.834-2.336c-.142-.397-.52-.664-.941-.664h-6.181c-.421,0-.8.267-.941.664Zm10.082,8.336l-.049-1.228c0-.967-.152-1.887-.435-2.772h-1.476v1c0,.552-.448,1-1,1s-1-.448-1-1v-1h-4v1c0,.552-.448,1-1,1s-1-.448-1-1v-1h-1.657c-.282.884-.433,1.8-.433,2.732l.051,1.268h11.999Z"/>
          </svg>
        </div>
        <div class="title_bar_unit">
          $
        </div>
        <input type="number" class="title_bar_input" v-model="networkData.per_tunnel_cost">
        <div class="title_bar_unit">
          M/KM
        </div>
      </div>
      <div class="title_input_btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="512" height="512"><g id="_01_align_center" data-name="01 align center"><path d="M7.8,20.53a2.99,2.99,0,0,1-2.121-.877L.086,14.061,1.5,12.646l5.593,5.593a1,1,0,0,0,1.414,0L22.5,4.246,23.914,5.66,9.921,19.653A2.99,2.99,0,0,1,7.8,20.53Z"/></g></svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.font.im/css?family=Oswald');
@import url('https://fonts.font.im/css?family=Pacifico');
@import url('https://fonts.font.im/css?family=Cinzel');

.main_bar {
  width: 100%;
  height: 100%;
  background-color: #dfdfdf;

  display: flex;
  flex-direction: row;
  align-items: center;
  /* box-shadow: 0px 0px 2px rgba(255,255,255,0.2); */
  box-shadow: 0px 5px 5px rgba(255, 255, 255, 0.2);

  position: relative;
}

.title_column {
  padding: 5px 10px;
  height: 40px;

  display: flex;
  flex-direction: row;
  align-items: center;
}

.title_column * {
  margin-left: 2px;
  margin-right: 2px;
}

.title_column .logo_box {
  height: 30px;
}

.title_column .logo_box img {
  height: 30px;
}

.title_column .title_title {
  color: black;
  /* font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif; */
  /* font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif; */
  /* font-family: 'Courier New'; */
  /* font-family: 'Oswald', sans-serif; */
  /* font-family: 'Pacifico', cursive; */
  font-family: 'Cinzel', serif;
  font-weight: 600;

  font-size: 30px;
  user-select: none;
  cursor: pointer;
}
</style>
<style scoped>
.title_input_box {
  height: 26px;
  width: 150px;
  padding: 3px 6px;
  border-radius: 3px;

  display: flex;
  flex-direction: row;
  align-items: center;
  margin-left: 2px;
  margin-right: 2px;

  box-shadow: 0px 0px 2px rgba(55,55,55,0.2);
  background-color: #efefef;
}
.title_input_box .input_icon_box {
  /* height: 30px;
  width: 30px; */
  height: 26px;
  width: 26px;
  margin-right: 5px;
}
.title_input_box .input_icon_box svg {
  width: 100%;
  height: 100%;
}
.title_input_box .title_bar_input {
  font-size: 18px;
  /* color: #fff; */
  border: 0;
  outline: 0;
  /* padding: 0 5px; */
  width: calc(100% - 30px - 5px - 4px);
  background-color: #efefef;
  padding: 0;

  color: #2a2a2a;
  font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
}
.title_input_box .title_bar_unit {
  /* font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif; */
  font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
  padding: 0 2px;
  color: #2a2a2a;
}

.title_input_btn {
  width: 26px;
  height: 26px;
  padding: 3px;
  border-radius: 2px;
  margin-left: 2px;
  background-color: #efefef;
  box-shadow: 0px 0px 2px rgba(55,55,55,0.2);

  user-select: none;
  cursor: pointer;
}
.title_input_btn svg {
  width: 26px;
  height: 26px;
}

.title_input_outer_box {
  /* width: 100%; */
  height: 100%;
  position: absolute;
  right: 0;
  text-align: right;
  justify-items: right;

  display: flex;
  flex-direction: row;
  align-items: center;
  margin-right: 15px;
  float: right;
}
</style>
<style scoped>
.title_input_color_box {
  height: 26px;
  /* width: 110px; */
  padding: 3px 6px;
  border-radius: 3px;

  display: flex;
  flex-direction: row;
  align-items: center;
  margin-left: 2px;
  margin-right: 2px;

  box-shadow: 0px 0px 2px rgba(55,55,55,0.2);
  background-color: #efefef;
}
.title_input_color_box .input_icon_box {
  height: 20px;
  width: 20px;
  /* height: 30px;
  width: 30px; */
  margin-right: 5px;
}
.title_input_color_box .input_icon_box svg {
  width: 100%;
  height: 100%;
}
.title_input_color_box .color_sel_bar {
  margin-left: 5px;
  margin-right: 5px;
  width: 18px;
  height: 18px;
  border-radius: 2px;
  border: 2px solid #6a6b6c;

  cursor: pointer;
}
.title_input_color_box .color_sel_bar.sel_color_plan {
  border-color: #2a2b2c;
}

.title_input_color_box .color_sel_more {
  /* font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif; */
  font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
  font-weight: 600;
  padding: 0 2px;
  color: #2a2a2a;
  user-select: none;
  cursor: pointer;

  position: relative;
}
/* .color_sel_bar {

} */
</style>