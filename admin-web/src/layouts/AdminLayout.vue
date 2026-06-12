<template>
  <div class="dashboard">
    <aside class="sidebar">
      <h2>未来号网课管理</h2>
      <p class="user">{{ auth.username }}</p>
      <nav class="nav">
        <router-link to="/courses">课程管理</router-link>
        <router-link to="/teachers">教师管理</router-link>
        <router-link to="/students">学员管理</router-link>
        <router-link to="/orders">购买记录</router-link>
      </nav>
      <button class="btn-danger logout" @click="auth.logout()">退出</button>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
</script>

<style scoped>
.dashboard {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
}

.sidebar {
  background: #111827;
  color: #fff;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.user {
  margin: 12px 0 20px;
  color: #9ca3af;
  font-size: 13px;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.nav a {
  color: #d1d5db;
  padding: 10px 12px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
}

.nav a.router-link-active {
  background: #1f2937;
  color: #fff;
  font-weight: 600;
}

.logout {
  width: 100%;
  margin-top: 20px;
}

.content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
