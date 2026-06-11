<template>
  <div>
    <h1>课程中心</h1>
    <p class="subtitle">按年级浏览课程包，购买后永久观看</p>

    <div v-if="loading" class="loading">加载中...</div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <div v-else class="grades">
      <section v-for="grade in grades" :key="grade.id" class="grade card">
        <h2>{{ grade.name }}</h2>
        <div class="packages">
          <router-link
            v-for="pkg in grade.packages"
            :key="pkg.id"
            :to="`/package/${pkg.id}`"
            class="package-item"
          >
            <div class="info">
              <h3>{{ pkg.name }}</h3>
              <p v-if="pkg.description" class="desc">{{ pkg.description }}</p>
              <p class="price">¥{{ pkg.price }}</p>
            </div>
          </router-link>
        </div>
        <p v-if="!grade.packages.length" class="empty">暂无课程包</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '../api';

interface PackageItem {
  id: number;
  name: string;
  description?: string;
  price: string;
}

interface GradeItem {
  id: number;
  name: string;
  packages: PackageItem[];
}

const grades = ref<GradeItem[]>([]);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    const { data } = await api.get('/grades');
    grades.value = data;
  } catch {
    error.value = '课程加载失败，请确认后端服务已启动后刷新页面';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
h1 {
  margin-bottom: 8px;
}

.subtitle {
  color: #6b7280;
  margin-bottom: 24px;
}

.grades {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.grade h2 {
  margin-bottom: 16px;
}

.packages {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.package-item {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  transition: transform 0.15s;
}

.package-item:hover {
  transform: translateY(-2px);
}

.info {
  padding: 12px;
}

.info h3 {
  font-size: 15px;
  margin-bottom: 6px;
}

.desc {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.price {
  color: #dc2626;
  font-weight: 700;
}

.empty {
  color: #9ca3af;
}

.loading {
  padding: 40px;
  text-align: center;
}

.error {
  color: #dc2626;
  padding: 20px;
  text-align: center;
}
</style>
