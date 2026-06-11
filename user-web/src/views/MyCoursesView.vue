<template>
  <div>
    <h1>我的课程</h1>
    <p class="subtitle">已购课程永久有效</p>

    <div v-if="!list.length" class="card empty">暂无已购课程，去课程中心看看吧</div>
    <div v-else class="list">
      <div v-for="item in list" :key="item.package.id" class="card item">
        <div>
          <p class="grade">{{ item.package.grade.name }}</p>
          <h3>{{ item.package.name }}</h3>
          <p class="meta">购买时间：{{ formatDate(item.purchasedAt) }} · {{ item.package.lessons.length }} 节课</p>
        </div>
        <router-link :to="`/package/${item.package.id}`" class="btn-primary">进入学习</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '../api';

interface PurchaseItem {
  purchasedAt: string;
  package: {
    id: number;
    name: string;
    grade: { name: string };
    lessons: { id: number }[];
  };
}

const list = ref<PurchaseItem[]>([]);

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

onMounted(async () => {
  const { data } = await api.get('/packages/my');
  list.value = data;
});
</script>

<style scoped>
.subtitle {
  color: #6b7280;
  margin: 8px 0 20px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grade {
  font-size: 13px;
  color: #6b7280;
}

.meta {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 6px;
}

.empty {
  text-align: center;
  color: #6b7280;
  padding: 40px;
}
</style>
