import { defineStore } from 'pinia'
import axios from 'axios'
import L, { polyline } from 'leaflet';
import 'leaflet-draw';

export const useLineEdit = defineStore('lineEdit', {
  state: () => ({
    editState: 0,
    lineIdx: -1,
    startNodeIdx: -1,
    endNodeIdx: -1,
    networkIdx: -1,
    startNodePos: [] as number[],
    moveEndPos: [] as number[],
    newCapacity: 5000,
    newFreeFlowTravelTime: 5,
    newICapacity: 5000,
    newIFreeFlowTravelTime: 5,
    newNodePos: 0, // 新建的节点在原始线段的相对位置
    newNodeLat: 0, // 新建节点的纬度
    newNodeLng: 0, // 新建节点的经度
    isBidirection: false,
    isAttach: true, // 新建的节点是否吸附在原路段上
    link_to_lightup: true, // 配合点击矩阵点亮选择的路段

    former_flow: 0, // 编辑路段的flow
    former_travel_time: 0, // 编辑路段的travel time
    min_fftt: 0, // 新建路段需要用到的最小的fftt
  }),
  getters: {
    // 计算属性
    new_node_pos: (state) => {
      return [state.newNodeLat, state.newNodeLng]
    },
    edit_link_len_base: (state) => {
      return (state.newFreeFlowTravelTime - state.min_fftt) / (state.former_travel_time - state.min_fftt)
    },
    edit_link_width_base: (state) => {
      return state.newCapacity / state.former_flow
    },
    edit_link_ilen_base: (state) => {
      return (state.newIFreeFlowTravelTime - state.min_fftt) / (state.former_travel_time - state.min_fftt)
    },
    edit_link_iwidth_base: (state) => {
      return state.newICapacity / state.former_flow
    }
  },
  actions: {
    startDraw() {
      if (this.editState == 0) this.editState = 1
      else this.editState = 0
      this.lineIdx = -1
      this.networkIdx = -1
      this.startNodeIdx = -1
      this.startNodePos = []
      this.endNodeIdx = -1
      this.newCapacity = 5000
      this.newFreeFlowTravelTime = 5
      this.newICapacity = 5000
      this.newIFreeFlowTravelTime = 5
    },
    endDraw() {
      this.editState = 0
      this.lineIdx = -1
      this.networkIdx = -1
      this.startNodeIdx = -1
      this.startNodePos = []
      this.endNodeIdx = -1
      this.newCapacity = 5000
      this.newFreeFlowTravelTime = 5
      this.newICapacity = 5000
      this.newIFreeFlowTravelTime = 5
      this.isBidirection = false
    },
    setNewNodePos(delta_new_lat: number, delta_new_lng: number) {
      setTimeout(() => {
        this.newNodeLat += delta_new_lat
        this.newNodeLng += delta_new_lng
        console.log('lat:', this.newNodeLat, '; lng:', this.newNodeLng)
      }, 100)
    },
    editLinkFFTT(change_val: number, oppo = false) {
      if (oppo) this.newIFreeFlowTravelTime += change_val * (this.former_travel_time-this.min_fftt)
      else this.newFreeFlowTravelTime += change_val * (this.former_travel_time-this.min_fftt)
    },
    editLinkCapacity(change_val: number, oppo = false) {
      if (oppo) {
        this.newICapacity += change_val * this.former_flow
      }
      else{
        this.newCapacity += change_val * this.former_flow
      }
    }
  }
})
