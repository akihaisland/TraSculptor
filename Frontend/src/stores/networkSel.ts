import { defineStore } from 'pinia'
import axios from 'axios'

interface tsNode {
  lat: number
  lon: number
  id: number
}

export const useNetworkSel = defineStore('networkSel', {
  state: () => ({
    networks_show: [] as number[],
    networks_show_max: 1 as number,
    real_networks_show_max: 1 as number,
    last_sel_network_id: -1 as number
  }),
  getters: {
    // 计算属性
  },
  actions: {
    networkSelInitialization() {
      this.networks_show = []
    },
    auto_set_last_show(network_to_unshow: number) {
      // 更新最新show的城市数据

      const network_idx = network_to_unshow
      if (this.last_sel_network_id == network_idx) {
        if (this.networks_show.length >= 1)
          this.last_sel_network_id = this.networks_show[this.networks_show.length - 1]
        else this.last_sel_network_id = -1
      } else if (this.last_sel_network_id > network_idx) {
        this.last_sel_network_id -= 1
      }
    },
    selectNetwork(network_idx: number) {
      // 判断是否是取消show
      const former_idx = this.networks_show.indexOf(network_idx)
      if (former_idx != -1) {
        this.networks_show.splice(former_idx, 1)

        this.auto_set_last_show(network_idx)
        return
      }

      // 当需要进行show的情况
      this.networks_show.push(network_idx)
      this.last_sel_network_id = network_idx
      while (this.networks_show.length > this.networks_show_max) {
        this.networks_show.shift()
      }
    },
    deleteNetwork(network_idx: number) {
      // 删稠某个网络
      for (let i = this.networks_show.length - 1; i >= 0; i--) {
        if (this.networks_show[i] == network_idx) {
          this.networks_show.splice(i, 1)
        } else if (this.networks_show[i] > network_idx) {
          this.networks_show[i] -= 1
        }
      }

      // 判断是否需要更新最新展示的数据
      this.auto_set_last_show(network_idx)
    },
    deleteNetworks(networks_to_del: number[]) {
      // 删稠一些网络
      for (let i=0; i<networks_to_del.length; i++) {
        this.deleteNetwork(networks_to_del[i])
      }
    },
    removeNetworkShow(network_idx: number) {
      // 移除展示的网络
      for (let i = this.networks_show.length - 1; i >= 0; i--) {
        if (this.networks_show[i] == network_idx) {
          this.networks_show.splice(i, 1)
        }
      }

      if (network_idx == this.last_sel_network_id) {
        if (this.networks_show.length >= 1)
          this.last_sel_network_id = this.networks_show[this.networks_show.length - 1]
        else this.last_sel_network_id = -1
      }
    }
  }
})
