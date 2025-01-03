<script setup lang="ts">
import L from 'leaflet'
import 'leaflet-draw'
import { useNetworksData, type networkEditNumber } from '@/stores/networkData'
import { useNetworkSel } from '@/stores/networkSel'
import { useLineEdit } from '@/stores/lineEdit'
import '@/assets/new_link_menu.css'
import '@/assets/edit_link_menu.css'
import '@/assets/new_node_menu.css'
import { computed, onMounted, ref } from 'vue'
import { watch } from 'vue'
import { doSegmentsIntersect } from '@/stores/lineRelationship'

const networkData = useNetworksData()
const networkSelData = useNetworkSel()
const lineEditData = useLineEdit()
let dots_adjacency_matrix = [] as boolean[][]
let now_new_line: L.Polyline
let map: L.Map
const map_zoom_ratio = ref(12) // Map zoom ratio
let link_offset_timer: number // If a timer for line segment movement animation is needed

// whether show the menu
const menu_show = ref(-1)

// Edit the style of the segment
let link_edit_assit: EditablePolyline
class EditablePolyline extends L.Polyline {
  is_editing: boolean
  is_opposite: boolean
  width_base: number
  start_node: number[]
  end_node: number[]
  lat_dir: number
  lng_dir: number

  constructor(start_pos: number[], end_pos: number[], width_base: number, is_opposite = false) {
    super(
      [
        [start_pos[0], start_pos[1]],
        [
          start_pos[0] + lineEditData.edit_link_len_base * (end_pos[0] - start_pos[0]),
          start_pos[1] + lineEditData.edit_link_len_base * (end_pos[1] - start_pos[1])
        ]
      ],
      {
        weight: width_base * lineEditData.edit_link_width_base,
        color: 'rgba(116, 240, 255, 0.6)'
      }
    )

    this.is_editing = false
    this.width_base = width_base
    this.start_node = start_pos
    this.end_node = end_pos
    this.is_opposite = is_opposite

    // 确定路段方向
    this.lat_dir = end_pos[0] - start_pos[0]
    this.lng_dir = end_pos[1] - start_pos[1]
    if (Math.abs(this.lng_dir * 10) < Math.abs(this.lat_dir)) this.lng_dir = 0
    else if (Math.abs(this.lat_dir * 10) < Math.abs(this.lng_dir)) this.lat_dir = 0
    this.lat_dir = Math.sign(this.lat_dir)
    this.lng_dir = Math.sign(this.lng_dir)

    const _this = this

    // 设置按下开始编辑的监听
    this.on('mousedown', function (e) {
      // 阻止默认的右键菜单
      e.originalEvent.preventDefault()
      // 开始编辑
      _this.is_editing = true
      // map.
    })

    const handleEditEvent = (e: MouseEvent) => {
      if (!this.is_editing) return
      e.stopPropagation()
      map.dragging.disable()
      if (menu_show.value == 4) {
        // 判断增大还是减小
        const change_base = e.movementX * this.lat_dir + e.movementY * this.lng_dir
        const zoom_base = Math.pow(1.5, 16 - map_zoom_ratio.value)

        const change_size = Math.floor(change_base * zoom_base) / 500
        lineEditData.editLinkCapacity(change_size)
      } else if (menu_show.value == 3) {
        // 判断是增大还是减小
        const change_base = e.movementX * this.lng_dir - e.movementY * this.lat_dir
        const zoom_base = Math.pow(1.5, 16 - map_zoom_ratio.value)
        const change_size = Math.floor(change_base * zoom_base) / 500

        // 计算端点位置
        lineEditData.editLinkFFTT(change_size)
      } else if (menu_show.value == 2) {
        // 若为新建路段的辅助
        // 判断capacity是否被变化
        const vertical_change_base = e.movementX * this.lat_dir + e.movementY * this.lng_dir
        const zoom_base = Math.pow(1.5, 16 - map_zoom_ratio.value)
        const capacity_change_size = Math.floor(vertical_change_base * zoom_base) / 500

        // 调整仓库数值
        lineEditData.editLinkCapacity(capacity_change_size, this.is_opposite)

        // 判断fftt是否被变化
        const horizontal_change_base = e.movementX * this.lng_dir - e.movementY * this.lat_dir
        const fftt_change_size = Math.floor(horizontal_change_base * zoom_base) / 500

        // 调整仓库数值
        lineEditData.editLinkFFTT(fftt_change_size, this.is_opposite)
      }
    }
    document.addEventListener('mousemove', handleEditEvent)
    document.addEventListener('mouseup', (e) => {
      _this.is_editing = false
      map.dragging.enable()
    })
  }
  resetWidth() {
    if (this.is_opposite) {
      this.setStyle({
        weight: this.width_base * lineEditData.edit_link_iwidth_base
      })
    } else {
      this.setStyle({
        weight: this.width_base * lineEditData.edit_link_width_base
      })
    }
  }
  resetLen() {
    let end_node_pos = [] as number[]
    if (this.is_opposite) {
      end_node_pos = [
        this.start_node[0] +
          (this.end_node[0] - this.start_node[0]) * lineEditData.edit_link_ilen_base,
        this.start_node[1] +
          (this.end_node[1] - this.start_node[1]) * lineEditData.edit_link_ilen_base
      ]
    } else {
      end_node_pos = [
        this.start_node[0] +
          (this.end_node[0] - this.start_node[0]) * lineEditData.edit_link_len_base,
        this.start_node[1] +
          (this.end_node[1] - this.start_node[1]) * lineEditData.edit_link_len_base
      ]
    }
    this.setLatLngs([
      [this.start_node[0], this.start_node[1]],
      [end_node_pos[0], end_node_pos[1]]
    ])
    this.redraw()
  }
}

// Link required to create a new segment
let links_by_new_link = [] as L.Polyline[]
let links_assist_by_new_link = [] as EditablePolyline[]
function assist_new_link_edit() {
  if (menu_show.value == 2) {
    // delete temp road
    if (now_new_line) {
      map.removeLayer(now_new_line)
    }
    // delete roads
    for (let i = links_by_new_link.length - 1; i >= 0; i--) {
      if (links_by_new_link[i]) {
        map.removeLayer(links_by_new_link[i])
      }
    }
    links_by_new_link.length = 0
    for (let i = links_assist_by_new_link.length - 1; i >= 0; i--) {
      if (links_assist_by_new_link[i]) {
        map.removeLayer(links_assist_by_new_link[i])
      }
    }
    links_assist_by_new_link.length = 0

    // compute road width
    const network_idx = networkSelData.last_sel_network_id
    const link_stroke_width = Math.pow(1.5, map_zoom_ratio.value - 12) * 6
    const Node1 = networkData.networksInfoArr[network_idx].nodes[lineEditData.startNodeIdx]
    const Node2 = networkData.networksInfoArr[network_idx].nodes[lineEditData.endNodeIdx]

    let tmp_links_pos = [] as number[][][]
    if (lineEditData.isBidirection) {
      tmp_links_pos = [
        link_excursion(
          [
            [Node1.lat, Node1.lon],
            [Node2.lat, Node2.lon]
          ],
          -(link_stroke_width * 0.00002 + 0.0006)
        ),
        link_excursion(
          [
            [Node2.lat, Node2.lon],
            [Node1.lat, Node1.lon]
          ],
          -(link_stroke_width * 0.00002 + 0.0006)
        )
      ]
    } else {
      tmp_links_pos = [
        [
          [Node1.lat, Node1.lon],
          [Node2.lat, Node2.lon]
        ]
      ]
    }

    // Draw segments representing direction in the base map
    for (let i = 0; i < tmp_links_pos.length; i++) {
      links_by_new_link.push(
        new L.Polyline(
          [
            [tmp_links_pos[i][0][0], tmp_links_pos[i][0][1]],
            [tmp_links_pos[i][1][0], tmp_links_pos[i][1][1]]
          ],
          {
            color: 'rgba(103, 163, 163, 0.5)',
            weight: link_stroke_width,
            // fillOpacity: 0.5,
            dashArray: [2 * link_stroke_width, 2 * link_stroke_width]
          }
        )
      )
    }

    let link_offset = 0
    if (link_offset_timer) clearInterval(link_offset_timer)
    link_offset_timer = setInterval(() => {
      link_offset -= 1
      for (let i = 0; i < links_by_new_link.length; i++) {
        links_by_new_link[i].setStyle({
          dashOffset: (link_offset * link_stroke_width) / 3 + ''
        })
      }
    }, 500)

    // Draw segments for editing
    links_assist_by_new_link.push(
      new EditablePolyline(tmp_links_pos[0][0], tmp_links_pos[0][1], link_stroke_width)
    )
    if (tmp_links_pos.length > 1)
      links_assist_by_new_link.push(
        new EditablePolyline(tmp_links_pos[1][0], tmp_links_pos[1][1], link_stroke_width, true)
      )
    for (let i = 0; i < links_assist_by_new_link.length; i++) {
      links_assist_by_new_link[i].addTo(map)
      links_assist_by_new_link[i].bringToBack()
    }
    for (let i = 0; i < links_by_new_link.length; i++) {
      links_by_new_link[i].addTo(map)
      links_by_new_link[i].bringToBack()
    }
  } else {
    // delete road segment
    for (let i = links_by_new_link.length - 1; i >= 0; i--) {
      if (links_by_new_link[i]) {
        map.removeLayer(links_by_new_link[i])
      }
    }
    links_by_new_link.length = 0
    for (let i = links_assist_by_new_link.length - 1; i >= 0; i--) {
      if (links_assist_by_new_link[i]) {
        map.removeLayer(links_assist_by_new_link[i])
      }
    }
    links_assist_by_new_link.length = 0
    // remove timer
    if (link_offset_timer) clearInterval(link_offset_timer)
  }
}

watch(
  () => lineEditData.newFreeFlowTravelTime,
  () => {
    if (link_edit_assit) {
      link_edit_assit.resetLen()
    }
    if (links_assist_by_new_link.length > 0) {
      links_assist_by_new_link[0].resetLen()
    }
  }
)
watch(
  () => lineEditData.newCapacity,
  () => {
    if (link_edit_assit) {
      link_edit_assit.resetWidth()
    }
    if (links_assist_by_new_link.length > 0) {
      links_assist_by_new_link[0].resetWidth()
    }
  }
)
watch(
  () => lineEditData.newIFreeFlowTravelTime,
  () => {
    if (links_assist_by_new_link.length > 1) {
      links_assist_by_new_link[1].resetLen()
    }
  }
)
watch(
  () => lineEditData.newICapacity,
  () => {
    if (links_assist_by_new_link.length > 1) {
      links_assist_by_new_link[1].resetWidth()
    }
  }
)
watch(
  () => lineEditData.isBidirection,
  () => {
    assist_new_link_edit()
  }
)

// Node and link required to create a new node
let node_to_new: L.CircleMarker
let node_to_new_drag: L.Marker
let links_by_new_node = [] as L.Polyline[]
const link_clicked = ref(-1) // The clicked segment
function draw_nodes_links_from_newnode() {
  // 删除地图上原有的点和路段
  if (map == undefined) return
  // 删除节点
  if (node_to_new) map.removeLayer(node_to_new)
  if (node_to_new_drag) map.removeLayer(node_to_new_drag)
  // 删除路段
  for (let i = links_by_new_node.length - 1; i >= 0; i--) {
    if (links_by_new_node[i]) {
      map.removeLayer(links_by_new_node[i])
    }
  }
  links_by_new_node.length = 0

  // 画上新的节点与路段
  if (menu_show.value == 5) {
    // 画点
    const node_radius = Math.pow(1.5, map_zoom_ratio.value - 12) * 10
    const node_stroke_width = Math.pow(1.5, map_zoom_ratio.value - 12) / 2 + 2
    node_to_new = new L.CircleMarker([lineEditData.newNodeLat, lineEditData.newNodeLng], {
      radius: node_radius,
      weight: node_stroke_width,
      color: '#F08650aa',
      fillOpacity: 1,
      fillColor: '#B7B7B7aa'
    })
    // 创建自定义图标
    const icon_radius = 2 * (node_radius + node_stroke_width)
    const customIcon = L.icon({
      iconUrl: '/static/edits_btn/draggable_node.svg',
      iconSize: [icon_radius, icon_radius],
      iconAnchor: [icon_radius / 2, icon_radius / 2]
    })

    // 创建标记并设置图标
    node_to_new.addTo(map)
    node_to_new_drag = new L.Marker([lineEditData.newNodeLat, lineEditData.newNodeLng], {
      draggable: true
    })
      .setIcon(customIcon)
      .addTo(map)

    // 跟踪鼠标位置
    let mouse_pos: L.LatLng
    const check_mouse_pos = (e: L.LeafletMouseEvent) => {
      mouse_pos = e.latlng
      // console.log("mouse_pos: ", mouse_pos);
    }
    map.on('mousemove', check_mouse_pos)
    let start_pos = [] as number[]
    node_to_new_drag.on('dragstart', (e) => {
      start_pos = [mouse_pos.lat, mouse_pos.lng]
    })
    node_to_new_drag.on('dragend', () => {
      const now_pos = [mouse_pos.lat, mouse_pos.lng]

      const delta_lat = now_pos[0] - start_pos[0]
      const delta_lng = now_pos[1] - start_pos[1]
      if (lineEditData.isAttach) {
        if (Math.abs(delta_lat) > Math.abs(delta_lng)) lineEditData.setNewNodePos(0, delta_lng)
        else lineEditData.setNewNodePos(delta_lat, 0)
      } else lineEditData.setNewNodePos(delta_lat, delta_lng)
    })

    // 计算线段区域
    // 获取节点信息
    const network_idx = networkSelData.last_sel_network_id
    const now_link = networkData.networksInfoArr[network_idx].links[link_clicked.value]

    const Node1 = networkData.networksInfoArr[network_idx].nodes[now_link.pInNode]
    const Node2 = networkData.networksInfoArr[network_idx].nodes[now_link.pOutNode]
    const link_stroke_width = Math.pow(1.5, map_zoom_ratio.value - 12) * 6
    const now_link_pos_1 = [[Node1.lat, Node1.lon], lineEditData.new_node_pos]
    const now_link_pos_2 = [lineEditData.new_node_pos, [Node2.lat, Node2.lon]]

    let tmp_links_pos = [] as number[][][]
    if (lineEditData.isBidirection) {
      tmp_links_pos = [
        link_excursion(now_link_pos_1, -(link_stroke_width * 0.00002 + 0.0006)),
        link_excursion(now_link_pos_2, -(link_stroke_width * 0.00002 + 0.0006)),
        link_excursion(
          [now_link_pos_1[1], now_link_pos_1[0]],
          -(link_stroke_width * 0.00002 + 0.0006)
        ),
        link_excursion(
          [now_link_pos_2[1], now_link_pos_2[0]],
          -(link_stroke_width * 0.00002 + 0.0006)
        )
      ]
    } else {
      tmp_links_pos = [now_link_pos_1, now_link_pos_2]
    }
    for (let i = 0; i < tmp_links_pos.length; i++) {
      links_by_new_node.push(
        new L.Polyline(
          [
            [tmp_links_pos[i][0][0], tmp_links_pos[i][0][1]],
            [tmp_links_pos[i][1][0], tmp_links_pos[i][1][1]]
          ],
          {
            color: '#9FFCFD',
            weight: link_stroke_width,
            fillOpacity: 0.5,
            dashArray: [2 * link_stroke_width, 2 * link_stroke_width]
          }
        )
      )
    }
    for (let i = 0; i < links_by_new_node.length; i++) {
      links_by_new_node[i].addTo(map)
      links_by_new_node[i].bringToBack()
    }

    let link_offset = 0
    if (link_offset_timer) clearInterval(link_offset_timer)
    link_offset_timer = setInterval(() => {
      link_offset -= 1
      for (let i = 0; i < links_by_new_node.length; i++) {
        links_by_new_node[i].setStyle({
          dashOffset: (link_offset * link_stroke_width) / 3 + ''
        })
      }
    }, 500)
  }
}

// 需要查看的路段满足的需求 menu_show=6用于此
const links_demand_to_show = ref([] as number[])
const links_if_in_show_demand = computed(() => {
  const network_idx = networkSelData.last_sel_network_id
  // 当当前并没有选中路段
  if (network_idx == -1 || network_idx >= networkData.networksInfoArr.length)
    return [] as number[][]

  // 初始化每个节点的需求
  const res = [] as boolean[]
  for (let i = 0; i < networkData.networksInfoArr[network_idx].links.length; i++) res.push(false)
  for (let i = 0; i < links_demand_to_show.value.length; i++)
    res[links_demand_to_show.value[i]] = true
  return res
})
function add_link_to_show_demand(link_idx: number) {
  if (menu_show.value == 6) {
    if (links_if_in_show_demand.value[link_idx]) {
      const link_idx_in_demand = links_demand_to_show.value.indexOf(link_idx)
      links_demand_to_show.value.splice(link_idx_in_demand, 1)
    } else {
      links_demand_to_show.value.push(link_idx)
    }
    rmFormerLinesAndDots()
    draw_links_and_nodes()
  }
}
class PieNode extends L.Marker {
  node_idx: number
  base_width: number
  icon_url: string

  constructor(
    centerPoint: L.LatLngExpression,
    node_idx: number,
    base_width: number,
    pie_ratio: number
  ) {
    // compute the size and style for the pie charts
    const svgString =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<circle cx="32" cy="32" r="32" fill="#5CB338" />' +
      '<circle cx="32" cy="32" r="16" stroke-width="32" stroke-dasharray="' +
      100 * pie_ratio +
      ', 100" fill="transparent" stroke="#E89FF4"/>' +
      '<circle cx="32" cy="32" r="30" stroke-width="4" fill="transparent" stroke="#E9EFFF"/></svg>'
    const pie_width = Math.pow(1.5, map_zoom_ratio.value - 12) * (12 + 12 * base_width)
    console.log('node', node_idx, ':', pie_width)

    const svgIcon = L.icon({
      iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString),
      iconSize: [pie_width, pie_width] // set size of pie charts
    })
    super(centerPoint, {
      icon: svgIcon
    })

    // save related info
    this.node_idx = node_idx
    this.base_width = base_width
    this.icon_url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString)

    // create marker and add to map
    // var marker = L.marker(centerPoint, { icon: svgIcon }).addTo(map);
    const _this = this
  }
  zoom() {
    const pie_width = Math.pow(1.5, map_zoom_ratio.value - 12) * (12 + 12 * this.base_width)
    const svgIcon = L.icon({
      iconUrl: this.icon_url,
      iconSize: [pie_width, pie_width] // set the size of icon
    })
    this.setIcon(svgIcon)
  }
}
const pies_in_map = [] as PieNode[]
watch(
  () => networkSelData.last_sel_network_id,
  () => {
    links_demand_to_show.value = []
  }
)
const od_demands_sel = computed(() => {
  const network_idx = networkSelData.last_sel_network_id
  // no links selected
  if (network_idx == -1 || network_idx >= networkData.networksInfoArr.length)
    return [] as number[][]

  // init requirement for each nodes
  const res = [] as number[][]
  for (let i = 0; i < networkData.networksInfoArr[network_idx].nodes.length; i++) res.push([0, 0])

  for (let i = 0; i < links_demand_to_show.value.length; i++) {
    const now_link_sat =
      networkData.networksInfoArr[network_idx].links[links_demand_to_show.value[i]].originDemand
    for (let j = 0; j < now_link_sat.length; j++) {
      res[j][0] += now_link_sat[j][0]
      res[j][1] += now_link_sat[j][1]
    }
  }
  return res
})
function rm_origin_demand_pie() {
  if (map == undefined) return
  // delete nodes
  for (let i = pies_in_map.length - 1; i >= 0; i--) {
    if (pies_in_map[i]) {
      map.removeLayer(pies_in_map[i])
    }
  }
  pies_in_map.length = 0
}
function draw_origin_demand_pie() {
  let mini_demand = 100000
  let max_demand = 0
  for (let i = 0; i < od_demands_sel.value.length; i++) {
    const now_demand = od_demands_sel.value[i][0] + od_demands_sel.value[i][1]
    if (now_demand < mini_demand) mini_demand = now_demand
    if (now_demand > max_demand) max_demand = now_demand
  }

  // remove former pies on map
  rm_origin_demand_pie()
  const network_idx = networkSelData.last_sel_network_id
  // no roads selected
  if (network_idx == -1 || network_idx >= networkData.networksInfoArr.length)
    return [] as number[][]

  for (let i = 0; i < od_demands_sel.value.length; i++) {
    const now_demand_sum = od_demands_sel.value[i][0] + od_demands_sel.value[i][1]
    if (now_demand_sum == 0) continue
    // add pies
    const now_node = networkData.networksInfoArr[network_idx].nodes[i]
    pies_in_map.push(
      new PieNode(
        [now_node.lat, now_node.lon],
        i,
        now_demand_sum / max_demand,
        od_demands_sel.value[i][1] / now_demand_sum
      )
    )
  }
  for (let i = 0; i < pies_in_map.length; i++) {
    pies_in_map[i].addTo(map)
  }
}
function pie_auto_zoom() {
  for (let i = 0; i < pies_in_map.length; i++) {
    pies_in_map[i].zoom()
  }
}
// When the selected link changes, start drawing again
watch(
  () => links_demand_to_show.value,
  () => {
    draw_origin_demand_pie()
  },
  { deep: true }
)
function start_demand_show(link_init = -1) {
  // cancel all operations
  // remove styles for roads
  if (link_clicked.value != -1) {
    link_clicked.value = -1
    // reset style
    rmFormerLinesAndDots()
    draw_links_and_nodes()
  }
  menu_show.value = -1
  draw_nodes_links_from_newnode()
  lineEditData.endDraw()
  // determine whether it is necessary to delete the previous roads
  if (now_new_line != undefined && map.hasLayer(now_new_line)) {
    map.removeLayer(now_new_line)
  }

  menu_show.value = 6
  if (link_init != -1) {
    links_demand_to_show.value = [link_init]
    rmFormerLinesAndDots()
    draw_links_and_nodes()
  }
}
function shutdown_demand_show() {
  links_demand_to_show.value = []
  menu_show.value = -1
}

// Modified link/road type
async function commit_link_delete(former_idxs: number[]) {
  // delete roads
  if (former_idxs.length == 0) {
    console.log('Link Delete Error: link"-1" not exists!')
    return
  }
  let networkIdx = networkSelData.last_sel_network_id
  if (networkIdx < 0 || networkIdx > networkData.networksInfoArr.length) {
    console.log('Link Delete Error: network"' + networkIdx + '" not exists.')
    return
  }
  networkIdx = await networkData.networkDuplicate(networkIdx)

  // save edit history
  const link_idx_to_del = former_idxs[0]

  await networkData.delLink(networkIdx, link_idx_to_del)
  lineEditData.endDraw()
  link_edit_menu_off()

  // switch network to show
  networkSelData.selectNetwork(networkData.last_network_idx)
}
class SelectablePolyline extends L.Polyline {
  former_idxs: number[]
  new_idx: number

  constructor(
    latlngs: L.LatLngExpression[] | L.LatLngExpression[][],
    former_idxs: number[],
    new_idx: number,
    options?: L.PolylineOptions
  ) {
    super(latlngs, options)
    this.former_idxs = former_idxs
    this.new_idx = new_idx
    // this.bindTooltip('capacity: '+ ).openTooltip()
    // set tooltip
    const network_idx = networkSelData.last_sel_network_id
    if (network_idx >= 0 && network_idx < networkData.networksInfoArr.length) {
      const now_link = networkData.networksInfoArr[network_idx].links[former_idxs[0]]
      const tooltip_content =
        'Capacity: ' +
        now_link.capacity.toFixed(2) +
        '<br/>Travel Flow: ' +
        now_link.flow.toFixed(2) +
        '<br/>Free Flow Travel Time: ' +
        now_link.freeFlowTravelTime.toFixed(2) +
        '<br/>Travel Time: ' +
        now_link.travelTime.toFixed(2)
      this.bindTooltip(tooltip_content, {
        direction: 'top',
        className: 'path_tooltip'
      }).openTooltip()
    }
    const _this = this

    let dbclick_timer = -1
    this.on('contextmenu', function (e) {
      e.originalEvent.preventDefault()
      commit_link_delete(_this.former_idxs)
    })

    this.on('click', (e: L.LeafletMouseEvent) => {
      const nodes_in_link = this.getLatLngs()
      const pts = this.getLatLngs() as L.LatLng[]
      // nodes and length of the clicked roads
      console.log('line pts: ', pts[0], pts[1])
      console.log('line length: ', pts[0].distanceTo(pts[1]), 'm')

      // determine whether it is a single click or a double click
      if (e.originalEvent.detail == 1) {
        // set road info
        if (lineEditData.editState == 0 || lineEditData.editState == 2) {
          if (former_idxs[0] == -1) {
            lineEditData.editState = 1
          } else {
            lineEditData.editState = 2
            const now_network_idx = networkSelData.last_sel_network_id
            lineEditData.networkIdx = now_network_idx
            lineEditData.newCapacity =
              networkData.networksInfoArr[now_network_idx].links[former_idxs[0]].capacity
            lineEditData.newFreeFlowTravelTime =
              networkData.networksInfoArr[now_network_idx].links[former_idxs[0]].freeFlowTravelTime
            lineEditData.lineIdx = former_idxs[0]

            // show road info
            const link = networkData.networksInfoArr[now_network_idx].links[former_idxs[0]]
            console.log(
              '[link click] ID(network) = ',
              former_idxs[0],
              ', freeFlowTravelTime: ',
              link.freeFlowTravelTime,
              ', capacity: ',
              link.capacity,
              ', travelTime: ',
              link.travelTime,
              ', flow: ',
              link.flow,
              ', start: ',
              link.pInNode,
              ', end: ',
              link.pOutNode
            )
          }
        }

        // open menu
        if (dbclick_timer) clearTimeout(dbclick_timer)
        dbclick_timer = setTimeout(() => {
          if (menu_show.value != 6 && e.originalEvent.button == 0) {
            // console.log(e.originalEvent);
            handleLinkClick(e.originalEvent, this.former_idxs[0])
          } else {
            add_link_to_show_demand(this.former_idxs[0])
          }
        }, 250)
      } else {
        if (dbclick_timer) clearTimeout(dbclick_timer)
        if (menu_show.value != 6) {
          start_demand_show(this.former_idxs[0])
        } else {
          add_link_to_show_demand(this.former_idxs[0])
        }
      }
    })
  }
}
// Modified node type
class SelectableNode extends L.CircleMarker {
  isSelected: boolean
  former_idxs: number[]
  new_idx: number
  if_mouse_in: boolean

  constructor(
    latlng: L.LatLngExpression,
    former_idxs: number[],
    new_idx: number,
    options?: L.CircleMarkerOptions
  ) {
    super(latlng, options)
    this.isSelected = false
    this.former_idxs = former_idxs
    this.new_idx = new_idx
    this.if_mouse_in = false
    const _this = this

    // start new road since node clicked
    function check_if_cancel_newlink() {
      if (lineEditData.endNodeIdx != -1) return

      map.dragging.enable()
      handleCancelNewLink()
      map.off('mouseout', check_if_cancel_newlink)
      map.off('mouseup', check_if_cancel_newlink)
    }
    this.on('mousedown', (e) => {
      // cancel former operations
      // remove road styles
      shutdown_demand_show()
      if (link_clicked.value != -1) {
        link_clicked.value = -1
        // reset styles
        rmFormerLinesAndDots()
        draw_links_and_nodes()
      }
      menu_show.value = -1
      draw_nodes_links_from_newnode()
      lineEditData.endDraw()
      // determine whether it is necessary to delete the previous segments
      if (now_new_line != undefined && map.hasLayer(now_new_line)) {
        map.removeLayer(now_new_line)
      }

      // switch to edit mode
      if (_this.former_idxs.length == 0) return
      lineEditData.editState = 1

      const start_node_idx = _this.former_idxs[0]

      // new temp road
      const now_show_network_idx = networkSelData.last_sel_network_id
      const startNode = networkData.networksInfoArr[now_show_network_idx].nodes[start_node_idx]
      lineEditData.networkIdx = now_show_network_idx
      lineEditData.startNodeIdx = start_node_idx
      lineEditData.startNodePos = [startNode.lat, startNode.lon]
      now_new_line = L.polyline([[lineEditData.startNodePos[0], lineEditData.startNodePos[1]]], {
        color: '#fff',
        weight: 6,
        dashArray: '5, 20'
      }).addTo(map)
      now_new_line.bringToBack()

      map.dragging.disable()

      // start mouse tracking
      map.on('mousemove', onMouseMove)
      map.on('mouseout', check_if_cancel_newlink)
      map.on('mouseup', check_if_cancel_newlink)
    })
    this.on('mouseup', (e) => {
      // start new road
      if (lineEditData.editState == 1 && map != undefined && former_idxs[0] != -1) {
        if (lineEditData.startNodeIdx != former_idxs[0]) {
          e.originalEvent.stopPropagation()
          // restore the map's movement events
          map.dragging.enable()
          // stop listen to map
          map.off('mouseout', check_if_cancel_newlink)
          map.off('mouseup', check_if_cancel_newlink)
          map.off('mousemove', onMouseMove)

          // record the target of the terminating node
          node_clicked.value = lineEditData.startNodeIdx
          lineEditData.endNodeIdx = former_idxs[0]

          saveNewLink1(e.originalEvent)
          // determine whether the mouse is being held down and then released
          if (!_this.if_mouse_in) {
            // save_new_road()
          } else {
            _this.if_mouse_in = false
          }
        } else {
          check_if_cancel_newlink()
        }
      }
    })

    // right-click to delete the node
    this.on('contextmenu', async (e) => {
      // cancel former operations
      // remove styles
      shutdown_demand_show()
      if (link_clicked.value != -1) {
        link_clicked.value = -1
        // reset style
        rmFormerLinesAndDots()
        draw_links_and_nodes()
      }
      menu_show.value = -1
      draw_nodes_links_from_newnode()
      lineEditData.endDraw()
      // determine whether it is necessary to delete the previous roads
      if (now_new_line != undefined && map.hasLayer(now_new_line)) {
        map.removeLayer(now_new_line)
      }

      // prevent default right-click menu
      e.originalEvent.preventDefault()

      let networkIdx = networkSelData.last_sel_network_id
      if (_this.former_idxs.length == 0) {
        console.log('Node Delete Error: node"-1" not exists!')
        return
      }
      if (networkIdx < 0 || networkIdx > networkData.networksInfoArr.length) {
        console.log('Node Delete Error: network"' + networkIdx + '" not exists.')
        return
      }

      // start save edit
      const node2delete = _this.former_idxs[0]
      if (networkData.networksInfoArr[networkIdx].nodes[node2delete].isOd) {
        alert('This node is part of an od pair, deleting it will causes unexpected error.')
        return
      }
      networkIdx = await networkData.networkDuplicate(networkIdx)

      await networkData.delNode(networkIdx, node2delete)
      // shut down the menu
      node_edit_menu_off()
      // switch to the new network
      networkSelData.selectNetwork(networkData.last_network_idx)
    })

    let handle_mouse_hold_timer = -1
    this.on('mouseover', () => {
      clearTimeout(handle_mouse_hold_timer)
      handle_mouse_hold_timer = setTimeout(() => {
        _this.if_mouse_in = true
      }, 1000)
    })
    this.on('mouseout', () => {
      clearTimeout(handle_mouse_hold_timer)
      _this.if_mouse_in = false
    })

    // Add click event listener
    this.on('click', () => {
      this.isSelected = !this.isSelected
      // console.log("node idx(this network): ", this.former_idxs[0]);
      return
    })
  }
}

function get_links(network_idx: number) {
  if (network_idx < 0 || network_idx >= networkData.networksInfoArr.length) {
    network_idx = 0
  }
  const links_arr = [] as number[][][]
  const nodes_in_network = networkData.networksInfoArr[network_idx].nodes
  for (let i = 0; i < networkData.networksInfoArr[network_idx].links.length; i++) {
    let link_data = networkData.networksInfoArr[network_idx].links[i]
    const now_link = [] as number[][]
    const start_point_id = link_data.pInNode
    const end_point_id = link_data.pOutNode
    now_link.push([nodes_in_network[start_point_id].lat, nodes_in_network[start_point_id].lon])
    now_link.push([nodes_in_network[end_point_id].lat, nodes_in_network[end_point_id].lon])
    links_arr.push(now_link)
  }
  return links_arr
}

watch(
  () => lineEditData.editState,
  (newValue: number, oldValue: number) => {
    if (newValue == 0 && oldValue == 1) {
      if (now_new_line != undefined) map.removeLayer(now_new_line)
    }
  }
)

watch(
  () => networkSelData.last_sel_network_id,
  () => {
    if (lineEditData.editState == 1) {
      lineEditData.startDraw()
    }
  }
)

const creategroup = L.featureGroup([])
const dots_in_map = new Array<SelectableNode>()
const links_in_map = new Array<SelectablePolyline>()

// mouse move event listener
function onMouseMove(e: L.LeafletMouseEvent) {
  const lat = e.latlng.lat
  const lng = e.latlng.lng

  if (lineEditData.editState == 1 && map != undefined && lineEditData.startNodeIdx != -1) {
    now_new_line.setLatLngs([
      [lineEditData.startNodePos[0], lineEditData.startNodePos[1]],
      [lat, lng]
    ])
    now_new_line.redraw()
  }
}

// delete the original nodes and segments
function rmFormerLinesAndDots() {
  if (map == undefined) return
  // 删除节点
  for (let i = dots_in_map.length - 1; i >= 0; i--) {
    if (dots_in_map[i]) {
      map.removeLayer(dots_in_map[i])
    }
  }
  // 删除线段
  for (let i = links_in_map.length - 1; i >= 0; i--) {
    if (links_in_map[i]) {
      map.removeLayer(links_in_map[i])
    }
  }
  dots_in_map.length = 0
  links_in_map.length = 0
}
// draw the nodes and segments
function drawLinesAndDots() {
  if (map == undefined) return

  for (let i = links_in_map.length - 1; i >= 0; i--) {
    links_in_map[i].addTo(map)
  }
  // 画上编辑路段的辅助路段
  if (link_edit_assit) map.removeLayer(link_edit_assit)
  if (link_clicked.value != -1 && (menu_show.value == 3 || menu_show.value == 4)) {
    const nodes_in_link = links_in_map[link_clicked.value].getLatLngs() as L.LatLng[]
    const former_link_style = link_style(link_clicked.value)
    link_edit_assit = new EditablePolyline(
      [nodes_in_link[0].lat, nodes_in_link[0].lng],
      [nodes_in_link[1].lat, nodes_in_link[1].lng],
      former_link_style.weight
    )
    link_edit_assit.addTo(map)
  }
  assist_new_link_edit()

  // 画上点
  for (let i = dots_in_map.length - 1; i >= 0; i--) {
    dots_in_map[i].addTo(map)
  }
}

// save original node info and id
let dots_pos = new Array<number[]>()
let links_pos = new Array<number[][]>()
let dots_in_links = new Array<number[]>()
let dots_flow_sum = new Array<number>()
let dots_a_idx = new Array<number>()
let dots_b_idx = new Array<number>()
let link_a_idx = new Array<number>()
let link_b_idx = new Array<number>()
let link_flow_ratio = new Array<number>()
let link_speed_ratio = new Array<number>()

// show range of speed and flow
let speed_scope = [] as number[]
let flow_scope = [0, 1] as number[]
let fftt_dimensity_scope = [0, 1] as number[]
let capacity_scope = [0, 1] as number[]

function link_excursion(link_nodes: number[][], multiple_num: number) {
  const delta_lat = link_nodes[0][0] - link_nodes[1][0]
  const delta_lng = link_nodes[0][1] - link_nodes[1][1]
  let lat_mv = -delta_lng / Math.sqrt(delta_lat * delta_lat + delta_lng * delta_lng)
  let lng_mv = delta_lat / Math.sqrt(delta_lat * delta_lat + delta_lng * delta_lng)

  return [
    [link_nodes[0][0] + lat_mv * multiple_num, link_nodes[0][1] + lng_mv * multiple_num],
    [link_nodes[1][0] + lat_mv * multiple_num, link_nodes[1][1] + lng_mv * multiple_num]
  ]
}

// compute links style
function link_color_compute(std_val: number, linkOpacity: number) {
  let now_color_plan = [] as number[][]
  // if (networkData.link_color_plan_sel!=2)
  now_color_plan = networkData.link_color_plans[networkData.link_color_plan_sel]
  // else now_color_plan = networkData.personalize_color_plan

  let color_seg_idx = Math.floor(std_val * (now_color_plan.length - 1))
  if (color_seg_idx >= now_color_plan.length - 1) color_seg_idx = now_color_plan.length - 2
  else if (color_seg_idx < 0) color_seg_idx = 0
  // console.log("color_seg_idx ", color_seg_idx);

  let color_seg_std_val = std_val * (now_color_plan.length - 1) - color_seg_idx
  if (color_seg_std_val < 0) color_seg_std_val = 0
  else if (color_seg_std_val > 1) color_seg_std_val = 1

  const res_arr = []
  for (let i = 0; i < 3; i++) {
    res_arr.push(
      now_color_plan[color_seg_idx][i] +
        (now_color_plan[color_seg_idx + 1][i] - now_color_plan[color_seg_idx][i]) *
          color_seg_std_val
    )
  }
  return `rgba(${res_arr[0]}, ${res_arr[1]}, ${res_arr[2]}, ${linkOpacity})`
}

function link_style(link_idx: number) {
  // 宽度
  let line_weight =
    Math.pow(1.5, map_zoom_ratio.value - 12) * Math.abs(6 + 4 * link_flow_ratio[link_idx])
  if (link_flow_ratio[link_idx] == 2 || link_flow_ratio[link_idx] == -2) {
    line_weight = Math.pow(1.5, map_zoom_ratio.value - 12) * 6
  }
  // 透明度
  let linkOpacity = 0.7
  if (menu_show.value != 6) {
    if (link_clicked.value != -1) {
      if (link_clicked.value == link_idx) {
        if (menu_show.value == 3 || menu_show.value == 4) linkOpacity = 0.7
        else linkOpacity = 1
      } else linkOpacity = 0.4
    }
  } else {
    // 当到展示饼图的模式时
    if (links_if_in_show_demand.value[link_idx]) {
      linkOpacity = 1
    } else linkOpacity = 0.4
  }

  let line_color = 'rgba('
  // 颜色
  // if (link_speed_ratio[link_idx] > 0) {
  //   line_color += '' + (255 - 225 * link_speed_ratio[link_idx]) + ',255,30,' + linkOpacity + ')'
  // } else {
  //   line_color += '255,' + (255 + 225 * link_speed_ratio[link_idx]) + ',30,' + linkOpacity + ')'
  // }
  if (link_speed_ratio[link_idx] == 2) {
    line_color = 'rgba(0, 255, 178,' + linkOpacity + ')'
  } else if (link_flow_ratio[link_idx] == -2) {
    line_color = 'rgba(195,195,195,' + linkOpacity + ')'
  } else {
    line_color = link_color_compute(link_speed_ratio[link_idx] / 2 + 0.5, linkOpacity)
  }
  // console.log("link_speed_ratio[link_idx] ", link_speed_ratio[link_idx]);

  return {
    color: line_color, //线的颜色
    // fillOpacity: 0.5,
    weight: line_weight //线的粗细
  }
}

function draw_links_and_nodes() {
  const circle_radius = Math.pow(1.5, map_zoom_ratio.value - 12)

  // transfer to polyline and node in lealfet
  const max_dot_flow_sum = Math.max(...dots_flow_sum)
  for (let i = 0; i < dots_pos.length; i++) {
    const now_circle_radius_mp = (dots_flow_sum[i] / max_dot_flow_sum) * 8 + 4
    let nodeColor = '#0380df'
    // mark the node right-clicked
    // if (node_clicked.value == i) nodeColor = "#bfd8ff"
    dots_in_map.push(
      new SelectableNode([dots_pos[i][0], dots_pos[i][1]], [dots_a_idx[i], dots_b_idx[i]], i, {
        // radius: 5,
        radius: now_circle_radius_mp * circle_radius,
        weight: circle_radius / 2 + 2,
        color: nodeColor,
        fillColor: '#fff',
        fillOpacity: 1
      })
    )
  }

  const line_weight_mp = Math.pow(0.8, map_zoom_ratio.value - 12)

  for (let i = 0; i < links_pos.length; i++) {
    const now_line_weight = line_weight_mp * Math.abs(6 + 4 * link_flow_ratio[i])

    const now_link_pos = link_excursion(links_pos[i], -(now_line_weight * 0.00018 + 0.00002))

    links_in_map.push(
      new SelectablePolyline(
        [
          [now_link_pos[0][0], now_link_pos[0][1]],
          [now_link_pos[1][0], now_link_pos[1][1]]
        ],
        [link_a_idx[i], link_b_idx[i]],
        i,
        link_style(i)
      )
    )
  }
  drawLinesAndDots()
}

// listen to changes in the network
watch(
  () => networkSelData.networks_show,
  (newValue: number[], oldValue: number[]) => {
    dots_pos = new Array<number[]>()
    links_pos = new Array<number[][]>()
    dots_a_idx = new Array<number>()
    dots_b_idx = new Array<number>()
    link_a_idx = new Array<number>()
    link_b_idx = new Array<number>()
    link_flow_ratio = new Array<number>()
    link_speed_ratio = new Array<number>()
    dots_in_links = []
    dots_flow_sum = []
    dots_adjacency_matrix = [] // 邻接矩阵

    // re gain network data
    rmFormerLinesAndDots()
    // whether show the map
    if (networkSelData.last_sel_network_id == -1) return
    // if (newValue.length == 1) {
    // const sel_network_data = networkData.getSelNetworkMapInfo(newValue[0])
    if (networkSelData.real_networks_show_max == 1) {
      const sel_network_data = networkData.getSelNetworkMapInfo(networkSelData.last_sel_network_id)

      // save the range of fftt
      const tmp_scope_res = networkData.getNetworkValScope(networkSelData.last_sel_network_id)
      fftt_dimensity_scope = tmp_scope_res.fftt_dimensity_scope
      capacity_scope = tmp_scope_res.capacity_scope

      // continue to save the nodes
      dots_pos = sel_network_data.nodes_pos
      links_pos = sel_network_data.links_pos
      dots_in_links = sel_network_data.nodes_in_links
      for (let i = 0; i < dots_pos.length; i++) {
        dots_a_idx.push(i)
        dots_b_idx.push(-1)
      }
      for (let i = 0; i < links_pos.length; i++) {
        link_a_idx.push(i)
        link_b_idx.push(-1)
      }

      // get the scopes
      flow_scope = sel_network_data.links_flow_scope
      speed_scope = sel_network_data.links_speed_scope
      for (let i = 0; i < sel_network_data.links_flow.length; i++) {
        const now_flow = sel_network_data.links_flow[i]
        const now_speed = sel_network_data.links_speed[i]

        if (flow_scope[1] != flow_scope[0]) {
          link_flow_ratio.push(
            ((now_flow - flow_scope[0]) * 2) / (flow_scope[1] - flow_scope[0]) - 1
          )
        } else {
          link_flow_ratio.push(0)
        }
        if (speed_scope[1] != speed_scope[0]) {
          link_speed_ratio.push(
            ((now_speed - speed_scope[0]) * 2) / (speed_scope[1] - speed_scope[0]) - 1
          )
        } else {
          link_speed_ratio.push(0)
        }
      }
    } else {
      return
    }

    // save total flow for each nodes
    dots_flow_sum = new Array<number>(dots_pos.length).fill(0)
    dots_adjacency_matrix = new Array<boolean[]>(dots_pos.length).fill(
      new Array<boolean>(dots_pos.length).fill(false)
    )
    for (let i = 0; i < dots_in_links.length; i++) {
      dots_flow_sum[dots_in_links[i][0]] += link_flow_ratio[i] + 1
      dots_flow_sum[dots_in_links[i][1]] += link_flow_ratio[i] + 1
      dots_adjacency_matrix[dots_in_links[i][0]][dots_in_links[i][1]] = true
      dots_adjacency_matrix[dots_in_links[i][1]][dots_in_links[i][0]] = true
    }
    draw_links_and_nodes()
  },
  { deep: true }
)
// draw network on the map
function map_show() {
  if (map != undefined) {
    return false
  }

  // init map
  map = L.map('map', {
    doubleClickZoom: false
  }).setView([43.5528027552607, -96.74700008207309], 12)
  map.setMinZoom(12)
  map.setMaxZoom(15)

  // add map layer
  var tiles = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

  var tileLayer = L.tileLayer(tiles, {
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
  }).addTo(map)
  tileLayer.bringToBack()

  // create controllers
  var drawnItems = new L.FeatureGroup()
  map.addLayer(drawnItems)
  L.control.scale().addTo(map)

  // no attribution control
  map.attributionControl.remove()
  // disable zoom btns
  map.zoomControl.remove()

  // scale
  map.on('zoomend', function () {
    map_zoom_ratio.value = map.getZoom()
    // delete nodes
    rmFormerLinesAndDots()
    draw_links_and_nodes()

    // draw assist ones
    draw_nodes_links_from_newnode()
    assist_new_link_edit()

    // draw pies again
    if (menu_show.value == 6) {
      pie_auto_zoom()
    }
  })

  map.on('mousemove', function (e) {
    // console.log(e.latlng)
  })
  map.on('click', function (e: L.LeafletMouseEvent) {
    console.log(e.latlng)
  })

  return
}

onMounted(() => {
  map_show()
  // map_show(0);
})

// tool panels on the map
const menu_show_state = ref(0)
const menu_pos = ref([0, 0])
const node_clicked = ref(-1)
function handleNodeClick(e: MouseEvent, node_idx: number) {
  // remove road styles
  if (link_clicked.value != -1) {
    link_clicked.value = -1
    // reset styles
    rmFormerLinesAndDots()
    draw_links_and_nodes()
  }
  menu_show.value = -1
  draw_nodes_links_from_newnode()
  lineEditData.endNodeIdx = -1

  // menu position
  let menu_left = e.clientX + 5
  let menu_top = e.clientY

  const map_left = document.getElementById('map')?.offsetLeft as number
  const map_top = document.getElementById('map')?.offsetWidth as number
  if (menu_left + 100 > map_left + map_top) menu_left -= 110

  menu_pos.value = [menu_left, e.clientY]
  menu_show_state.value = 0
  menu_show.value = 0

  // save node id
  node_clicked.value = node_idx

  // mark the nodes being edited
  dots_in_map[node_clicked.value].setStyle({
    color: '#bfd8ff'
  })
  const nodeElement = dots_in_map[node_clicked.value].getElement() as HTMLElement
  nodeElement.classList.add('node_edit')
}
function handleLinkClick(e: MouseEvent, link_idx: number) {
  // whether delete former roads
  if (now_new_line != undefined && map.hasLayer(now_new_line)) {
    map.removeLayer(now_new_line)
  }
  // remove node style
  if (node_clicked.value != -1) {
    dots_in_map[node_clicked.value].setStyle({
      color: '#0380df'
    })
    node_clicked.value = -1
  }
  shutdown_demand_show()

  menu_show.value = -1
  draw_nodes_links_from_newnode()

  // save road to be edit
  link_clicked.value = link_idx

  // menu positon
  let menu_left = e.clientX + 5
  let menu_top = e.clientY

  const map_left = document.getElementById('map')?.offsetLeft as number
  const map_top = document.getElementById('map')?.offsetWidth as number
  if (menu_left + 100 > map_left + map_top) menu_left -= 110

  menu_pos.value = [menu_left, menu_top]
  menu_show_state.value = 0
  menu_show.value = 1

  // link related info
  const network_idx = networkSelData.last_sel_network_id
  lineEditData.networkIdx = network_idx
  lineEditData.lineIdx = link_idx
  lineEditData.newCapacity = networkData.networksInfoArr[network_idx].links[link_idx].capacity
  lineEditData.newFreeFlowTravelTime =
    networkData.networksInfoArr[network_idx].links[link_idx].freeFlowTravelTime

  // highlight the roads
  rmFormerLinesAndDots()
  draw_links_and_nodes()
}
// new road
function handleNewLinkStart() {
  // edit mode
  lineEditData.editState = 1

  const start_node_idx = node_clicked.value
  // whether delete the former roads
  if (now_new_line != undefined && map.hasLayer(now_new_line)) {
    map.removeLayer(now_new_line)
  }

  // new temp roads
  const now_show_network_idx = networkSelData.last_sel_network_id
  const startNode = networkData.networksInfoArr[now_show_network_idx].nodes[start_node_idx]
  lineEditData.networkIdx = now_show_network_idx
  lineEditData.startNodeIdx = start_node_idx
  lineEditData.startNodePos = [startNode.lat, startNode.lon]
  now_new_line = L.polyline([[lineEditData.startNodePos[0], lineEditData.startNodePos[1]]], {
    color: '#fff',
    // fillOpacity: 0.5,
    weight: 6,
    dashArray: '5, 20'
  }).addTo(map)
  now_new_line.bringToBack()

  // start track the mouse
  map.on('mousemove', onMouseMove)

  // 设置菜单栏显示取消和保存
  menu_pos.value[0] += 20
  menu_pos.value[1] += 20
  menu_show_state.value = 1
  menu_show.value = -1
}
function handleCancelNewLink() {
  menu_show_state.value = 0
  // whether delete the former roads
  if (now_new_line != undefined && map.hasLayer(now_new_line)) {
    map.removeLayer(now_new_line)
  }
  lineEditData.endDraw()
  menu_show.value = -1
  assist_new_link_edit()
  map.off('mousemove', onMouseMove)
}
// touch control for creating new road
const new_link_info_width = computed(() => {
  // if legal
  const network_idx = networkSelData.last_sel_network_id
  if (lineEditData.startNodeIdx < 0 || lineEditData.endNodeIdx < 0 || node_clicked.value == -1) {
    return {
      fftt_width: 0,
      i_fftt_width: 0,
      cap_width: 0,
      i_cap_width: 0
    }
  }

  // compute fftt
  const Node1 = networkData.networksInfoArr[network_idx].nodes[lineEditData.startNodeIdx]
  const Node2 = networkData.networksInfoArr[network_idx].nodes[lineEditData.endNodeIdx]
  const pos_dis = Math.sqrt(Math.pow(Node1.lat - Node2.lat, 2) + Math.pow(Node1.lon - Node2.lon, 2))
  const now_fftt_dimensity = lineEditData.newFreeFlowTravelTime / pos_dis
  const now_i_fftt_dimensity = lineEditData.newIFreeFlowTravelTime / pos_dis
  const now_fftt_width =
    ((now_fftt_dimensity - fftt_dimensity_scope[0]) /
      (fftt_dimensity_scope[1] - fftt_dimensity_scope[0])) *
    80
  const now_i_fftt_width =
    ((now_i_fftt_dimensity - fftt_dimensity_scope[0]) /
      (fftt_dimensity_scope[1] - fftt_dimensity_scope[0])) *
    80

  // compute capacity
  const now_capacity_width =
    ((lineEditData.newCapacity - capacity_scope[0]) / (capacity_scope[1] - capacity_scope[0])) * 80
  const now_i_capacity_width =
    ((lineEditData.newICapacity - capacity_scope[0]) / (capacity_scope[1] - capacity_scope[0])) * 80
  // console.log("now fftt",link_clicked.value,": ", now_fftt_dimensity);
  return {
    fftt_width: now_fftt_width,
    i_fftt_width: now_i_fftt_width,
    cap_width: now_capacity_width,
    i_cap_width: now_i_capacity_width
  }
})
function handleNewLinkFFTTPush(e: MouseEvent, link_type: number) {
  e.stopPropagation()
  if (e.buttons == 1) {
    // click
    // compute road length
    const network_idx = networkSelData.last_sel_network_id
    const Node1 = networkData.networksInfoArr[network_idx].nodes[lineEditData.startNodeIdx]
    const Node2 = networkData.networksInfoArr[network_idx].nodes[lineEditData.endNodeIdx]
    const pos_dis = Math.sqrt(
      Math.pow(Node1.lat - Node2.lat, 2) + Math.pow(Node1.lon - Node2.lon, 2)
    )

    // compute ttff
    const ttff_val = e.offsetX / 80
    let new_ttff =
      ttff_val * (fftt_dimensity_scope[1] - fftt_dimensity_scope[0]) + fftt_dimensity_scope[0]
    new_ttff *= pos_dis

    if (link_type == 0) {
      lineEditData.newFreeFlowTravelTime = new_ttff
    } else {
      lineEditData.newIFreeFlowTravelTime = new_ttff
    }
  }
}
function handleNewLinkCapacityPush(e: MouseEvent, link_type: number) {
  e.stopPropagation()
  if (e.buttons == 1) {
    // click
    // compute capacity
    const cap_val = e.offsetX / 80
    const new_capacity = cap_val * (capacity_scope[1] - capacity_scope[0]) + capacity_scope[0]
    if (link_type == 0) {
      lineEditData.newCapacity = new_capacity
    } else {
      lineEditData.newICapacity = new_capacity
    }
  }
}
// save new road
function saveNewLink1(e: MouseEvent) {
  menu_show_state.value = 0

  // determine whether there is a connection between the two points
  const network_idx = networkSelData.last_sel_network_id
  if (
    networkData.check_if_network_contains_link(
      network_idx,
      lineEditData.startNodeIdx,
      lineEditData.endNodeIdx
    )
  ) {
    handleCancelNewLink()
    console.log('New Link Error: link already exists!')
    return
  }

  // set the menu bar position to align with the endpoint of the new segment
  const link_middle_pos = map.latLngToContainerPoint(now_new_line.getCenter())
  let menu_left = link_middle_pos.x
  let menu_top = link_middle_pos.y

  const map_left = document.getElementById('map')?.offsetLeft as number
  const map_w = document.getElementById('map')?.offsetWidth as number
  if (menu_left + 230 > map_left + map_w) menu_left -= 220
  const map_top = document.getElementById('map')?.offsetTop as number
  const map_h = document.getElementById('map')?.offsetHeight as number
  if (menu_top + 120 > map_h + map_top) menu_top -= 120

  // capacity set
  lineEditData.former_flow = (capacity_scope[1] + capacity_scope[0]) / 2
  // lineEditData.newCapacity = lineEditData.former_flow
  // lineEditData.newICapacity = lineEditData.former_flow
  lineEditData.newCapacity = networkData.avg_capacity(network_idx)
  lineEditData.newICapacity = lineEditData.newCapacity
  // fftt set
  // calculate the length of the road
  const Node1 = networkData.networksInfoArr[network_idx].nodes[lineEditData.startNodeIdx]
  const Node2 = networkData.networksInfoArr[network_idx].nodes[lineEditData.endNodeIdx]
  const pos_dis = Math.sqrt(Math.pow(Node1.lat - Node2.lat, 2) + Math.pow(Node1.lon - Node2.lon, 2))

  // compute ttff
  lineEditData.former_travel_time = fftt_dimensity_scope[1] * pos_dis
  lineEditData.min_fftt = fftt_dimensity_scope[0] * pos_dis
  // lineEditData.newFreeFlowTravelTime = (lineEditData.former_travel_time + lineEditData.min_fftt)/2
  lineEditData.newFreeFlowTravelTime = networkData.avg_fftt_density(network_idx) * pos_dis
  lineEditData.newIFreeFlowTravelTime = lineEditData.newFreeFlowTravelTime

  // default two-way
  lineEditData.isBidirection = true
  menu_pos.value = [menu_left, menu_top]
  menu_show_state.value = 0
  menu_show.value = 2
  assist_new_link_edit()
}
async function save_new_road() {
  menu_show.value = -1
  menu_show_state.value = 0
  node_clicked.value = -1
  // determine whether it is necessary to delete the previous roads
  if (now_new_line != undefined && map.hasLayer(now_new_line)) {
    map.removeLayer(now_new_line)
  }

  // determine whether the current changes to the road can be saved
  if (lineEditData.editState != 1) {
    console.log('New Link Error: The current state is non-editable.')
    return
  }
  let networkIdx = networkSelData.last_sel_network_id
  networkIdx = await networkData.networkDuplicate(networkIdx)

  const startPtId = lineEditData.startNodeIdx
  const endPtId = lineEditData.endNodeIdx
  // return
  const capacity = lineEditData.newCapacity
  const freeFlowTravelTime = lineEditData.newFreeFlowTravelTime
  const iCapacity = lineEditData.newICapacity
  const iFreeFlowTravelTime = lineEditData.newIFreeFlowTravelTime
  const iExist = lineEditData.isBidirection
  await networkData.newLink(
    networkIdx,
    startPtId,
    endPtId,
    freeFlowTravelTime,
    capacity,
    iFreeFlowTravelTime,
    iCapacity,
    iExist
  )
  lineEditData.endDraw()
  assist_new_link_edit()
  // switch network
  networkSelData.selectNetwork(networkData.last_network_idx)
}
function switchNewWayNum() {
  lineEditData.isBidirection = !lineEditData.isBidirection
}
const switch_way_num_btn = computed(() => {
  let icon_src = '/static/edits_btn/one_way.svg'
  if (lineEditData.isBidirection) icon_src = '/static/edits_btn/two_way.svg'
  return icon_src
})
// delete node
function node_edit_menu_off() {
  // 关闭对话框的代码
  menu_show.value = -1
  menu_show_state.value = 0

  // 移除节点的样式
  if (node_clicked.value != -1) {
    dots_in_map[node_clicked.value].setStyle({
      color: '#0380df'
    })
    node_clicked.value = -1
  }
  // 移除新创建的边
  if (now_new_line) map.removeLayer(now_new_line)
  lineEditData.endDraw()
}
async function commit_node_del() {
  let networkIdx = networkSelData.last_sel_network_id

  // 开始保存修改
  const node2delete = node_clicked.value
  if (networkData.networksInfoArr[networkIdx].nodes[node2delete].isOd) {
    alert('This node is part of an od pair, deleting it will causes unexpected error.')
    return
  }

  // 可以正常删除
  networkIdx = await networkData.networkDuplicate(networkIdx)
  await networkData.delNode(networkIdx, node2delete)
  // 操作成功后关闭菜单
  node_edit_menu_off()
  // 切换显示的network
  networkSelData.selectNetwork(networkData.last_network_idx)
}

// edit road
function link_edit_menu_off() {
  menu_show.value = -1
  menu_show_state.value = 0
  // remove road style
  if (link_clicked.value != -1) {
    link_clicked.value = -1
    // reset style
    rmFormerLinesAndDots()
    draw_links_and_nodes()
  }

  // remove the temporary nodes and roads created by the new node
  draw_nodes_links_from_newnode()
}
function show_menu_from_idx(reset_info_type: number) {
  menu_show.value = -1
  draw_nodes_links_from_newnode()
  menu_show.value = reset_info_type
  menu_show_state.value = 0
  const link_idx = link_clicked.value
  const network_idx = networkSelData.last_sel_network_id

  if ((menu_show.value == 1 && link_idx >= 0) || menu_show.value == 3 || menu_show.value == 4) {
    // reintroduce segment information
    const former_link = networkData.networksInfoArr[network_idx].links[link_idx]
    lineEditData.newCapacity = former_link.capacity
    lineEditData.newFreeFlowTravelTime = former_link.freeFlowTravelTime
    lineEditData.former_flow = former_link.flow
    lineEditData.former_travel_time = former_link.travelTime
    lineEditData.min_fftt = 0

    if (menu_show.value == 4) lineEditData.former_travel_time = former_link.freeFlowTravelTime
  }

  rmFormerLinesAndDots()
  draw_links_and_nodes()
}
// click to edit free flow travel time
const fftt_set_width = computed(() => {
  // console.log("fftt scope: ", fftt_dimensity_scope);

  const network_idx = networkSelData.last_sel_network_id
  if (network_idx < 0 || link_clicked.value == -1) return 0
  const now_link = networkData.networksInfoArr[network_idx].links[link_clicked.value]
  const Node1 = networkData.networksInfoArr[network_idx].nodes[now_link.pInNode]
  const Node2 = networkData.networksInfoArr[network_idx].nodes[now_link.pOutNode]
  const pos_dis = Math.sqrt(Math.pow(Node1.lat - Node2.lat, 2) + Math.pow(Node1.lon - Node2.lon, 2))
  const now_fftt_dimensity = lineEditData.newFreeFlowTravelTime / pos_dis
  // console.log("now fftt",link_clicked.value,": ", now_fftt_dimensity);

  return (
    ((now_fftt_dimensity - fftt_dimensity_scope[0]) /
      (fftt_dimensity_scope[1] - fftt_dimensity_scope[0])) *
    83
  )
})
function handleFFTTReset(e: MouseEvent) {
  e.stopPropagation()
  if (e.buttons == 1) {
    // road length
    const network_idx = networkSelData.last_sel_network_id
    const now_link = networkData.networksInfoArr[network_idx].links[link_clicked.value]
    const Node1 = networkData.networksInfoArr[network_idx].nodes[now_link.pInNode]
    const Node2 = networkData.networksInfoArr[network_idx].nodes[now_link.pOutNode]
    const pos_dis = Math.sqrt(
      Math.pow(Node1.lat - Node2.lat, 2) + Math.pow(Node1.lon - Node2.lon, 2)
    )

    // compute ttff
    const ttff_val = e.offsetX / 83
    let new_ttff =
      ttff_val * (fftt_dimensity_scope[1] - fftt_dimensity_scope[0]) + fftt_dimensity_scope[0]
    new_ttff *= pos_dis
    lineEditData.newFreeFlowTravelTime = new_ttff
  }
}
// click to edit capacity
const capacity_set_width = computed(() => {
  const network_idx = networkSelData.last_sel_network_id
  if (network_idx < 0 || link_clicked.value == -1) return 0
  return (
    ((lineEditData.newCapacity - capacity_scope[0]) / (capacity_scope[1] - capacity_scope[0])) * 83
  )
})
function handleCapacityReset(e: MouseEvent) {
  e.stopPropagation()
  if (e.buttons == 1) {
    // compute capacity
    const cap_val = e.offsetX / 83
    const new_capacity = cap_val * (capacity_scope[1] - capacity_scope[0]) + capacity_scope[0]
    lineEditData.newCapacity = new_capacity
  }
}
// submit modifications to the road information editing
async function commit_link_edit(edit_type: number) {
  let networkIdx = networkSelData.last_sel_network_id
  networkIdx = await networkData.networkDuplicate(networkIdx)

  // start save
  const link_idx_to_change = lineEditData.lineIdx
  let new_capacity = lineEditData.newCapacity
  let new_free_flow_travel_time =
    networkData.networksInfoArr[networkIdx].links[link_idx_to_change].freeFlowTravelTime
  if (edit_type == 0) {
    new_capacity = networkData.networksInfoArr[networkIdx].links[link_idx_to_change].capacity
    new_free_flow_travel_time = lineEditData.newFreeFlowTravelTime
  }

  await networkData.resetLink(
    networkIdx,
    link_idx_to_change,
    new_free_flow_travel_time,
    new_capacity
  )
  lineEditData.endDraw()
  link_edit_menu_off()
  // 切换显示的network
  networkSelData.selectNetwork(networkData.last_network_idx)
}
// submit delete link
async function commit_link_del() {
  let networkIdx = networkSelData.last_sel_network_id
  networkIdx = await networkData.networkDuplicate(networkIdx)

  // start save
  console.log('link_edit: ', link_clicked.value, ', ', lineEditData.lineIdx)

  const link_idx_to_del = lineEditData.lineIdx

  await networkData.delLink(networkIdx, link_idx_to_del)
  lineEditData.endDraw()
  link_edit_menu_off()
  // switch network
  networkSelData.selectNetwork(networkData.last_network_idx)
}

// new node
const click_new_node_btn = () => {
  // init info
  lineEditData.isBidirection = true
  lineEditData.isAttach = true
  lineEditData.newNodePos = 0.5

  // get node info
  const network_idx = networkSelData.last_sel_network_id
  const now_link = networkData.networksInfoArr[network_idx].links[link_clicked.value]
  const Node1 = networkData.networksInfoArr[network_idx].nodes[now_link.pInNode]
  const Node2 = networkData.networksInfoArr[network_idx].nodes[now_link.pOutNode]
  lineEditData.newNodeLat = (Node1.lat + Node2.lat) / 2
  lineEditData.newNodeLng = (Node1.lon + Node2.lon) / 2

  // init info about the saved road
  lineEditData.newFreeFlowTravelTime = now_link.freeFlowTravelTime / 2
  lineEditData.newIFreeFlowTravelTime = now_link.freeFlowTravelTime / 2
  lineEditData.newCapacity = now_link.capacity
  lineEditData.newICapacity = now_link.capacity

  // show menu
  show_menu_from_idx(5)
  draw_nodes_links_from_newnode()
}
const lock_btn_icon = computed(() => {
  if (lineEditData.isAttach) {
    return '/static/edits_btn/lock.svg'
  } else return '/static/edits_btn/unlock.svg'
})
watch(
  () => lineEditData.newNodePos,
  (newValue: number) => {
    // compute the node position
    const network_idx = networkSelData.last_sel_network_id
    const now_link = networkData.networksInfoArr[network_idx].links[link_clicked.value]
    const Node1 = networkData.networksInfoArr[network_idx].nodes[now_link.pInNode]
    const Node2 = networkData.networksInfoArr[network_idx].nodes[now_link.pOutNode]
    lineEditData.newNodeLat =
      Node1.lat * (1 - lineEditData.newNodePos) + Node2.lat * lineEditData.newNodePos
    lineEditData.newNodeLng =
      Node1.lon * (1 - lineEditData.newNodePos) + Node2.lon * lineEditData.newNodePos
  }
)
watch(
  () => lineEditData.newNodeLat,
  (newValue: number) => {
    if (menu_show.value == 5) {
      // node info
      const network_idx = networkSelData.last_sel_network_id
      const now_link = networkData.networksInfoArr[network_idx].links[link_clicked.value]
      const Node1 = networkData.networksInfoArr[network_idx].nodes[now_link.pInNode]
      const Node2 = networkData.networksInfoArr[network_idx].nodes[now_link.pOutNode]

      // node position
      if (lineEditData.isAttach && Node1.lat != Node2.lat) {
        lineEditData.newNodePos = (newValue - Node1.lat) / (Node2.lat - Node1.lat)
        const sumFFTT = lineEditData.newFreeFlowTravelTime + lineEditData.newIFreeFlowTravelTime
        lineEditData.newFreeFlowTravelTime = sumFFTT * lineEditData.newNodePos
        lineEditData.newIFreeFlowTravelTime = sumFFTT * (1 - lineEditData.newNodePos)
      }
      draw_nodes_links_from_newnode()
    }
  }
)
watch(
  () => lineEditData.newNodeLng,
  (newValue: number) => {
    if (menu_show.value == 5) {
      // node info
      const network_idx = networkSelData.last_sel_network_id
      const now_link = networkData.networksInfoArr[network_idx].links[link_clicked.value]
      const Node1 = networkData.networksInfoArr[network_idx].nodes[now_link.pInNode]
      const Node2 = networkData.networksInfoArr[network_idx].nodes[now_link.pOutNode]

      // node position
      if (lineEditData.isAttach && Node1.lon != Node2.lon) {
        lineEditData.newNodePos = (newValue - Node1.lon) / (Node2.lon - Node1.lon)
        const sumFFTT = lineEditData.newFreeFlowTravelTime + lineEditData.newIFreeFlowTravelTime
        lineEditData.newFreeFlowTravelTime = sumFFTT * lineEditData.newNodePos
        lineEditData.newIFreeFlowTravelTime = sumFFTT * (1 - lineEditData.newNodePos)
      }
      draw_nodes_links_from_newnode()
    }
  }
)
watch(
  () => lineEditData.isBidirection,
  () => {
    if (menu_show.value == 5) {
      draw_nodes_links_from_newnode()
    }
  }
)
// In the new node, click to modify the segment's free flow travel time
const new_nodes_fftt_width = computed(() => {
  // console.log("fftt scope: ", fftt_dimensity_scope);

  const network_idx = networkSelData.last_sel_network_id
  if (network_idx < 0 || link_clicked.value == -1) return { width_1: 0, width_2: 0 }
  const now_link = networkData.networksInfoArr[network_idx].links[link_clicked.value]
  const Node1 = networkData.networksInfoArr[network_idx].nodes[now_link.pInNode]
  const Node2 = networkData.networksInfoArr[network_idx].nodes[now_link.pOutNode]
  const pos_dis1 = Math.sqrt(
    Math.pow(Node1.lat - lineEditData.newNodeLat, 2) +
      Math.pow(Node1.lon - lineEditData.newNodeLng, 2)
  )
  const pos_dis2 = Math.sqrt(
    Math.pow(lineEditData.newNodeLat - Node2.lat, 2) +
      Math.pow(lineEditData.newNodeLng - Node2.lon, 2)
  )

  const now_fftt_dimensity_1 = lineEditData.newFreeFlowTravelTime / pos_dis1
  const now_fftt_dimensity_2 = lineEditData.newIFreeFlowTravelTime / pos_dis2
  const now_fftt_width_1 =
    ((now_fftt_dimensity_1 - fftt_dimensity_scope[0]) /
      (fftt_dimensity_scope[1] - fftt_dimensity_scope[0])) *
    83
  const now_fftt_width_2 =
    ((now_fftt_dimensity_2 - fftt_dimensity_scope[0]) /
      (fftt_dimensity_scope[1] - fftt_dimensity_scope[0])) *
    83
  // console.log("now fftt",link_clicked.value,": ", now_fftt_dimensity);

  return {
    width_1: now_fftt_width_1,
    width_2: now_fftt_width_2
  }
})
function handleNewNodeFFTT(e: MouseEvent, link_in_two: number) {
  e.stopPropagation()
  if (e.buttons == 1) {
    // 鼠标的左键按下
    // 计算路段的长度
    const network_idx = networkSelData.last_sel_network_id
    const now_link = networkData.networksInfoArr[network_idx].links[link_clicked.value]
    const Node1 = networkData.networksInfoArr[network_idx].nodes[now_link.pInNode]
    const Node2 = networkData.networksInfoArr[network_idx].nodes[now_link.pOutNode]
    if (link_in_two == 0) {
      const pos_dis = Math.sqrt(
        Math.pow(Node1.lat - lineEditData.newNodeLat, 2) +
          Math.pow(Node1.lon - lineEditData.newNodeLng, 2)
      )

      // 推算出ttff
      const ttff_val = e.offsetX / 83
      let new_ttff =
        ttff_val * (fftt_dimensity_scope[1] - fftt_dimensity_scope[0]) + fftt_dimensity_scope[0]
      new_ttff *= pos_dis
      lineEditData.newFreeFlowTravelTime = new_ttff
    } else {
      const pos_dis = Math.sqrt(
        Math.pow(lineEditData.newNodeLat - Node2.lat, 2) +
          Math.pow(lineEditData.newNodeLng - Node2.lon, 2)
      )

      // 推算出ttff
      const ttff_val = e.offsetX / 83
      let new_ttff =
        ttff_val * (fftt_dimensity_scope[1] - fftt_dimensity_scope[0]) + fftt_dimensity_scope[0]
      new_ttff *= pos_dis
      lineEditData.newIFreeFlowTravelTime = new_ttff
    }
  }
}
// cancel new node
function handleCancelNewNode(shut_down_menu: true | undefined) {
  // delete former roads
  menu_show.value = -1
  draw_nodes_links_from_newnode()

  if (shut_down_menu == undefined) {
    menu_show_state.value = 0
    menu_show.value = 1

    // save info
    const network_idx = networkSelData.last_sel_network_id
    const link_idx = lineEditData.lineIdx
    lineEditData.newCapacity = networkData.networksInfoArr[network_idx].links[link_idx].capacity
    lineEditData.newFreeFlowTravelTime =
      networkData.networksInfoArr[network_idx].links[link_idx].freeFlowTravelTime
  } else {
    link_clicked.value = -1
    lineEditData.endDraw()
  }

  // reset styles
  rmFormerLinesAndDots()
  draw_links_and_nodes()
}
// submit new node
async function commit_node_new() {
  // replicate network
  let networkIdx = networkSelData.last_sel_network_id
  networkIdx = await networkData.networkDuplicate(networkIdx)

  // request info
  const nodeLat = lineEditData.newNodeLat
  const nodeLng = lineEditData.newNodeLng
  const formerLinkA = link_clicked.value
  const aFFTT = [lineEditData.newFreeFlowTravelTime, lineEditData.newIFreeFlowTravelTime]
  const bFFTT = [aFFTT[1], aFFTT[0]]
  let formerLinkB = -1
  if (lineEditData.isBidirection) formerLinkB = 1

  // networkIdx: number, nodeLat: number, nodeLng: number, formerLinkA: number, aFFTT: number[], formerLinkB: number, bFFTT: number[]
  await networkData.newNode(networkIdx, nodeLat, nodeLng, formerLinkA, aFFTT, formerLinkB, bFFTT)
  lineEditData.endDraw()
  handleCancelNewNode(true)
  // switch network
  networkSelData.selectNetwork(networkData.last_network_idx)
}

// move menu
function handleMenuMove(e: MouseEvent) {
  if (e.buttons == 1) {
    let d_x = e.movementX
    let d_y = e.movementY
    menu_pos.value[0] += d_x
    menu_pos.value[1] += d_y
  }
}
function stopEventPropagation(e: MouseEvent) {
  e.stopPropagation()
}
let click_to_show_link = false
// listen for document click events
document.addEventListener('click', function (event) {
  const map_area_content = document.getElementById('map_area') as HTMLElement
  // determine whether the clicked target element is an element within the dialog box
  const isClickInsideNodeMenu = map_area_content.contains(event.target as HTMLElement)

  // If the clicked target element is not an element within the dialog box, close the dialog box
  const element_clicked = event.target as HTMLElement
  // When the clicked element is a map element
  if (element_clicked.classList.contains('leaflet-interactive')) {
    return
  }

  if (!isClickInsideNodeMenu && menu_show.value != -1) {
    // close menu
    const former_menu_show = menu_show.value
    menu_show.value = -1
    menu_show_state.value = 0

    // remove node style
    if (node_clicked.value != -1) {
      node_clicked.value = -1
      assist_new_link_edit()
    }
    // remove new line
    if (now_new_line) map.removeLayer(now_new_line)
    lineEditData.endDraw()

    // remove road style
    if (link_clicked.value != -1 && !click_to_show_link) {
      link_clicked.value = -1
      // reset style
      rmFormerLinesAndDots()
      draw_links_and_nodes()
    } else if (click_to_show_link) {
      click_to_show_link = false
      menu_show.value = 1
    }

    // remove the temporary nodes and roads created by the new node
    draw_nodes_links_from_newnode()

    // remove the pies in demand mode
    if (former_menu_show == 6) {
      shutdown_demand_show()
      // remove highlight
      rmFormerLinesAndDots()
      draw_links_and_nodes()
    }
  }
})

// highlight the road hovered in the comparison view
function light_road_matrix_clicked() {
  // click_to_show_link = true
  const network_idx = networkSelData.last_sel_network_id
  const link_idx = lineEditData.lineIdx
  if (
    network_idx == -1 ||
    link_idx == -1 ||
    link_idx > networkData.networksInfoArr[network_idx].links.length
  ) {
    console.log('[link show] The current segment does not exist in the currently displayed network')
    return
  }
  if (menu_show.value != 6) {
    // determine whether it is necessary to delete the previous road
    if (now_new_line != undefined && map.hasLayer(now_new_line)) {
      map.removeLayer(now_new_line)
    }
    // remove node style
    if (node_clicked.value != -1) {
      dots_in_map[node_clicked.value].setStyle({
        color: '#0380df'
      })
      node_clicked.value = -1
    }
    menu_show.value = -1
    draw_nodes_links_from_newnode()

    // save the segments that need to be modified
    link_clicked.value = link_idx

    // menu position
    const link_geo_pos = links_in_map[link_idx].getCenter()
    map.setView(link_geo_pos)
    const link_screen_pos = map.latLngToContainerPoint(link_geo_pos)
    const map_container = document.getElementById('map') as HTMLElement
    const map_pos = map_container.getBoundingClientRect()
    // let menu_left = link_screen_pos.x+15
    // let menu_top = link_screen_pos.y+15
    let menu_left = map_pos.left + map_pos.width / 2 + 10
    let menu_top = map_pos.top + map_pos.height / 2 + 10

    const map_left = document.getElementById('map')?.offsetLeft as number
    const map_top = document.getElementById('map')?.offsetWidth as number
    if (menu_left + 100 > map_left + map_top) menu_left -= 110

    menu_pos.value = [menu_left, menu_top]
    menu_show_state.value = 0
    menu_show.value = 1

    // save road info
    lineEditData.lineIdx = link_idx
    lineEditData.newCapacity = networkData.networksInfoArr[network_idx].links[link_idx].capacity
    lineEditData.newFreeFlowTravelTime =
      networkData.networksInfoArr[network_idx].links[link_idx].freeFlowTravelTime

    // reset styles
    rmFormerLinesAndDots()
    draw_links_and_nodes()
  } else {
    add_link_to_show_demand(link_idx)
  }
}
watch(
  () => lineEditData.link_to_lightup,
  () => {
    light_road_matrix_clicked()
  }
)

// compute road length
watch(
  () => networkData.networksInfoArr,
  () => {
    const networks_edit_detail = [
      { edit_links_len: 0, close_links_len: 0, new_tunnel_num: 0 }
    ] as networkEditNumber[]
    // networkData.networksInfoArr.forEach((network_info) => {

    // })
    const global2link_idx = [] as number[][]
    for (let i = 0; i < networkData.networksInfoArr.length; i += 1) {
      const tmp = [] as number[]
      for (let j = 0; j < networkData.links_if_sel.length; j += 1) {
        tmp.push(-1)
      }
      global2link_idx.push(tmp)
    }
    for (let i = 0; i < networkData.networksInfoArr.length; i += 1) {
      for (let j = 0; j < networkData.networksInfoArr[i].links.length; j += 1) {
        const link_gidx = networkData.networksInfoArr[i].links[j].globalId
        global2link_idx[i][link_gidx] = j
      }
    }

    for (let i = 1; i < networkData.networksInfoArr.length; i += 1) {
      const father_net_idx = networkData.networksFatherIdx[i]
      const father_network = networkData.networksInfoArr[father_net_idx]
      const now_network = networkData.networksInfoArr[i]
      const now_edit_detail = {
        edit_links_len: networks_edit_detail[father_net_idx].edit_links_len,
        close_links_len: networks_edit_detail[father_net_idx].close_links_len,
        new_tunnel_num: networks_edit_detail[father_net_idx].new_tunnel_num
      }

      // record the road that edited to prevent recompute two-way road
      const now_nodes_linked = [] as boolean[][]
      now_network.nodes.forEach(() => {
        const tmp = [] as boolean[]
        now_network.nodes.forEach(() => {
          tmp.push(false)
        })
        now_nodes_linked.push(tmp)
      })
      for (let j = 0; j < now_network.links.length; j += 1) {
        const link_data = networkData.networksInfoArr[i].links[j]
        if (now_nodes_linked[link_data.pInNode][link_data.pOutNode]) {
          continue
        }

        const latlng = L.latLng(
          now_network.nodes[link_data.pInNode].lat,
          now_network.nodes[link_data.pInNode].lon
        )
        const latlng2 = L.latLng(
          now_network.nodes[link_data.pOutNode].lat,
          now_network.nodes[link_data.pOutNode].lon
        )
        const distance = latlng.distanceTo(latlng2)
        if (global2link_idx[father_net_idx][link_data.globalId] == -1) {
          // compute length of new road: meters
          now_edit_detail.edit_links_len += distance
          // check new tunnels to build
          let tunnels_num = 0
          const father_nodes_linked = [] as boolean[][]
          father_network.nodes.forEach(() => {
            const tmp = [] as boolean[]
            father_network.nodes.forEach(() => {
              tmp.push(false)
            })
            father_nodes_linked.push(tmp)
          })
          father_network.links.forEach((other_link_data) => {
            if (other_link_data.globalId != link_data.globalId) {
              if (
                !father_nodes_linked[other_link_data.pInNode][other_link_data.pOutNode] &&
                doSegmentsIntersect(
                  now_network.nodes[link_data.pInNode],
                  now_network.nodes[link_data.pOutNode],
                  father_network.nodes[other_link_data.pInNode],
                  father_network.nodes[other_link_data.pOutNode]
                )
              ) {
                console.log(father_nodes_linked[other_link_data.pInNode][other_link_data.pOutNode])
                tunnels_num += 1
                father_nodes_linked[other_link_data.pInNode][other_link_data.pOutNode] = true
                father_nodes_linked[other_link_data.pOutNode][other_link_data.pInNode] = true
                console.log(
                  father_nodes_linked[other_link_data.pInNode][other_link_data.pOutNode],
                  other_link_data.globalId
                )
              }
            }
          })
          now_edit_detail.new_tunnel_num += tunnels_num
        } else {
          const father_link =
            networkData.networksInfoArr[father_net_idx].links[
              global2link_idx[father_net_idx][link_data.globalId]
            ]
          if (
            father_link.capacity != link_data.capacity ||
            father_link.freeFlowTravelTime != link_data.freeFlowTravelTime
          ) {
            now_edit_detail.edit_links_len += distance
          } else continue
        }
        now_nodes_linked[link_data.pInNode][link_data.pOutNode] = true
        now_nodes_linked[link_data.pOutNode][link_data.pInNode] = true
      }
      for (let j = 0; j < father_network.links.length; j += 1) {
        const link_data = father_network.links[j]
        if (global2link_idx[i][link_data.globalId] == -1) {
          const latlng = L.latLng(
            now_network.nodes[link_data.pInNode].lat,
            now_network.nodes[link_data.pInNode].lon
          )
          const latlng2 = L.latLng(
            now_network.nodes[link_data.pOutNode].lat,
            now_network.nodes[link_data.pOutNode].lon
          )
          const distance = latlng.distanceTo(latlng2)
          now_edit_detail.close_links_len += distance
        }
      }
      networks_edit_detail.push(now_edit_detail)
    }
    networkData.networksEditQuantity = networks_edit_detail
  },
  { deep: true }
)
</script>
<template>
  <div class="main_board" id="map_area">
    <div class="map_block">
      <div id="map"></div>
    </div>
    <div
      id="node_menu"
      class="menu_window"
      :class="{ not_show_container: menu_show != 0 }"
      :style="{ left: menu_pos[0] + 'px', top: menu_pos[1] + 'px' }"
      @mousemove="handleMenuMove"
    >
      <div class="state_box" :class="{ not_show_container: menu_show_state != 0 }">
        <div
          class="edit_btn"
          title="Add a link start from the node"
          @click="handleNewLinkStart()"
          @mousedown="handleNewLinkStart()"
        >
          <img src="/static/edits_btn/add_link.svg" alt="" srcset="" />
        </div>
        <div class="edit_btn" title="Delete this node" @click="commit_node_del">
          <img src="/static/edits_btn/del_pt.svg" alt="" srcset="" />
        </div>
      </div>
      <div class="state_box" :class="{ not_show_container: menu_show_state != 1 }">
        <div class="edit_btn" title="Cancel" @click="handleCancelNewLink()">
          <img src="/static/edits_btn/cancel.svg" alt="" srcset="" />
        </div>
        <div class="edit_btn" title="Save" @click="saveNewLink1($event)">
          <img src="/static/edits_btn/save.svg" alt="" srcset="" />
        </div>
      </div>
    </div>
    <div
      id="link_menu"
      class="menu_window"
      :class="{ not_show_container: menu_show != 1, state1: menu_show_state == 0 }"
      :style="{ left: menu_pos[0] + 'px', top: menu_pos[1] + 'px' }"
      @mousemove="handleMenuMove"
    >
      <div class="state_box" :class="{ not_show_container: menu_show_state != 0 }">
        <div
          class="edit_btn"
          title="Change road free flow travel time"
          @click="show_menu_from_idx(3)"
        >
          <img src="/static/edits_btn/speed_edit.svg" alt="" srcset="" />
        </div>
        <div class="edit_btn" title="Change road capacity" @click="show_menu_from_idx(4)">
          <img src="/static/edits_btn/capacity_edit.svg" alt="" srcset="" />
        </div>
        <div class="edit_btn" title="Delete this road" @click="commit_link_del">
          <img src="/static/edits_btn/del_link.svg" alt="" srcset="" />
        </div>
        <div class="edit_btn" title="Add a node on this road" @click="click_new_node_btn()">
          <img src="/static/edits_btn/add_pt.svg" alt="" srcset="" />
        </div>
      </div>
      <div class="state_box" :class="{ not_show_container: menu_show_state != 1 }">
        <div class="edit_btn" title="Cancel">
          <img src="/static/edits_btn/cancel-white.svg" alt="" srcset="" />
        </div>
        <div class="edit_btn" title="Save">
          <img src="/static/edits_btn/save-white.svg" alt="" srcset="" />
        </div>
      </div>
    </div>
    <div
      id="new_link_menu"
      class="menu_window"
      :class="{ not_show_container: menu_show != 2 }"
      :style="{ left: menu_pos[0] + 'px', top: menu_pos[1] + 'px' }"
      @mousemove="handleMenuMove"
    >
      <div class="menu_content">
        <div class="col_btn_box">
          <div class="edit_btn" title="Cancel" @click="handleCancelNewLink()">
            <img src="/static/edits_btn/cancel-white.svg" alt="" srcset="" />
          </div>
          <div class="edit_btn" title="Save" @click="save_new_road()">
            <img src="/static/edits_btn/save-white.svg" alt="" srcset="" />
          </div>
          <div
            class="edit_btn"
            title="Switching between two-way roads and one-way roads"
            @click="switchNewWayNum()"
          >
            <img :src="switch_way_num_btn" alt="" srcset="" />
          </div>
        </div>
        <div class="menu_input_part">
          <div class="input_pair">
            <div class="input_title">free flow travel time</div>
            <div class="input_box">
              <div class="val_input_box">
                <input
                  type="number"
                  min="0"
                  v-model="lineEditData.newFreeFlowTravelTime"
                  @mousemove="stopEventPropagation"
                />
              </div>
              <div
                class="range_input_box fftt_ipt"
                @mousemove="handleNewLinkFFTTPush($event, 0)"
                @mousedown="handleNewLinkFFTTPush($event, 0)"
              >
                <div
                  class="range_input_content"
                  :style="{ width: new_link_info_width.fftt_width + 'px' }"
                ></div>
              </div>
            </div>
          </div>
          <div class="input_pair">
            <div class="input_title">capacity</div>
            <div class="input_box">
              <div class="val_input_box">
                <input
                  type="number"
                  min="0"
                  v-model="lineEditData.newCapacity"
                  @mousemove="stopEventPropagation"
                />
              </div>
              <div
                class="range_input_box capacity_ipt"
                @mousemove="handleNewLinkCapacityPush($event, 0)"
                @mousedown="handleNewLinkCapacityPush($event, 0)"
              >
                <div
                  class="range_input_content"
                  :style="{ width: new_link_info_width.cap_width + 'px' }"
                ></div>
              </div>
            </div>
          </div>
          <div class="input_pair" :class="{ not_show_container: !lineEditData.isBidirection }">
            <div class="input_title">opposite free flow travel time</div>
            <div class="input_box">
              <div class="val_input_box">
                <input
                  type="number"
                  min="0"
                  v-model="lineEditData.newIFreeFlowTravelTime"
                  @mousemove="stopEventPropagation"
                />
              </div>
              <div
                class="range_input_box fftt_ipt"
                @mousemove="handleNewLinkFFTTPush($event, 1)"
                @mousedown="handleNewLinkFFTTPush($event, 1)"
              >
                <div
                  class="range_input_content"
                  :style="{ width: new_link_info_width.i_fftt_width + 'px' }"
                ></div>
              </div>
            </div>
          </div>
          <div class="input_pair" :class="{ not_show_container: !lineEditData.isBidirection }">
            <div class="input_title">opposite capacity</div>
            <div class="input_box">
              <div class="val_input_box">
                <input
                  type="number"
                  min="0"
                  v-model="lineEditData.newICapacity"
                  @mousemove="stopEventPropagation"
                />
              </div>
              <div
                class="range_input_box capacity_ipt"
                @mousemove="handleNewLinkCapacityPush($event, 1)"
                @mousedown="handleNewLinkCapacityPush($event, 1)"
              >
                <div
                  class="range_input_content"
                  :style="{ width: new_link_info_width.i_cap_width + 'px' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      id="edit_link_speed_menu"
      class="menu_window edit_link_menu"
      :class="{ not_show_container: menu_show != 3 }"
      :style="{ left: menu_pos[0] + 'px', top: menu_pos[1] + 'px' }"
      @mousemove="handleMenuMove"
    >
      <div class="menu_content">
        <div class="col_btn_box">
          <div class="edit_btn" title="Cancel" @click="show_menu_from_idx(1)">
            <img src="/static/edits_btn/cancel-white.svg" alt="" srcset="" />
          </div>
          <div class="edit_btn" title="Save" @click="commit_link_edit(0)">
            <img src="static/edits_btn/save-white.svg" alt="" srcset="" />
          </div>
        </div>
        <div class="menu_input_part">
          <div class="input_pair">
            <div class="input_title">Free Flow Travel Time</div>
            <div class="input_box">
              <div class="val_input_box">
                <input
                  type="number"
                  v-model="lineEditData.newFreeFlowTravelTime"
                  @mousemove="stopEventPropagation"
                />
              </div>
              <div
                class="range_input_box fftt_ipt"
                @mousedown="handleFFTTReset($event)"
                @mousemove="handleFFTTReset($event)"
              >
                <div class="range_input_content" :style="{ width: fftt_set_width + 'px' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      id="edit_link_capacity_menu"
      class="menu_window edit_link_menu"
      :class="{ not_show_container: menu_show != 4 }"
      :style="{ left: menu_pos[0] + 'px', top: menu_pos[1] + 'px' }"
      @mousemove="handleMenuMove"
    >
      <div class="menu_content">
        <div class="col_btn_box">
          <div class="edit_btn" title="Cancel" @click="show_menu_from_idx(1)">
            <img src="/static/edits_btn/cancel-white.svg" alt="" srcset="" />
          </div>
          <div class="edit_btn" title="Save" @click="commit_link_edit(1)">
            <img src="/static/edits_btn/save-white.svg" alt="" srcset="" />
          </div>
        </div>
        <div class="menu_input_part">
          <div class="input_pair">
            <div class="input_title">Capacity</div>
            <div class="input_box">
              <div class="val_input_box">
                <input
                  type="number"
                  v-model="lineEditData.newCapacity"
                  @mousemove="stopEventPropagation"
                />
              </div>
              <div
                class="range_input_box fftt_ipt"
                @mousedown="handleCapacityReset($event)"
                @mousemove="handleCapacityReset($event)"
              >
                <div
                  class="range_input_content"
                  :style="{ width: capacity_set_width + 'px' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      id="new_node_menu"
      class="menu_window"
      :class="{ not_show_container: menu_show != 5 }"
      :style="{ left: menu_pos[0] + 'px', top: menu_pos[1] + 'px' }"
      @mousemove="handleMenuMove"
    >
      <div class="menu_content">
        <div class="col_btn_box">
          <div class="edit_btn" title="Cancel" @click="handleCancelNewNode(undefined)">
            <img src="/static/edits_btn/cancel-white.svg" alt="" srcset="" />
          </div>
          <div
            class="edit_btn"
            title="Based on one-way or two-way road"
            @click="lineEditData.isBidirection = !lineEditData.isBidirection"
          >
            <img :src="switch_way_num_btn" alt="" srcset="" />
          </div>
          <div class="edit_btn" title="Save" @click="commit_node_new">
            <img src="/static/edits_btn/save-white.svg" alt="" srcset="" />
          </div>
          <div
            class="edit_btn"
            title="Attach the new node to the link"
            @click="lineEditData.isAttach = !lineEditData.isAttach"
          >
            <img :src="lock_btn_icon" alt="" srcset="" />
          </div>
        </div>
        <div class="menu_input_part menu_nodepos_input_part">
          <div class="input_pair">
            <div class="input_title">Node Position</div>
            <div class="input_box" @mousemove="$event.stopPropagation()">
              <div class="val_input_box nodepos_range_box">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  v-model="lineEditData.newNodePos"
                  @mousemove="stopEventPropagation"
                />
              </div>
              <div class="val_input_box nodepos_input_pair_box">
                <div class="nodepos_input_pair">
                  <div class="nodepos_input_title_box">Lat</div>
                  <div class="nodepos_input_box">
                    <input
                      type="number"
                      v-model="lineEditData.newNodeLat"
                      @mousemove="stopEventPropagation"
                    />
                  </div>
                </div>
                <div class="nodepos_input_pair">
                  <div class="nodepos_input_title_box">Lng</div>
                  <div class="nodepos_input_box">
                    <input
                      type="number"
                      v-model="lineEditData.newNodeLng"
                      @mousemove="stopEventPropagation"
                    />
                  </div>
                </div>
              </div>
              <!-- <div class="range_input_box fftt_ipt">
                        <div class="range_input_content"></div>
                    </div> -->
            </div>
          </div>
        </div>
        <div class="menu_input_part">
          <div class="input_pair">
            <div class="input_title">Road1 Free Flow Travel Time</div>
            <div class="input_box">
              <div class="val_input_box">
                <input
                  type="number"
                  v-model="lineEditData.newFreeFlowTravelTime"
                  @mousemove="stopEventPropagation"
                />
              </div>
              <div
                class="range_input_box fftt_ipt"
                @mousedown="handleNewNodeFFTT($event, 0)"
                @mousemove="handleNewNodeFFTT($event, 0)"
              >
                <div
                  class="range_input_content"
                  :style="{ width: new_nodes_fftt_width.width_1 + 'px' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
        <div class="menu_input_part">
          <div class="input_pair">
            <div class="input_title">Road2 Free Flow Travel Time</div>
            <div class="input_box">
              <div class="val_input_box">
                <input
                  type="number"
                  v-model="lineEditData.newIFreeFlowTravelTime"
                  @mousemove="stopEventPropagation"
                />
              </div>
              <div
                class="range_input_box fftt_ipt"
                @mousedown="handleNewNodeFFTT($event, 1)"
                @mousemove="handleNewNodeFFTT($event, 1)"
              >
                <div
                  class="range_input_content"
                  :style="{ width: new_nodes_fftt_width.width_2 + 'px' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');
@import url('https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css');
.main_board {
  width: 100%;
  height: 100%;
  /* border-radius: 8px; */
  background-color: grey;
  /* box-shadow: 2px 5px 5px rgba(255,255,255,0.2); */

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-items: center;
  text-align: center;
}

.main_board .map_block {
  margin-left: auto;
  margin-right: auto;
  width: calc(100% - 18px);
  height: calc(100% - 18px);
  /* border-radius: 3px; */

  background-color: aliceblue;
  overflow: hidden;
}

.map_block #map {
  width: 100%;
  height: 100%;
  z-index: 0;
  user-select: none;
}

#map .leaflet-reactive {
  transition: all 0.3 ease;
}

.not_show_container {
  display: none;
}

/* menus */
#node_menu,
#link_menu {
  z-index: 2;
  position: absolute;
  width: 100px;
  height: 50px;
  border-radius: 5px;
  background-color: #9f9f9fee;
  box-shadow: 0 0 2px #aaa;
}
#link_menu.state1 {
  height: 100px;
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

/* menu position */
.menu_window {
  z-index: 3;
  position: absolute;
}
</style>
<style>
.path_tooltip {
  /* background-color: yellow; */
  /* color: black; */
  /* width: 300px; */
  text-align: left;
}
</style>
