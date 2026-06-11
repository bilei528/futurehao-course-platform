<template>
  <div class="player card">
    <router-link to="#" @click.prevent="router.back()" class="back">← 返回</router-link>
    <h1>{{ title }}</h1>
    <div v-if="playUrl" class="video-wrap" @contextmenu.prevent>
      <video
        :src="playUrl"
        controls
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
        playsinline
        autoplay
        class="video"
        @contextmenu.prevent
      />
    </div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <p v-else class="loading">加载中...</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';

const route = useRoute();
const router = useRouter();

const title = ref('');
const playUrl = ref('');
const error = ref('');

onMounted(async () => {
  try {
    const { data } = await api.get(`/lessons/${route.params.lessonId}/play`);
    title.value = data.title;
    playUrl.value = data.playUrl;
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    error.value = err.response?.data?.message || '无法播放';
  }
});
</script>

<style scoped>
.back {
  color: #2563eb;
  font-size: 14px;
  display: inline-block;
  margin-bottom: 12px;
}

.video-wrap {
  margin-top: 16px;
  user-select: none;
  -webkit-user-select: none;
}

.video {
  width: 100%;
  max-height: 70vh;
  border-radius: 8px;
  background: #000;
  pointer-events: auto;
}

.error {
  color: #dc2626;
  margin-top: 20px;
}

.loading {
  margin-top: 20px;
  color: #6b7280;
}
</style>
