<script setup lang="ts">
import HistorgramGraph from './HistorgramGraph.vue'
import SortSelBoard from './SortSelBoard.vue'

// const hist_graphs_id = [6, 7, 4, 5, 2, 3, 0, 1]
const hist_graphs_id = [6, 7, 0, 1, 2, 3, 4, 5]
</script>
<template>
  <div class="filter_main_board">
    <div class="historgrams_info_block">
      <div class="historgram_block" v-for="graph_ctn_id in hist_graphs_id" :key="graph_ctn_id">
        <HistorgramGraph :content_id="graph_ctn_id"></HistorgramGraph>
      </div>
    </div>
    <div class="sort_conds_block">
      <SortSelBoard></SortSelBoard>
    </div>
  </div>
</template>

<style scoped>
.filter_main_board {
  width: 100%;
  height: 100%;
  background-color: grey;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-items: center;
  text-align: center;
}

.main_board .historgrams_info_block {
  margin-left: auto;
  margin-right: auto;
  width: calc(100% - 14px);
  height: 112px;
  border-radius: 3px;
  padding: 7px;
  padding-top: 9px;
  padding-bottom: 5px;

  overflow: hidden;

  display: flex;
  flex-direction: row;
  align-items: center;
  justify-items: center;
  text-align: center;
}

.historgrams_info_block .historgram_block {
  width: 120px;
  height: 112px;
  /* width: 100%; */
  margin: auto;
  /* padding: 2px; */
  border-radius: 3px;
  /* border: 1px solid #dfdfdf; */
}

.sort_conds_block {
  width: calc(100% - 18px);
  height: 40px;
  display: block;
}
</style>
