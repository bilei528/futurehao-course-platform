<template>
  <div class="login-wrap">
    <form class="card login" @submit.prevent="login">
      <h1>管理后台</h1>
      <label>用户名</label>
      <input v-model="username" required />
      <label>密码</label>
      <input v-model="password" type="password" required />
      <button class="btn-primary" :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();

const username = ref('admin');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function login() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.post('/admin/login', {
      username: username.value,
      password: password.value,
    });
    auth.setAuth(data.token, data.admin.username);
    router.push('/courses');
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    error.value = err.response?.data?.message || '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login {
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

h1 {
  margin-bottom: 8px;
}

.error {
  color: #b91c1c;
  font-size: 13px;
}
</style>
