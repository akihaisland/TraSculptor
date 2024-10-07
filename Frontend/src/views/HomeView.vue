<script setup lang="ts">
// import RoadNetwork from '../components/RoadNetwork.vue'
import StatusBar from '@/components/StatusBar.vue';
import ContentBoard from '@/components/ContentBoard.vue';
import { useNetworksData } from '@/stores/networkData';
import { onMounted } from 'vue';

const networkData = useNetworksData()

onMounted(() => {
  networkData.networksInitialization()
})
</script>

<template>
  <!-- <RoadNetwork /> -->
  <div class="broswer_window">
    <!-- <div class="left_child_window">
      <LeftWindow />
    </div>
    <div class="center_child_window">
      <CenterNetwork />
    </div>
    <div class="right_child_window">
      <RightWindow />
    </div> -->
    <div class="title_block">
      <StatusBar></StatusBar>
    </div>
    <div class="content_box">
      <ContentBoard></ContentBoard>
    </div>
  </div>
</template>
<style scoped>
.broswer_window {
  width: 100%;
  height: 100%;
  background-color: #3B3B3B;
  /* background-color: gainsboro; */

  /* display: flex;
  flex-direction: row;
  align-items: center; */
}

/* new info */
.title_block {
  width: 100%;
  height: 60px;
  margin-bottom: 4px;
  /* box-shadow: 0px 5px 5px rgba(255,255,255,0.2); */
}
.content_box {
  width: 100%;
  height: calc(100% - 60px - 4px);
}
</style>

<!-- former view -->
<style scoped>
.left_child_window,
.center_child_window,
.right_child_window {
  height: 100%;

  border-radius: 5px;
}

.left_child_window {
  width: 300px;
  margin-right: 5px;
  height: 100%;
}

.center_child_window {
  width: calc(100% - 610px);
  box-shadow: 0px 5px 5px rgba(0,0,0,0.2);
  background-color: #f6f6f6;
}

.right_child_window {
  width: 300px;
  margin-left: 5px;
  /* box-shadow: 0px 5px 5px rgba(0,0,0,0.2); */
  /* background-color: #F6F6F6; */
  height: 100%;
}
</style>