<script setup lang="ts">
import TreeBoard from './TreeBoard.vue'
import MapBoard from './MapBoard.vue'
import FilterBoard from './FilterBoard.vue'
</script>
<template>
  <div class="main_board">
    <div class="map_board">
      <MapBoard></MapBoard>
    </div>
    <div class="tree_board">
      <div class="matrix_board">
        <TreeBoard></TreeBoard>
      </div>
      <div class="filter_borad">
        <FilterBoard></FilterBoard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.main_board {
  width: 100%;
  height: 100%;

  display: flex;
  flex-direction: row;
  align-items: center;
}
.map_board {
  height: 100%;
  /* width: 60%; */
  width: calc(100% - 4px - 1010px);
  margin-right: 4px;
}
.tree_board {
  height: 100%;
  /* width: calc(40% - 4px); */
  width: 1010px;
}

.matrix_board {
  width: 100%;
  height: calc(100% - 4px - 175px);
  margin-bottom: 4px;
}

.filter_borad {
  width: 100%;
  height: 175px;
}
</style>
