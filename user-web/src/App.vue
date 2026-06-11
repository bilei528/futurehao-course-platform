<template>
  <div class="layout">
    <header class="header">
      <router-link to="/" class="logo">未来号网课学习平台</router-link>
      <nav>
        <router-link to="/">课程中心</router-link>
        <router-link to="/teachers">师资团队</router-link>
        <router-link to="/my-courses">我的课程</router-link>
        <router-link v-if="!auth.token" to="/login">登录</router-link>
        <span v-else class="user-info">
          <span v-if="auth.childName" class="child-name">{{ auth.childName }}</span>
          <button class="btn-outline" @click="auth.logout()">退出</button>
        </span>
      </nav>
    </header>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
</script>

<style scoped>
.layout {
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.logo {
  font-weight: 700;
  font-size: 18px;
}

nav {
  display: flex;
  gap: 16px;
  align-items: center;
}

nav a.router-link-active {
  color: #2563eb;
  font-weight: 600;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.child-name {
  font-size: 13px;
  color: #6b7280;
}

.main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}
</style>
