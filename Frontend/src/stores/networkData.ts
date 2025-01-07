import { defineStore } from 'pinia'
import axios from 'axios'

const backend_url = 'http://localhost:8081'

interface tsNode {
  lat: number
  lon: number
  id: number
  globalId: number
  isOd: boolean
}

interface tsLink {
  pInNode: number
  pOutNode: number
  id: number
  freeFlowTravelTime: number
  travelTime: number
  flow: number
  capacity: number
  speed: number
  globalId: number
  originDemand: number[][]
  len: number
}

interface tsEditLog {
  edit_type: number
  edit_on_this: boolean
}

interface tsNetwork {
  title: string
  desc: string
  id: number
  father: number
  nodes: tsNode[]
  links: tsLink[]
  avgFlow: number
  avgSpeed: number
  costSum: number
  editLog: tsEditLog[]
}

interface reqLinksGlobalInfo {
  fftt: number[][]
  travelTime: number[][]
  speed: number[][]
  capacity: number[][]
  flow: number[][]
  flowRatio: number[][]
}
interface reqGlobalInfo {
  minAvgFlow: number
  maxAvgFlow: number
  allAvgFlow: number
  minAvgSpeed: number
  maxAvgSpeed: number
  allAvgSpeed: number
  minCostsSum: number
  maxCostsSum: number
  avgCostsSum: number

  minDiffAvgFlow: number
  maxDiffAvgFlow: number
  minDiffAvgSpeed: number
  maxDiffAvgSpeed: number
  minDiffCostSum: number
  maxDiffCostSum: number

  globalLinksInfo: reqLinksGlobalInfo
  linksPos: number[][]
  nodesPos: number[][]
}

export interface networkEditNumber {
  edit_links_len: number,
  new_tunnel_num: number,
  close_links_len: number,
}

export const useNetworksData = defineStore('networksInfo', {
  state: () => ({
    networksInfoArr: [] as tsNetwork[],
    matrix_change: true, // 判断matrix是否发生变化
    networksAsFilter: [] as boolean[],
    networksFatherIdx: [] as number[],
    networksEditQuantity: [] as networkEditNumber[],
    // max_avg_flow: -1,
    // min_avg_flow: -1,
    // max_avg_speed: -1,
    // min_avg_speed: -1,
    max_cost_sum: -1,
    min_cost_sum: -1,
    // min_diff_avg_flow: -1,
    // max_diff_avg_flow: -1,
    // min_diff_avg_speed: -1,
    // max_diff_avg_speed: -1,
    min_diff_cost_sum: -1,
    max_diff_cost_sum: -1,

    // 每条路段各自的信息
    // links_speed_scope: [] as number[][],
    // links_flow_scope: [] as number[][],
    // 过滤需要的link信息
    links_avg_fftt: [] as number[],
    links_avg_capacity: [] as number[],
    links_avg_time: [] as number[],
    links_tt_scope: [] as number[],
    links_tt_ratio: [] as number[],
    links_tt_ratio_scope: [] as number[],
    links_avg_flow: [] as number[],
    links_tf_scope: [] as number[],
    links_tf_ratio: [] as number[],
    links_tf_ratio_scope: [] as number[],

    link_number_matrix: 10,
    linksPos: [] as number[][],
    nodesPos: [] as number[][],
    linksAltTop: [] as boolean[],

    // 过滤器相关的属性
    filter_bounds: [
      [0, 8],
      [0, 8],
      [0, 8],
      [0, 8],
      [0, 8],
      [0, 8],
      [0, 8],
      [0, 8]
    ],
    links_if_sel: [] as boolean[],
    sorted_cond: [] as { cond_idx: number; sorted_reverse: boolean }[],

    // 矩阵中每个块颜色的属性
    global_links_init_sumcost: [] as number[],
    matrix_element_radius: 0,

    // link的颜色方案
    link_color_plan_sel: 1,
    link_color_plans: [
      [
        [255, 33, 33],
        [255, 255, 33],
        [33, 255, 33]
      ],
      [
        [255, 133, 33],
        [133, 193, 255]
      ]
    ],
    matrix_bg_color_plans: [
      [
        [255, 33, 33],
        [255, 255, 255],
        [33, 255, 33]
      ],
      [
        [255, 133, 33],
        [255, 255, 255],
        [133, 193, 255]
      ]
    ],
    personalize_color_plan: [
      [255, 33, 33],
      [255, 255, 33],
      [33, 255, 33]
    ] as number[][],
    personalize_bg_color_plan: [
      [255, 33, 33],
      [255, 255, 255],
      [33, 255, 33]
    ] as number[][],
    personalise_color_plan_menu: false,

    // matrix的类型
    matrix_show_type: 0,

    per_tunnel_len: 500,
    per_tunnel_cost: 14,
    per_edit_road_cost: 4,
    per_close_road_cost: 0
  }),
  getters: {
    // 所有网络的编辑日志
    all_edit_logs: (state) => {
      const res = new Array<tsEditLog[]>()
      for (let i = 0; i < state.networksInfoArr.length; i++) {
        res.push(state.networksInfoArr[i].editLog)
      }
      return res
    },
    // 最新的网络的id
    last_network_idx: (state) => {
      return state.networksInfoArr.length - 1
    },
    // 所有网络中各路段的取值范围
    all_flow_scope: (state) => {
      const res = [100000, 0, 0]
      let link_num = 0
      for (let i = 0; i < state.networksInfoArr.length; i++) {
        for (let j = 0; j < state.networksInfoArr[i].links.length; j++) {
          const now_link_val = state.networksInfoArr[i].links[j].flow
          if (now_link_val < res[0]) res[0] = now_link_val
          if (now_link_val > res[1]) res[1] = now_link_val

          // 统计总数
          link_num += 1
        }
      }
      // 计算均值
      for (let i = 0; i < state.networksInfoArr.length; i++) {
        for (let j = 0; j < state.networksInfoArr[i].links.length; j++) {
          const now_link_val = state.networksInfoArr[i].links[j].flow
          // 统计均值
          res[2] += now_link_val / link_num
        }
      }
      return res
    },
    all_capacity_scope: (state) => {
      const res = [100000, 0, 0]
      let link_num = 0
      for (let i = 0; i < state.networksInfoArr.length; i++) {
        for (let j = 0; j < state.networksInfoArr[i].links.length; j++) {
          const now_link_val = state.networksInfoArr[i].links[j].capacity
          if (now_link_val < res[0]) res[0] = now_link_val
          if (now_link_val > res[1]) res[1] = now_link_val

          // 统计总数
          link_num += 1
        }
      }
      // 计算均值
      for (let i = 0; i < state.networksInfoArr.length; i++) {
        for (let j = 0; j < state.networksInfoArr[i].links.length; j++) {
          const now_link_val = state.networksInfoArr[i].links[j].capacity
          // 统计均值
          res[2] += now_link_val / link_num
        }
      }
      return res
    },
    all_flow_ratio_scope: (state) => {
      const res = [100000, 0, 0]
      let link_num = 0
      for (let i = 0; i < state.networksInfoArr.length; i++) {
        for (let j = 0; j < state.networksInfoArr[i].links.length; j++) {
          const now_link_val =
            state.networksInfoArr[i].links[j].flow / state.networksInfoArr[i].links[j].capacity
          if (now_link_val < res[0]) res[0] = now_link_val
          if (now_link_val > res[1]) res[1] = now_link_val

          // 统计总数
          link_num += 1
          res[2] += now_link_val
        }
      }
      // 计算均值
      res[2] /= link_num
      return res
    },
    all_traveltime_scope: (state) => {
      const res = [100000, 0, 0]
      let link_num = 0
      for (let i = 0; i < state.networksInfoArr.length; i++) {
        for (let j = 0; j < state.networksInfoArr[i].links.length; j++) {
          const now_link_val = state.networksInfoArr[i].links[j].travelTime
          if (now_link_val < res[0]) res[0] = now_link_val
          if (now_link_val > res[1]) res[1] = now_link_val

          // 统计总数
          link_num += 1
          res[2] += now_link_val
        }
      }
      // 计算均值
      res[2] /= link_num
      return res
    },
    all_fftt_scope: (state) => {
      const res = [100000, 0, 0]
      let link_num = 0
      for (let i = 0; i < state.networksInfoArr.length; i++) {
        for (let j = 0; j < state.networksInfoArr[i].links.length; j++) {
          const now_link_val = state.networksInfoArr[i].links[j].freeFlowTravelTime
          if (now_link_val < res[0]) res[0] = now_link_val
          if (now_link_val > res[1]) res[1] = now_link_val

          // 统计总数
          link_num += 1
          res[2] += now_link_val
        }
      }
      // 计算均值
      res[2] /= link_num
      return res
    },
    all_speed_scope: (state) => {
      const res = [100000, 0, 0]
      let link_num = 0
      for (let i = 0; i < state.networksInfoArr.length; i++) {
        for (let j = 0; j < state.networksInfoArr[i].links.length; j++) {
          const now_link_val =
            state.networksInfoArr[i].links[j].freeFlowTravelTime /
            state.networksInfoArr[i].links[j].travelTime
          if (now_link_val < res[0]) res[0] = now_link_val
          if (now_link_val > res[1]) res[1] = now_link_val

          // 统计总数
          link_num += 1
          res[2] += now_link_val
        }
      }
      // 计算均值
      res[2] /= link_num
      return res
    },
    historgram_data: (state) => {
      // 'Average Free Flow Travel Time',
      // 'Travel Time Scope',
      // 'Travel Time Ratio',
      // 'Travel Time Ratio Scope',
      // 'Average Capacity',
      // 'Travel Flow Scope',
      // 'Travel Flow Ratio',
      // 'Travel Flow Ratio Scope'
      const bars_data = [] as number[][]
      const bars_scope = [] as number[][]
      for (let i = 0; i < 8; i++) {
        bars_data.push([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
        bars_scope.push([100000, 0])
      }

      // 计算取值范围
      for (let i = 0; i < state.links_avg_time.length; i++) {
        if (
          state.links_avg_time[i] != -1 &&
          state.links_tt_ratio[i] != -1 &&
          state.links_avg_flow[i] != -1 &&
          state.links_tf_ratio[i] != -1
        ) {
          // fftt
          if (state.links_avg_fftt[i] < bars_scope[0][0]) bars_scope[0][0] = state.links_avg_fftt[i]
          if (state.links_avg_fftt[i] > bars_scope[0][1]) bars_scope[0][1] = state.links_avg_fftt[i]

          // tt ratio
          if (state.links_tt_ratio[i] < bars_scope[2][0]) bars_scope[2][0] = state.links_tt_ratio[i]
          if (state.links_tt_ratio[i] > bars_scope[2][1]) bars_scope[2][1] = state.links_tt_ratio[i]

          // capacity
          if (state.links_avg_capacity[i] < bars_scope[4][0])
            bars_scope[4][0] = state.links_avg_capacity[i]
          if (state.links_avg_capacity[i] > bars_scope[4][1])
            bars_scope[4][1] = state.links_avg_capacity[i]

          // flow ratio
          if (state.links_tf_ratio[i] < bars_scope[6][0]) bars_scope[6][0] = state.links_tf_ratio[i]
          if (state.links_tf_ratio[i] > bars_scope[6][1]) bars_scope[6][1] = state.links_tf_ratio[i]
        }
        // tt scope
        if (state.links_tt_scope[i] < bars_scope[1][0]) bars_scope[1][0] = state.links_tt_scope[i]
        if (state.links_tt_scope[i] > bars_scope[1][1]) bars_scope[1][1] = state.links_tt_scope[i]
        // console.log('tt scope: ', state.links_tt_scope)

        // tt ratio scope
        if (state.links_tt_ratio_scope[i] < bars_scope[3][0])
          bars_scope[3][0] = state.links_tt_ratio_scope[i]
        if (state.links_tt_ratio_scope[i] > bars_scope[3][1])
          bars_scope[3][1] = state.links_tt_ratio_scope[i]

        // f scope
        if (state.links_tf_scope[i] < bars_scope[5][0]) bars_scope[5][0] = state.links_tf_scope[i]
        if (state.links_tf_scope[i] > bars_scope[5][1]) bars_scope[5][1] = state.links_tf_scope[i]

        // flow ratio scope
        if (state.links_tf_ratio_scope[i] < bars_scope[7][0])
          bars_scope[7][0] = state.links_tf_ratio_scope[i]
        if (state.links_tf_ratio_scope[i] > bars_scope[7][1])
          bars_scope[7][1] = state.links_tf_ratio_scope[i]
      }
      // console.log('capacity scope: ', bars_scope[4])

      // 计算bar高度
      const links_info_arr = [
        state.links_avg_fftt,
        state.links_tt_scope,
        state.links_tt_ratio,
        state.links_tt_ratio_scope,
        state.links_avg_capacity,
        state.links_tf_scope,
        state.links_tf_ratio,
        state.links_tf_ratio_scope
      ]
      for (let i = 0; i < state.links_avg_time.length; i++) {
        let bar_idx = 0
        const now_if_sel = state.links_if_sel[i]
        for (let j = 0; j < 8; j++) {
          // 假如该路段不存在该信息，则跳过
          if (links_info_arr[j][i] == -1) continue
          if (bars_scope[j][0] != bars_scope[j][1]) {
            bar_idx = Math.min(
              Math.floor(
                ((links_info_arr[j][i] - bars_scope[j][0]) /
                  (bars_scope[j][1] - bars_scope[j][0])) *
                  8
              ),
              7
            )
          } else bar_idx = 7
          // 判断放在上bar还是下中
          if (now_if_sel) bars_data[j][bar_idx + 8] += 1
          else bars_data[j][bar_idx] += 1
        }
      }
      return {
        graph_data: bars_data,
        graph_scope: bars_scope
      }
    },
    sel_links_global_idx: (state) => {
      const res = [] as number[]
      const show_link_info = [] as number[][]
      for (let i = 0; i < state.links_if_sel.length; i++) {
        if (state.links_if_sel[i]) {
          show_link_info.push([
            i,
            state.links_avg_fftt[i],
            state.links_tt_scope[i],
            state.links_tt_ratio[i],
            state.links_tt_ratio_scope[i],
            state.links_avg_capacity[i],
            state.links_tf_scope[i],
            state.links_tf_ratio[i],
            state.links_tf_ratio_scope[i]
          ])
        }
      }
      // 对showid进行排序
      if (state.sorted_cond.length > 0)
        show_link_info.sort((a, b) => {
          let res = 0
          for (let i = state.sorted_cond.length - 1; i >= 0; i--) {
            const now_sort_cond = state.sorted_cond[i]
            res = a[now_sort_cond.cond_idx + 1] - b[now_sort_cond.cond_idx + 1]
            if (now_sort_cond.sorted_reverse) res = -res
            if (res != 0) return res
            else continue
          }
          return res
        })

      // 获取showidx的globalidx
      // 两次遍历，让置顶link在前
      for (let i = 0; i < show_link_info.length; i++) {
        if (state.linksAltTop[show_link_info[i][0]]) res.push(show_link_info[i][0])
      }
      for (let i = 0; i < show_link_info.length; i++) {
        if (!state.linksAltTop[show_link_info[i][0]]) res.push(show_link_info[i][0])
      }
      return res
    },
    sel_links_networks_idx: (state) => {
      // 先计算link的globalidx
      const sel_links_global_idx = [] as number[]
      const show_link_info = [] as number[][]
      for (let i = 0; i < state.links_if_sel.length; i++) {
        if (state.links_if_sel[i]) {
          show_link_info.push([
            i,
            state.links_avg_fftt[i],
            state.links_tt_scope[i],
            state.links_tt_ratio[i],
            state.links_tt_ratio_scope[i],
            state.links_avg_capacity[i],
            state.links_tf_scope[i],
            state.links_tf_ratio[i],
            state.links_tf_ratio_scope[i]
          ])
        }
      }
      // 对showid进行排序
      if (state.sorted_cond.length > 0)
        show_link_info.sort((a, b) => {
          let res = 0
          for (let i = state.sorted_cond.length - 1; i >= 0; i--) {
            const now_sort_cond = state.sorted_cond[i]
            res = a[now_sort_cond.cond_idx + 1] - b[now_sort_cond.cond_idx + 1]
            if (now_sort_cond.sorted_reverse) res = -res
            if (res != 0) return res
            else continue
          }
          return res
        })

      // 获取showidx的globalidx
      for (let i = 0; i < show_link_info.length; i++) {
        if (state.linksAltTop[show_link_info[i][0]]) sel_links_global_idx.push(show_link_info[i][0])
      }
      for (let i = 0; i < show_link_info.length; i++) {
        if (!state.linksAltTop[show_link_info[i][0]])
          sel_links_global_idx.push(show_link_info[i][0])
      }

      // 新建返回的二维数组
      const res = [] as number[][]

      // 计算global_idx -> show_idx
      const global2show_idx = new Array(state.links_if_sel.length).fill(-1)
      for (let i = 0; i < sel_links_global_idx.length; i++) {
        global2show_idx[sel_links_global_idx[i]] = i
      }

      const last_show_idx = sel_links_global_idx.length - 1 // 顺带统计出sel links数量

      // 初始化 res
      for (let i = 0; i < state.networksInfoArr.length; i++)
        res.push(new Array(last_show_idx + 1).fill(-1))

      for (let i = 0; i < state.networksInfoArr.length; i++) {
        for (let j = 0; j < state.networksInfoArr[i].links.length; j++) {
          const now_link_global_id = state.networksInfoArr[i].links[j].globalId
          const now_show_idx = global2show_idx[now_link_global_id]
          if (now_show_idx != -1) {
            // 记录展示的link在network中的idx
            res[i][now_show_idx] = j
          }
        }
      }

      return res
    },
    // 判断各个条件是否时排序条件
    sort_cond_state: (state) => {
      const res = new Array(8).fill(-1) as number[]
      for (let i = 0; i < state.sorted_cond.length; i++) {
        if (state.sorted_cond[i].sorted_reverse) res[state.sorted_cond[i].cond_idx] = 1
        else res[state.sorted_cond[i].cond_idx] = 0
      }
      return res
    },
    // networksEditQuantity: (state) => {
    //   const res = [{ edit_links_len:0,new_tunnel_len:0,close_links_len:0 }] as networkEditNumber[]
    //   // state.networksInfoArr.link
    // }
    networks_edit_cost: (state) => {
      const res = [] as number[]
      state.networksEditQuantity.forEach((network_edit_data) => {
        // console.log('network_edit_data: ', network_edit_data)

        res.push(
          ((state.per_edit_road_cost *
            (network_edit_data.edit_links_len -
              network_edit_data.new_tunnel_num * state.per_tunnel_len) +
            state.per_tunnel_cost * network_edit_data.new_tunnel_num * state.per_tunnel_len +
            state.per_close_road_cost * network_edit_data.close_links_len) /
            1000) *
            1000000
        )
      })
      return res
    }
  },
  actions: {
    req_links_to_links(req_links: tsLink[]) {
      // 将request的links列表转换为前端格式
      const res_links = new Array<tsLink>()
      for (let i = 0; i < req_links.length; i++) {
        res_links.push({
          id: req_links[i].id,
          pInNode: req_links[i].pInNode,
          pOutNode: req_links[i].pOutNode,
          freeFlowTravelTime: req_links[i].freeFlowTravelTime,
          travelTime: req_links[i].travelTime,
          flow: req_links[i].flow,
          capacity: req_links[i].capacity,
          speed: req_links[i].freeFlowTravelTime / req_links[i].travelTime,
          globalId: req_links[i].globalId,
          originDemand: req_links[i].originDemand,
          len: -1
        })
      }
      return res_links
    },
    req_nodes_to_nodes(req_nodes: tsNode[]) {
      // 将request的nodes列表转换为前端格式
      const res_nodes = new Array<tsNode>()
      for (let i = 0; i < req_nodes.length; i++) {
        res_nodes.push({
          id: req_nodes[i].id,
          lat: req_nodes[i].lat,
          lon: req_nodes[i].lon,
          globalId: req_nodes[i].globalId,
          isOd: req_nodes[i].isOd
        })
      }
      return res_nodes
    },
    update_links_global_info() {
      // 初始化各个路段的8个信息
      const tmp_links_infos1 = [] as number[][]
      const tmp_links_infos2 = [] as number[][][]
      const tmp_links_sumcost_info = new Array<number>(this.linksPos.length).fill(-1)
      let matrix_color_rad = 0
      const links_num = new Array(this.linksPos.length).fill(0)
      for (let i = 0; i < 6; i++) {
        const tmp_links_info1 = new Array(this.linksPos.length).fill(0)
        tmp_links_infos1.push(tmp_links_info1)
        if (i >= 4) continue
        const tmp_links_info2 = [] as number[][]
        for (let i = 0; i < this.linksPos.length; i++) {
          tmp_links_info2.push([-1, -1])
        }
        tmp_links_infos2.push(tmp_links_info2)
      }

      // 针对每个network的costSum计算matrix_color_rad
      for (let i = 1; i < this.networksInfoArr.length; i++) {
        const tmp_rad = Math.abs(
          this.networksInfoArr[0].costSum / this.networksInfoArr[i].costSum - 1
        )
        if (tmp_rad > matrix_color_rad) matrix_color_rad = tmp_rad
      }

      // 获取各个网络中节点的信息
      for (let i = 0; i < this.networksInfoArr.length; i++) {
        // 收集link的links_sumcost_sumcost信息
        for (let j = 0; j < this.networksInfoArr[i].links.length; j++) {
          const now_link = this.networksInfoArr[i].links[j]
          const now_link_sumcost = now_link.travelTime
          if (tmp_links_sumcost_info[now_link.globalId] == -1) {
            tmp_links_sumcost_info[now_link.globalId] = now_link_sumcost
          } else {
            // matrix_color_rad
            const tmp_rad = Math.abs(
              now_link_sumcost / tmp_links_sumcost_info[now_link.globalId] - 1
            )
            if (tmp_rad > matrix_color_rad) {
              matrix_color_rad = tmp_rad
            }
          }
        }
        // 选择被选中的网络状态
        if (!this.networksAsFilter[i]) continue

        // 遍历网络状态的各个link的信息
        for (let j = 0; j < this.networksInfoArr[i].links.length; j++) {
          const now_link = this.networksInfoArr[i].links[j]
          // 记录道路的数量
          links_num[now_link.globalId] += 1

          if (tmp_links_infos2[0][now_link.globalId][0] == -1) {
            // 保存路段的信息
            for (let k = 0; k < 2; k++) {
              tmp_links_infos2[0][now_link.globalId][k] = now_link.travelTime
              tmp_links_infos2[1][now_link.globalId][k] = now_link.speed
              tmp_links_infos2[2][now_link.globalId][k] = now_link.flow
              tmp_links_infos2[3][now_link.globalId][k] = now_link.flow / now_link.capacity
            }
          } else {
            if (now_link.travelTime < tmp_links_infos2[0][now_link.globalId][0]) {
              tmp_links_infos2[0][now_link.globalId][0] = now_link.travelTime
            } else if (now_link.travelTime > tmp_links_infos2[0][now_link.globalId][1]) {
              tmp_links_infos2[0][now_link.globalId][1] = now_link.travelTime
            }
            if (now_link.speed < tmp_links_infos2[1][now_link.globalId][0]) {
              tmp_links_infos2[1][now_link.globalId][0] = now_link.speed
            } else if (now_link.speed > tmp_links_infos2[1][now_link.globalId][1]) {
              tmp_links_infos2[1][now_link.globalId][1] = now_link.speed
            }
            if (now_link.flow < tmp_links_infos2[2][now_link.globalId][0]) {
              tmp_links_infos2[2][now_link.globalId][0] = now_link.flow
            } else if (now_link.flow > tmp_links_infos2[2][now_link.globalId][1]) {
              tmp_links_infos2[2][now_link.globalId][1] = now_link.flow
            }
            if (tmp_links_infos2[3][now_link.globalId][0] > now_link.flow / now_link.capacity) {
              tmp_links_infos2[3][now_link.globalId][0] = now_link.flow / now_link.capacity
            } else if (
              tmp_links_infos2[3][now_link.globalId][1] <
              now_link.flow / now_link.capacity
            ) {
              tmp_links_infos2[3][now_link.globalId][1] = now_link.flow / now_link.capacity
            }
          }
          tmp_links_infos1[0][now_link.globalId] += now_link.travelTime
          tmp_links_infos1[1][now_link.globalId] += now_link.speed
          tmp_links_infos1[2][now_link.globalId] += now_link.flow
          tmp_links_infos1[3][now_link.globalId] += now_link.flow / now_link.capacity
          tmp_links_infos1[4][now_link.globalId] += now_link.freeFlowTravelTime
          tmp_links_infos1[5][now_link.globalId] += now_link.capacity
        }
      }
      // 初始化数组
      this.links_avg_time = []
      this.links_tt_scope = []
      this.links_tt_ratio = []
      this.links_tt_ratio_scope = []
      this.links_avg_flow = []
      this.links_tf_scope = []
      this.links_tf_ratio = []
      this.links_tf_ratio_scope = []
      this.links_avg_fftt = []
      this.links_avg_capacity = []
      for (let i = 0; i < links_num.length; i++) {
        if (links_num[i] != 0) {
          this.links_avg_time.push(tmp_links_infos1[0][i] / links_num[i])
          this.links_tt_ratio.push(tmp_links_infos1[1][i] / links_num[i])
          this.links_avg_flow.push(tmp_links_infos1[2][i] / links_num[i])
          this.links_tf_ratio.push(tmp_links_infos1[3][i] / links_num[i])
          this.links_avg_fftt.push(tmp_links_infos1[4][i] / links_num[i])
          this.links_avg_capacity.push(tmp_links_infos1[5][i] / links_num[i])
        } else {
          this.links_avg_time.push(-1)
          this.links_tt_ratio.push(-1)
          this.links_avg_flow.push(-1)
          this.links_tf_ratio.push(-1)
          this.links_avg_fftt.push(-1)
          this.links_avg_capacity.push(-1)
        }
        // console.log('tt_scope: ', tmp_links_infos2[0][i])

        this.links_tt_scope.push(tmp_links_infos2[0][i][1] - tmp_links_infos2[0][i][0])
        this.links_tt_ratio_scope.push(tmp_links_infos2[1][i][1] - tmp_links_infos2[1][i][0])
        this.links_tf_scope.push(tmp_links_infos2[2][i][1] - tmp_links_infos2[2][i][0])
        this.links_tf_ratio_scope.push(tmp_links_infos2[3][i][1] - tmp_links_infos2[3][i][0])
        if (i > this.linksAltTop.length) this.linksAltTop.push(false)
      }
      this.global_links_init_sumcost = tmp_links_sumcost_info
      this.matrix_element_radius = matrix_color_rad
    },
    async globalInfoGet() {
      try {
        const response = await axios.get(backend_url + '/data/global/all')
        const globalReqRes = response.data as reqGlobalInfo

        // 设置树的节点样式所需的数据
        // this.max_avg_flow = globalReqRes.maxAvgFlow
        // this.min_avg_flow = globalReqRes.minAvgFlow
        // this.max_avg_speed = globalReqRes.maxAvgSpeed
        // this.min_avg_speed = globalReqRes.minAvgSpeed
        this.max_cost_sum = globalReqRes.maxCostsSum
        this.min_cost_sum = globalReqRes.minCostsSum

        // this.min_diff_avg_flow = globalReqRes.minDiffAvgFlow
        // this.max_diff_avg_flow = globalReqRes.maxDiffAvgFlow
        // this.min_diff_avg_speed = globalReqRes.minDiffAvgSpeed
        // this.max_diff_avg_speed = globalReqRes.maxDiffAvgSpeed
        this.min_diff_cost_sum = globalReqRes.minDiffCostSum
        this.max_diff_cost_sum = globalReqRes.maxDiffCostSum

        // 每条link各自的信息
        // this.links_speed_scope = globalReqRes.globalLinksInfo.speed
        // this.links_flow_scope = globalReqRes.globalLinksInfo.flow
        // this.link_sorted_idx = globalReqRes.linkSortedIdx
        // this.req_links_global_info_read(globalReqRes.globalLinksInfo)

        // 储存link和node的位置信息
        this.nodesPos = globalReqRes.nodesPos
        this.linksPos = globalReqRes.linksPos
        // 更改show的数组
        if (this.links_if_sel.length > this.linksPos.length) {
          this.links_if_sel.splice(
            this.linksPos.length,
            this.links_if_sel.length - this.linksPos.length
          )
        } else {
          for (let i = this.links_if_sel.length; i < this.linksPos.length; i++) {
            this.links_if_sel.push(true)
          }
        }
      } catch (error) {
        console.log('Global Info Get Error: ', error)
      }
    },
    async networksInitialization() {
      // 初始化所有数据
      this.networksInfoArr = new Array()
      this.networksAsFilter = new Array()
      this.networksFatherIdx = []
      try {
        await this.globalInfoGet()

        const response = await axios.get(backend_url + '/data/all')
        const req_get_networks = new Array<tsNetwork>()
        const network_data_req = response.data as tsNetwork[]
        this.networksFatherIdx = []
        for (let i = 0; i < network_data_req.length; i++) {
          req_get_networks.push({
            id: network_data_req[i].id,
            title: network_data_req[i].title,
            desc: network_data_req[i].desc,
            father: network_data_req[i].father,
            nodes: this.req_nodes_to_nodes(network_data_req[i].nodes),
            links: this.req_links_to_links(network_data_req[i].links),
            avgFlow: network_data_req[i].avgFlow,
            avgSpeed: network_data_req[i].avgSpeed,
            editLog: network_data_req[i].editLog,
            costSum: network_data_req[i].costSum
          })
          // console.log('cost_sum: ', network_data_req[i].costSum)

          this.networksAsFilter.push(true)
          this.networksFatherIdx.push(network_data_req[i].father)
          this.matrix_change = false
        }
        this.networksInfoArr = req_get_networks
        this.update_links_global_info()
      } catch (error) {
        console.log('Network Data Initialization Error: ', error)
      }
    },
    async originNetworkCenter() {
      const center_req = await axios.get(backend_url + '/network/center') as {data: {lat: number, lon: number}}
      return center_req.data
    },
    linksInfoSet(network_idx: number, req_layer_links: tsLink[]) {
      const tmp_layers_links = new Array<tsLink>()
      for (let j = 0; j < req_layer_links.length; j++) {
        // tmp_layers_links[i].push(req_layers_links)
        const now_link: tsLink = {
          id: req_layer_links[j].id,
          pInNode: req_layer_links[j].pInNode,
          pOutNode: req_layer_links[j].pOutNode,
          freeFlowTravelTime: req_layer_links[j].freeFlowTravelTime,
          travelTime: req_layer_links[j].travelTime,
          flow: req_layer_links[j].flow,
          capacity: req_layer_links[j].capacity,
          speed: req_layer_links[j].freeFlowTravelTime / req_layer_links[j].travelTime,
          globalId: req_layer_links[j].globalId,
          originDemand: req_layer_links[j].originDemand,
          len: -1
        }
        tmp_layers_links.push(now_link)
      }
      this.networksInfoArr[network_idx].links = tmp_layers_links
    },
    async newLink(
      network_idx: number,
      start_pt_id: number,
      end_pt_id: number,
      free_flow_travel_time: number,
      capacity: number,
      i_free_flow_travel_time: number,
      i_capacity: number,
      iExist: boolean
    ) {
      try {
        const response = await axios.get(backend_url + '/data/newLink', {
          params: {
            networkIdx: network_idx - 1,
            startPtId: start_pt_id,
            endPtId: end_pt_id,
            capacity: capacity,
            freeFlowTravelTime: free_flow_travel_time,
            iCapacity: i_capacity,
            iFreeFlowTravelTime: i_free_flow_travel_time,
            iExist: iExist
          }
        })
        await this.globalInfoGet()
        const req_layer_info = response.data as tsNetwork
        const req_layer_links = req_layer_info.links
        this.linksInfoSet(network_idx, req_layer_links)
        this.networksInfoArr[network_idx].avgFlow = req_layer_info.avgFlow
        this.networksInfoArr[network_idx].editLog = req_layer_info.editLog
        this.networksInfoArr[network_idx].avgSpeed = req_layer_info.avgSpeed
        this.networksInfoArr[network_idx].costSum = req_layer_info.costSum
        this.update_links_global_info()
        console.log('success!!!')
      } catch (error) {
        console.log('New Link Error', error)
      }
    },
    async delLink(network_idx: number, links_id_to_del: number) {
      try {
        const response = await axios.get(backend_url + '/data/delLink', {
          params: {
            networkIdx: network_idx - 1,
            linksIdx: links_id_to_del
          }
        })
        await this.globalInfoGet()
        const req_layer_info = response.data as tsNetwork
        const req_layer_links = req_layer_info.links
        this.linksInfoSet(network_idx, req_layer_links)
        this.networksInfoArr[network_idx].avgFlow = req_layer_info.avgFlow
        this.networksInfoArr[network_idx].avgSpeed = req_layer_info.avgSpeed
        this.networksInfoArr[network_idx].editLog = req_layer_info.editLog
        this.networksInfoArr[network_idx].costSum = req_layer_info.costSum
        this.update_links_global_info()
        console.log('success!!!')
      } catch (error) {
        console.log('Delete Link Error', error)
      }
    },
    async resetLink(
      network_idx: number,
      link_idx: number,
      free_flow_travel_time: number,
      capacity: number
    ) {
      try {
        const response = await axios.get(backend_url + '/data/linkReset', {
          params: {
            networkIdx: network_idx - 1,
            capacity: capacity,
            freeFlowTravelTime: free_flow_travel_time,
            linkIdx: link_idx
          }
        })
        await this.globalInfoGet()
        const req_layer_info = response.data as tsNetwork
        const req_layer_links = req_layer_info.links
        this.linksInfoSet(network_idx, req_layer_links)
        this.networksInfoArr[network_idx].avgFlow = req_layer_info.avgFlow
        this.networksInfoArr[network_idx].avgSpeed = req_layer_info.avgSpeed
        this.networksInfoArr[network_idx].editLog = req_layer_info.editLog
        this.networksInfoArr[network_idx].costSum = req_layer_info.costSum
        this.update_links_global_info()
        // console.log('success!!!')
      } catch (error) {
        console.log('Reset Link Error', error)
      }
    },
    async newNode(
      networkIdx: number,
      nodeLat: number,
      nodeLng: number,
      formerLinkA: number,
      aFFTT: number[],
      formerLinkB: number,
      bFFTT: number[]
    ) {
      // 判断是否需要更新双向路段
      if (formerLinkB != -1) {
        // 寻找与路段a对称的路段
        formerLinkB = -1
        const link_a = this.networksInfoArr[networkIdx].links[formerLinkA]
        // console.log('formerLinkA: ', formerLinkA)

        for (let i = 0; i < this.networksInfoArr[networkIdx].links.length; i++) {
          const now_link = this.networksInfoArr[networkIdx].links[i]
          if (now_link.pInNode == link_a.pOutNode && now_link.pOutNode == link_a.pInNode) {
            formerLinkB = i
            break
          }
        }
        if (formerLinkB == -1) formerLinkB = formerLinkA
      }
      try {
        const response = await axios.get(backend_url + '/data/newNode', {
          params: {
            networkIdx: networkIdx - 1,
            nodeLat: nodeLat,
            nodeLng: nodeLng,
            formerLinkA: formerLinkA,
            aFFTT: '[' + aFFTT[0] + ',' + aFFTT[1] + ']',
            formerLinkB: formerLinkB,
            bFFTT: '[' + bFFTT[0] + ',' + bFFTT[1] + ']'
          }
        })
        await this.globalInfoGet()
        const req_network = response.data as tsNetwork
        this.networksInfoArr[networkIdx] = {
          id: req_network.id,
          title: req_network.title,
          desc: req_network.desc,
          father: req_network.father,
          nodes: this.req_nodes_to_nodes(req_network.nodes),
          links: this.req_links_to_links(req_network.links),
          avgFlow: req_network.avgFlow,
          avgSpeed: req_network.avgSpeed,
          editLog: req_network.editLog,
          costSum: req_network.costSum
        }
        this.update_links_global_info()
        return req_network.id
      } catch (error) {
        console.log('New Node Error', error)
      }
      return -1
    },
    async delNode(networkIdx: number, node_to_del: number) {
      // 复制网络内容
      try {
        const response = await axios.get(backend_url + '/data/delNode', {
          params: {
            networkIdx: networkIdx - 1,
            nodeIdx: node_to_del
          }
        })
        await this.globalInfoGet()
        const req_network = response.data as tsNetwork
        this.networksInfoArr[networkIdx] = {
          id: req_network.id,
          title: req_network.title,
          desc: req_network.desc,
          father: req_network.father,
          nodes: this.req_nodes_to_nodes(req_network.nodes),
          links: this.req_links_to_links(req_network.links),
          avgFlow: req_network.avgFlow,
          avgSpeed: req_network.avgSpeed,
          editLog: req_network.editLog,
          costSum: req_network.costSum
        }
        this.update_links_global_info()
        return req_network.id
      } catch (error) {
        console.log('Del Node Error', error)
      }
      return -1
    },
    async networkDuplicate(origin_network_idx: number) {
      // 复制网络内容
      try {
        const response = await axios.get(backend_url + '/data/duplicate', {
          params: {
            originIdx: origin_network_idx - 1
          }
        })
        const req_duplicate_network = response.data as tsNetwork
        const network_to_add = {
          id: req_duplicate_network.id,
          title: req_duplicate_network.title,
          desc: req_duplicate_network.desc,
          father: req_duplicate_network.father,
          nodes: this.req_nodes_to_nodes(req_duplicate_network.nodes),
          links: this.req_links_to_links(req_duplicate_network.links),
          avgFlow: req_duplicate_network.avgFlow,
          avgSpeed: req_duplicate_network.avgSpeed,
          editLog: req_duplicate_network.editLog,
          costSum: req_duplicate_network.costSum
        }
        this.networksInfoArr.push(network_to_add)
        this.networksAsFilter.push(true)
        this.networksFatherIdx.push(network_to_add.father)
        return req_duplicate_network.id
      } catch (error) {
        console.log('Network Duplicated Error', error)
      }
      return -1
    },
    async networkDelete(network_idx: number) {
      if (network_idx == 0) {
        return
      }
      try {
        const _this = this
        const response = await axios.get(
          backend_url + '/network/del?originIdx=' + (network_idx - 1)
        )
        if (response.data.static == 1) {
          await this.globalInfoGet()
          console.log('Network Deleted')
          _this.networksAsFilter.splice(network_idx, 1)
          for (let j = 0; j < this.networksInfoArr.length; j++) {
            if (this.networksInfoArr[j].father > network_idx) {
              this.networksInfoArr[j].father -= 1
              this.networksFatherIdx[j] -= 1
            } else if (this.networksInfoArr[j].father == network_idx) {
              this.networksInfoArr[j].father = this.networksInfoArr[network_idx].father
              this.networksFatherIdx[j] = this.networksInfoArr[network_idx].father
            }
          }
          _this.networksInfoArr.splice(network_idx, 1)
          _this.networksFatherIdx.splice(network_idx, 1)

          const editLogs = response.data.editLogs as {
            edit_type: number
            edit_on_this: boolean
          }[][]
          for (let i = 1; i < _this.networksInfoArr.length; i++) {
            _this.networksInfoArr[i].id = i
            _this.networksInfoArr[i].editLog = editLogs[i - 1] // 重写编辑日志
          }
          this.update_links_global_info()
          console.log('Networks Delete Success!')
        } else {
          console.log('Networks Delete Error', response.data.result)
        }
      } catch (error) {
        console.log('Network Delete Error, ', error)
      }
    },
    async networkRecursionDelete(networks_idx: number[]) {
      // 迭代删除网络
      for (let i = networks_idx.length - 1; i >= 0; i--) {
        if (networks_idx[i] == 0) {
          networks_idx.splice(i, 1)
        } else {
          networks_idx[i] -= 1
        }
      }
      networks_idx.sort()

      try {
        const response = await axios.get(
          backend_url + '/network/recursionDel?networksToDel=' + networks_idx
        )
        if (response.data.static == 1) {
          await this.globalInfoGet()
          for (let i = networks_idx.length - 1; i >= 0; i--) {
            const network_idx = networks_idx[i]
            if (network_idx + 1 == 0) break
            this.networksInfoArr.splice(network_idx + 1, 1)
            this.networksAsFilter.splice(network_idx + 1, 1)
            this.networksFatherIdx.splice(network_idx + 1, 1)
            for (let j = 0; j < this.networksInfoArr.length; j++) {
              if (this.networksInfoArr[j].father > network_idx) {
                this.networksInfoArr[j].father -= 1
                this.networksFatherIdx[j] -= 1
              }
            }
          }
          for (let i = 0; i < this.networksInfoArr.length; i++) {
            this.networksInfoArr[i].id = i
          }
          this.update_links_global_info()
          console.log('network delete success!')
        } else {
          console.log('Networks Delete Error', response.data.result)
        }
      } catch (error) {
        console.log('Network Delete Error, ', error)
      }
    },
    getSelNetworkMapInfo(network_idx: number) {
      // 获取选中网络的节点信息
      const nodes_num = this.networksInfoArr[network_idx].nodes.length
      const sel_network_nodes_pos = new Array<number[]>()
      for (let i = 0; i < nodes_num; i++) {
        sel_network_nodes_pos.push([
          this.networksInfoArr[network_idx].nodes[i].lat,
          this.networksInfoArr[network_idx].nodes[i].lon
        ])
      }

      // 获取选中的单个网络的路段信息
      const link_num = this.networksInfoArr[network_idx].links.length
      const sel_network_links_flow = new Array<number>(link_num)
      const sel_network_links_travel_time = new Array<number>(link_num)
      const sel_network_links_speed = new Array<number>(link_num)
      const sel_network_links_pos = new Array<number[][]>()
      const nodes_in_links = new Array<number[]>()
      for (let i = 0; i < link_num; i++) {
        sel_network_links_flow[i] = this.networksInfoArr[network_idx].links[i].flow
        sel_network_links_travel_time[i] = this.networksInfoArr[network_idx].links[i].travelTime
        sel_network_links_speed[i] = this.networksInfoArr[network_idx].links[i].speed
        sel_network_links_pos.push([
          sel_network_nodes_pos[this.networksInfoArr[network_idx].links[i].pInNode],
          sel_network_nodes_pos[this.networksInfoArr[network_idx].links[i].pOutNode]
        ])
        nodes_in_links.push([
          this.networksInfoArr[network_idx].links[i].pInNode,
          this.networksInfoArr[network_idx].links[i].pOutNode
        ])
      }

      const bi_links = new Array<number[]>()
      const bi_links_flow = new Array<number>()
      const bi_links_speed = new Array<number>()
      const bi_links_node_pos = new Array<number[][]>()
      let bi_flow_scope = 0
      let bi_speed_scope = 0
      for (let i = 0; i < link_num; i++) {
        const bi_link_idx = sel_network_links_pos.indexOf([
          sel_network_links_pos[i][1],
          sel_network_links_pos[i][0]
        ])
        if (bi_link_idx != -1 && bi_link_idx > i) {
          bi_links.push([i, bi_link_idx])
          bi_links_flow.push((sel_network_links_flow[i] + sel_network_links_flow[bi_link_idx]) / 2)
          bi_links_speed.push(
            (sel_network_links_speed[i] + sel_network_links_speed[bi_link_idx]) / 2
          )
          bi_links_node_pos.push([
            sel_network_nodes_pos[this.networksInfoArr[network_idx].links[i].pInNode],
            sel_network_nodes_pos[this.networksInfoArr[network_idx].links[i].pOutNode]
          ])
        } else if (bi_link_idx == -1) {
          bi_links.push([i])
          bi_links_flow.push(sel_network_links_flow[i])
          bi_links_speed.push(sel_network_links_speed[i])
          bi_links_node_pos.push([
            sel_network_nodes_pos[this.networksInfoArr[network_idx].links[i].pInNode],
            sel_network_nodes_pos[this.networksInfoArr[network_idx].links[i].pOutNode]
          ])
        }
        if (Math.abs(bi_links_flow[bi_links_flow.length - 1]) > bi_flow_scope) {
          bi_flow_scope = Math.abs(bi_links_flow[bi_links_flow.length - 1])
        }
        if (Math.abs(bi_links_speed[bi_links_speed.length - 1]) > bi_speed_scope) {
          bi_speed_scope = Math.abs(bi_links_speed[bi_links_speed.length - 1])
        }
      }
      // console.log("links flow: ", sel_network_links_flow)

      return {
        nodes_pos: sel_network_nodes_pos,
        links_flow: sel_network_links_flow,
        links_travel_time: sel_network_links_travel_time,
        links_speed: sel_network_links_speed,
        links_flow_scope: [
          Math.min(...sel_network_links_flow),
          Math.max(...sel_network_links_flow)
        ],
        links_speed_scope: [
          Math.min(...sel_network_links_speed),
          Math.max(...sel_network_links_speed)
        ],
        links_pos: sel_network_links_pos,
        nodes_in_links: nodes_in_links
        // 双边统计
        // bi_links: bi_links,
        // bi_links_speed: bi_links_speed,
        // bi_links_flow: bi_links_flow,
        // bi_speed_scope: bi_speed_scope,
        // bi_flow_scope: bi_flow_scope,
        // bi_links_node_pos: bi_links_node_pos
      }
    },
    getSelComparedNetworksMapInfo(network_a_idx: number, network_b_idx: number) {
      // 获取选中网络的节点信息：a是最新选中的网络
      const nodes_a_num = this.networksInfoArr[network_a_idx].nodes.length
      const nodes_b_num = this.networksInfoArr[network_b_idx].nodes.length
      const sel_network_nodes_pos = new Array<number[]>()
      const a2nodes = new Array<number>()
      const b2nodes = new Array<number>()
      const nodes2a = new Array<number>()
      const nodes2b = new Array<number>()
      for (let i = 0; i < nodes_a_num; i++) {
        const now_node_pos = [
          this.networksInfoArr[network_a_idx].nodes[i].lat,
          this.networksInfoArr[network_a_idx].nodes[i].lon
        ]
        sel_network_nodes_pos.push(now_node_pos)
        a2nodes.push(i)
        nodes2a.push(i)
        nodes2b.push(-1)
      }
      for (let i = 0; i < nodes_b_num; i++) {
        const now_node_pos = [
          this.networksInfoArr[network_b_idx].nodes[i].lat,
          this.networksInfoArr[network_b_idx].nodes[i].lon
        ]
        // const b_in_pos = sel_network_nodes_pos.indexOf(now_node_pos)
        const b_in_pos = sel_network_nodes_pos.findIndex((element) => {
          return element[0] == now_node_pos[0] && element[1] == now_node_pos[1]
        })
        if (b_in_pos == -1) {
          sel_network_nodes_pos.push(now_node_pos)
          b2nodes.push(sel_network_nodes_pos.length - 1)
          nodes2a.push(-1)
          nodes2b.push(i)
        } else {
          b2nodes.push(b_in_pos)
          nodes2b[b_in_pos] = i
        }
      }

      // 获取选中的单个网络的路段信息
      const links_a_num = this.networksInfoArr[network_a_idx].links.length
      const links_b_num = this.networksInfoArr[network_b_idx].links.length
      const sel_network_a_links_flow = new Array<number>()
      const sel_network_a_links_travel_time = new Array<number>()
      const sel_network_b_links_flow = new Array<number>()
      const sel_network_b_links_travel_time = new Array<number>()
      const sel_network_links_node_pos = new Array<number[]>()

      const a2links = new Array<number>()
      const b2links = new Array<number>()
      const links2a = new Array<number>()
      const links2b = new Array<number>()
      for (let i = 0; i < links_a_num; i++) {
        sel_network_a_links_flow.push(this.networksInfoArr[network_a_idx].links[i].flow)
        sel_network_a_links_travel_time.push(
          this.networksInfoArr[network_a_idx].links[i].travelTime
        )
        sel_network_links_node_pos.push([
          a2nodes[this.networksInfoArr[network_a_idx].links[i].pInNode],
          a2nodes[this.networksInfoArr[network_a_idx].links[i].pOutNode]
        ])

        a2links.push(i)
        links2a.push(i)
        links2b.push(-1)
      }
      for (let i = 0; i < links_b_num; i++) {
        sel_network_b_links_flow.push(this.networksInfoArr[network_b_idx].links[i].flow)
        sel_network_b_links_travel_time.push(
          this.networksInfoArr[network_b_idx].links[i].travelTime
        )

        const now_link_pos = [
          b2nodes[this.networksInfoArr[network_b_idx].links[i].pInNode],
          b2nodes[this.networksInfoArr[network_b_idx].links[i].pOutNode]
        ]
        // const link_in_arr = sel_network_links_node_pos.indexOf(now_link_pos)
        const link_in_arr = sel_network_links_node_pos.findIndex((element) => {
          return element[0] == now_link_pos[0] && element[1] == now_link_pos[1]
        })

        if (link_in_arr == -1) {
          sel_network_links_node_pos.push(now_link_pos)
          b2links.push(sel_network_links_node_pos.length - 1)
          links2b.push(i)
          links2a.push(-1)
        } else {
          b2links.push(link_in_arr)
          links2b[link_in_arr] = i
        }
      }

      const compared_links_flow = new Array<number>()
      const compared_links_travel_time = new Array<number>()
      const compared_links_speed = new Array<number>()
      const compared_links_state = new Array<boolean>()
      let max_links_flow_scope = 0
      let max_links_travel_time_scope = 0
      let max_links_speed_scope = 0
      for (let i = 0; i < sel_network_links_node_pos.length; i++) {
        const a_idx = links2a[i]
        const b_idx = links2b[i]
        if (a_idx != -1 && b_idx != -1) {
          compared_links_state.push(true)
          compared_links_flow.push(
            sel_network_a_links_flow[a_idx] - sel_network_b_links_flow[b_idx]
          )
          compared_links_travel_time.push(
            sel_network_a_links_travel_time[a_idx] - sel_network_b_links_travel_time[b_idx]
          )
          compared_links_speed.push(
            this.networksInfoArr[network_a_idx].links[a_idx].speed -
              this.networksInfoArr[network_b_idx].links[b_idx].speed
          )
        } else {
          compared_links_state.push(false)
          if (b_idx == -1 && a_idx != -1) {
            compared_links_flow.push(sel_network_a_links_flow[a_idx])
            compared_links_travel_time.push(sel_network_a_links_travel_time[a_idx])
            compared_links_speed.push(this.networksInfoArr[network_a_idx].links[a_idx].speed)
          } else if (b_idx != -1 && a_idx == -1) {
            compared_links_flow.push(-sel_network_b_links_flow[b_idx])
            compared_links_travel_time.push(-sel_network_b_links_travel_time[b_idx])
            compared_links_speed.push(-this.networksInfoArr[network_b_idx].links[b_idx].speed)
          }
        }

        if (compared_links_state[i]) {
          if (Math.abs(compared_links_flow[i]) > max_links_flow_scope)
            max_links_flow_scope = Math.abs(compared_links_flow[i])
          if (Math.abs(compared_links_speed[i]) > max_links_speed_scope)
            max_links_speed_scope = compared_links_speed[i]
          if (Math.abs(compared_links_travel_time[i]) > max_links_travel_time_scope)
            max_links_travel_time_scope = Math.abs(compared_links_travel_time[i])
        }
      }

      const links_pos = new Array<number[][]>()
      for (let i = 0; i < sel_network_links_node_pos.length; i++) {
        links_pos.push([
          sel_network_nodes_pos[sel_network_links_node_pos[i][0]],
          sel_network_nodes_pos[sel_network_links_node_pos[i][1]]
        ])
      }

      const bi_links = new Array<number[]>()
      const bi_links_speed = new Array<number>()
      const bi_links_flow = new Array<number>()
      let bi_max_speed_scope = 0
      let bi_max_flow_scope = 0
      for (let i = 0; i < sel_network_links_node_pos.length; i++) {
        const op_link_nodes = [sel_network_links_node_pos[i][1], sel_network_links_node_pos[i][0]]
        // const op_link = sel_network_links_node_pos.indexOf(op_link_nodes)
        const op_link = sel_network_links_node_pos.findIndex((element) => {
          return element[0] == op_link_nodes[0] && element[1] == op_link_nodes[1]
        })

        if (op_link != -1 && op_link > i) {
          bi_links.push([i, op_link])
          bi_links_speed.push((compared_links_speed[i] + compared_links_speed[op_link]) / 2)
          bi_links_flow.push((compared_links_speed[i] + compared_links_speed[op_link]) / 2)
        } else if (op_link == -1) {
          bi_links.push([i])
          bi_links_speed.push(compared_links_speed[i])
          bi_links_flow.push(compared_links_speed[i])
        }

        if (Math.abs(bi_links_speed[bi_links_speed.length - 1]) > bi_max_speed_scope) {
          bi_max_speed_scope = Math.abs(bi_links_speed[bi_links_speed.length - 1])
        }
        if (Math.abs(bi_links_flow[bi_links_flow.length - 1]) > bi_max_flow_scope) {
          bi_max_flow_scope = Math.abs(bi_links_flow[bi_links_flow.length - 1])
        }
      }

      // 路径坐标
      const bi_links_node_pos = new Array<number[][]>()
      for (let i = 0; i < bi_links.length; i++) {
        const now_link_idx = bi_links[i][0]
        bi_links_node_pos.push([
          sel_network_nodes_pos[sel_network_links_node_pos[now_link_idx][0]],
          sel_network_nodes_pos[sel_network_links_node_pos[now_link_idx][1]]
        ])
      }

      return {
        // 点相关
        nodes_a_num: nodes_a_num,
        nodes_b_num: nodes_b_num,
        nodes_pos: sel_network_nodes_pos,
        a2nodes: a2nodes,
        b2nodes: b2nodes,
        nodes2a: nodes2a,
        nodes2b: nodes2b,
        // 线相关
        links_a_num: links_a_num,
        links_b_num: links_b_num,
        sel_network_a_links_flow: sel_network_a_links_flow,
        sel_network_a_links_travel_time: sel_network_a_links_travel_time,
        sel_network_b_links_flow: sel_network_b_links_flow,
        sel_network_b_links_travel_time: sel_network_b_links_travel_time,
        sel_network_links_node_pos: sel_network_links_node_pos,
        a2links: a2links,
        b2links: b2links,
        links2a: links2a,
        links2b: links2b,
        links_pos: links_pos,
        // 线统计
        compared_links_flow: compared_links_flow,
        compared_links_travel_time: compared_links_travel_time,
        compared_links_speed: compared_links_speed,
        compared_links_state: compared_links_state,
        delta_flow_scope: max_links_flow_scope,
        delta_speed_scope: max_links_speed_scope,
        nodes_in_links: sel_network_links_node_pos
        // 双边统计
        // bi_links: bi_links,
        // bi_links_speed: bi_links_speed,
        // bi_links_flow: bi_links_flow,
        // bi_speed_scope: bi_max_speed_scope,
        // bi_flow_scope: bi_max_flow_scope,
        // bi_links_node_pos: bi_links_node_pos
      }
    },
    getNetworkValScope(network_idx: number) {
      // capacity和fftt_dimensity的范围
      const capacity_scope = [100000, 0]
      const fftt_dimensity = [1000000, 0]
      for (let i = 0; i < this.networksInfoArr[network_idx].links.length; i++) {
        const now_link = this.networksInfoArr[network_idx].links[i]
        if (now_link.capacity > capacity_scope[1]) capacity_scope[1] = now_link.capacity
        else if (now_link.capacity < capacity_scope[0]) capacity_scope[0] = now_link.capacity

        const Node1 = this.networksInfoArr[network_idx].nodes[now_link.pInNode]
        const Node2 = this.networksInfoArr[network_idx].nodes[now_link.pOutNode]
        const pos_dis = Math.sqrt(
          Math.pow(Node1.lat - Node2.lat, 2) + Math.pow(Node1.lon - Node2.lon, 2)
        )
        const now_fftt_dimensity = now_link.freeFlowTravelTime / pos_dis
        if (now_fftt_dimensity > fftt_dimensity[1]) fftt_dimensity[1] = now_fftt_dimensity
        else if (now_fftt_dimensity < fftt_dimensity[0]) fftt_dimensity[0] = now_fftt_dimensity
        // console.log('now_fftt_dimensity',i,': ', now_fftt_dimensity)
      }
      return {
        capacity_scope: capacity_scope,
        fftt_dimensity_scope: fftt_dimensity
      }
    },
    check_if_network_contains_link(network_idx: number, start_pt_id: number, end_pt_id: number) {
      // 搜索是否存在该路段
      const target_network = this.networksInfoArr[network_idx]
      for (let i = 0; i < target_network.links.length; i++) {
        const now_link = target_network.links[i]
        if (now_link.pInNode == start_pt_id && now_link.pOutNode == end_pt_id) {
          return true
        }
      }
      return false
    },
    // 检查是否可以选择该路段
    check_links_sel(link_idx: number) {
      this.links_if_sel[link_idx] = true
      // 计算bar高度
      const links_info_arr = [
        this.links_avg_time,
        this.links_tt_scope,
        this.links_tt_ratio,
        this.links_tt_ratio_scope,
        this.links_avg_flow,
        this.links_tf_scope,
        this.links_tf_ratio,
        this.links_tf_ratio_scope
      ]
      // 判断每个条件是否符合
      for (let i = 0; i < 8 && this.links_if_sel[link_idx]; i++) {
        if (links_info_arr[i][link_idx] == -1) continue
        let bar_idx = 0
        if (this.historgram_data.graph_scope[i][0] != this.historgram_data.graph_scope[i][1]) {
          bar_idx = Math.min(
            Math.floor(
              ((links_info_arr[i][link_idx] - this.historgram_data.graph_scope[i][0]) /
                (this.historgram_data.graph_scope[i][1] - this.historgram_data.graph_scope[i][0])) *
                8
            ),
            7
          )
        } else bar_idx = 7
        // 判断是否在范围内
        if (bar_idx >= this.filter_bounds[i][0] && bar_idx < this.filter_bounds[i][1]) {
          continue
        } else this.links_if_sel[link_idx] = false
      }
    },
    // 更新过滤后得到的路段
    link_filter_update() {
      // 判断每个路段是否被选中
      for (let i = 0; i < this.links_if_sel.length; i++) {
        this.check_links_sel(i)
      }
    },
    // 取消sort的条件 target_state(-1:删除,0:正序,1:倒序)
    set_sort_cond(cond_idx: number, target_state: number) {
      let former_cond_in_idx = -1
      for (let i = 0; i < this.sorted_cond.length; i++)
        if (this.sorted_cond[i].cond_idx == cond_idx) {
          former_cond_in_idx = i
          break
        }
      // 当原本并没有此sort的条件
      if (former_cond_in_idx == -1) {
        if (target_state == -1) return
        else {
          this.sorted_cond.push({ cond_idx: cond_idx, sorted_reverse: target_state == 1 })
        }
      } else {
        if (target_state == -1) {
          // 准备删除条件
          this.sorted_cond.splice(former_cond_in_idx, 1)
        } else {
          this.sorted_cond[former_cond_in_idx].sorted_reverse = target_state == 1
        }
      }
    },
    // 平均fftt密度
    avg_fftt_density(network_idx: number) {
      let fftt_sum = 0
      let distance_sum = 0
      for (let i = 0; i < this.networksInfoArr[network_idx].links.length; i++) {
        const now_link = this.networksInfoArr[network_idx].links[i]
        const Node1 = this.networksInfoArr[network_idx].nodes[now_link.pInNode]
        const Node2 = this.networksInfoArr[network_idx].nodes[now_link.pOutNode]
        const pos_dis = Math.sqrt(
          Math.pow(Node1.lat - Node2.lat, 2) + Math.pow(Node1.lon - Node2.lon, 2)
        )
        fftt_sum += now_link.freeFlowTravelTime
        distance_sum += pos_dis
      }
      return fftt_sum / distance_sum
    },
    // 平均capacity
    avg_capacity(network_idx: number) {
      let capacity_sum = 0
      for (let i = 0; i < this.networksInfoArr[network_idx].links.length; i++) {
        const now_link = this.networksInfoArr[network_idx].links[i]
        capacity_sum += now_link.capacity
      }
      return capacity_sum / this.networksInfoArr[network_idx].links.length
    },
    // 是否选择network状态作为直方图数据
    shift_network_as_filter_state(network_idx: number) {
      // 判断参数是否合法
      if (network_idx < 0 || network_idx > this.networksAsFilter.length) return
      // 判断是否只剩余一个网络，是则不能取消
      if (this.networksAsFilter[network_idx]) {
        let only_filter_origin = true
        for (let i = 0; i < this.networksAsFilter.length && only_filter_origin; i++) {
          if (i == network_idx) continue
          if (this.networksAsFilter[i]) only_filter_origin = false
        }
        if (only_filter_origin) return
      }
      this.networksAsFilter[network_idx] = !this.networksAsFilter[network_idx]
      // 更新link信息
      this.update_links_global_info()
    }
  }
})
