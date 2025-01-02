<script setup lang="ts">
import L from 'leaflet'
import 'leaflet-draw'
import { useNetworksData } from '@/stores/networkData'
import { useNetworkSel } from '@/stores/networkSel'
// import { useLineEdit } from '@/stores/lineEdit';
import { onMounted, ref } from 'vue'
import { watch } from 'vue'

const props = defineProps({
  thumb_map_idx: {
    type: Number,
    default: 0
  }
})

const networkData = useNetworksData()
const networkSelData = useNetworkSel()
const show_link_global_idx = ref(-1)
let map: L.Map

const dots_in_map = new Array<L.CircleMarker>()
const links_in_map = new Array<L.Polyline>()
let node_linked = [0, 0]

function rmFormerLinesAndDots() {
  if (map == undefined) return
  for (let i = dots_in_map.length - 1; i >= 0; i--) {
    if (dots_in_map[i]) {
      map.removeLayer(dots_in_map[i])
    }
  }
  for (let i = links_in_map.length - 1; i >= 0; i--) {
    if (links_in_map[i]) {
      map.removeLayer(links_in_map[i])
    }
  }
  dots_in_map.length = 0
  links_in_map.length = 0
}

function drawLinesAndDots() {
  if (map == undefined) return

  for (let i = links_in_map.length - 1; i >= 0; i--) {
    links_in_map[i].addTo(map)
  }
  for (let i = dots_in_map.length - 1; i >= 0; i--) {
    dots_in_map[i].addTo(map)
  }
}

const map_zoom_ratio = ref(12)

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

function link_style(link_idx: number, link_weight_mp: number) {
  let line_weight = link_weight_mp * 6

  // opacity
  let linkOpacity = 0.2
  if (show_link_global_idx.value == link_idx) {
    linkOpacity = 0.8
  }

  let line_color = 'rgba(10,94,176,' + linkOpacity + ')'
  return {
    color: line_color,
    weight: line_weight
  }
}

function draw_links_and_nodes() {
  const circle_radius = 0.6

  // 转化为lealfet的折线与点
  for (let i = 0; i < networkData.nodesPos.length; i++) {
    const now_circle_radius_mp = 12
    const nodeColor = '#0380df'
    let node_rad = now_circle_radius_mp * circle_radius
    let node_weight = circle_radius / 2 + 2
    let nodeFillOpacity = 1
    if (i != node_linked[0] && i != node_linked[1]) {
      nodeFillOpacity = 0.5
      node_rad *= 0.6
      node_weight *= 0.6
    }

    dots_in_map.push(
      new L.CircleMarker([networkData.nodesPos[i][0], networkData.nodesPos[i][1]], {
        radius: node_rad,
        weight: node_weight,
        color: nodeColor,
        fillColor: '#B7B7B7',
        fillOpacity: nodeFillOpacity
      })
    )
  }

  const line_weight_mp = Math.pow(0.8, map_zoom_ratio.value - 12)
  for (let i = 0; i < networkData.linksPos.length; i++) {
    const now_line_weight = line_weight_mp * 6
    const former_link_pos = [
      networkData.nodesPos[networkData.linksPos[i][0]],
      networkData.nodesPos[networkData.linksPos[i][1]]
    ]
    const now_link_pos = link_excursion(former_link_pos, -(now_line_weight * 0.00018 + 0.00002))
    links_in_map.push(
      new L.Polyline(
        [
          [now_link_pos[0][0], now_link_pos[0][1]],
          [now_link_pos[1][0], now_link_pos[1][1]]
        ],
        link_style(i, circle_radius)
      )
    )
  }
  drawLinesAndDots()
}

function draw_all() {
  rmFormerLinesAndDots()
  show_link_global_idx.value = networkData.sel_links_global_idx[props.thumb_map_idx]
  if (props.thumb_map_idx >= networkData.sel_links_global_idx.length) {
    return
  }

  node_linked = networkData.linksPos[show_link_global_idx.value]
  const show_link_pos = [
    networkData.nodesPos[networkData.linksPos[show_link_global_idx.value][0]],
    networkData.nodesPos[networkData.linksPos[show_link_global_idx.value][1]]
  ]
  const center_pos = [
    (show_link_pos[0][0] + show_link_pos[1][0]) / 2,
    (show_link_pos[0][1] + show_link_pos[1][1]) / 2
  ]
  let zoom_ratio = 18
  let now_scope = 0.003 / 8
  const lat_scope = Math.abs(show_link_pos[0][0] - show_link_pos[1][0])
  const lng_scope = Math.abs(show_link_pos[0][1] - show_link_pos[1][1])
  const max_scope = Math.max(lat_scope, lng_scope)
  while (now_scope < max_scope) {
    now_scope *= 2
    zoom_ratio -= 1
  }

  map.setView([center_pos[0], center_pos[1]], zoom_ratio)
  draw_links_and_nodes()
}

watch(
  () => networkData.networksInfoArr,
  (newValue) => {
    draw_all()
  },
  { deep: true }
)

function map_show(map_idx: number) {
  if (map != undefined) {
    return false
  }
  map = L.map('map' + map_idx, {
    zoomControl: false,
    dragging: false,
    touchZoom: false,
    doubleClickZoom: false,
    scrollWheelZoom: false
  }).setView([43.5528027552607, -96.74700008207309], 16)
  var tiles = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

  var tileLayer = L.tileLayer(tiles, {
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
  }).addTo(map)
  tileLayer.bringToBack()

  var drawnItems = new L.FeatureGroup()
  map.addLayer(drawnItems)

  map.attributionControl.remove()
  // console.log(props.thumb_map_idx);

  map.on('zoomend', function () {
    map_zoom_ratio.value = map.getZoom()
  })
  return true
}

onMounted(() => {
  map_show(props.thumb_map_idx)
  if (!networkData.matrix_change) {
    draw_all()
  }
})
</script>
<template>
  <div class="map_box">
    <div :id="'map' + thumb_map_idx" style="width: 100%; height: 100%"></div>
  </div>
</template>

<style scoped>
@import url('https://unpkg.com/leaflet@1.7.1/dist/leaflet.css');
@import url('https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css');

.map_box {
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  height: 100%;
  border-radius: 3px;
  background-color: aliceblue;
  overflow: hidden;
  user-select: none;
}
</style>
