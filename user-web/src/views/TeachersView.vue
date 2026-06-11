<template>
  <div>
    <h1>师资团队</h1>
    <p class="subtitle">如有课程疑问，可通过以下方式联系老师</p>

    <div v-if="loading" class="loading card">加载中...</div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <p v-else-if="!teachers.length" class="empty card">暂无教师信息</p>
    <div v-else class="teacher-list">
      <div v-for="teacher in teachers" :key="teacher.id" class="card teacher-card">
        <div class="teacher-head">
          <h2>{{ teacher.name }}</h2>
          <span v-if="teacher.title" class="title">{{ teacher.title }}</span>
        </div>
        <p v-if="teacher.bio" class="bio">{{ teacher.bio }}</p>
        <div class="contact">
          <a v-if="teacher.phone" :href="`tel:${teacher.phone}`" class="contact-item phone">
            拨打电话：{{ teacher.phone }}
          </a>
          <button
            v-if="teacher.wechat"
            type="button"
            class="contact-item wechat"
            @click="copyWechat(teacher.wechat)"
          >
            复制微信号：{{ teacher.wechat }}
          </button>
          <p v-if="!teacher.phone && !teacher.wechat" class="no-contact">暂未提供联系方式</p>
        </div>
        <p v-if="copiedWechat === teacher.wechat" class="copied-tip">微信号已复制</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import api from '../api';

interface TeacherItem {
  id: number;
  name: string;
  title?: string | null;
  bio?: string | null;
  phone?: string | null;
  wechat?: string | null;
}

const teachers = ref<TeacherItem[]>([]);
const loading = ref(true);
const error = ref('');
const copiedWechat = ref('');

onMounted(async () => {
  try {
    const { data } = await api.get('/teachers');
    teachers.value = data;
  } catch {
    error.value = '教师信息加载失败，请稍后刷新重试';
  } finally {
    loading.value = false;
  }
});

async function copyWechat(wechat: string) {
  try {
    await navigator.clipboard.writeText(wechat);
    copiedWechat.value = wechat;
    setTimeout(() => {
      if (copiedWechat.value === wechat) {
        copiedWechat.value = '';
      }
    }, 2000);
  } catch {
    alert(`微信号：${wechat}`);
  }
}
</script>

<style scoped>
h1 {
  margin-bottom: 8px;
}

.subtitle {
  color: #6b7280;
  margin-bottom: 24px;
}

.teacher-list {
  display: grid;
  gap: 16px;
}

.teacher-card {
  padding: 20px;
}

.teacher-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.teacher-head h2 {
  font-size: 20px;
}

.title {
  color: #6b7280;
  font-size: 14px;
}

.bio {
  margin-top: 12px;
  color: #4b5563;
  line-height: 1.6;
  white-space: pre-wrap;
}

.contact {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.contact-item {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 14px;
  border: none;
  cursor: pointer;
  text-decoration: none;
}

.phone {
  background: #eff6ff;
  color: #1d4ed8;
}

.wechat {
  background: #f0fdf4;
  color: #166534;
}

.no-contact {
  color: #9ca3af;
  font-size: 13px;
}

.copied-tip {
  margin-top: 8px;
  color: #16a34a;
  font-size: 13px;
}

.loading,
.empty {
  text-align: center;
  color: #6b7280;
  padding: 40px;
}

.error {
  color: #dc2626;
  padding: 20px;
  text-align: center;
}
</style>
