<template>
  <div class="login card">
    <h2>手机号登录</h2>
    <p class="hint">
      <template v-if="skipSms">
        本地测试模式：无需验证码，输入手机号即可登录
      </template>
      <template v-else>
        {{ isNewUser ? '新用户注册，请填写孩子姓名' : '已注册用户直接登录' }}
      </template>
    </p>

    <label>手机号</label>
    <input
      v-model="phone"
      placeholder="请输入手机号"
      maxlength="11"
      @blur="checkPhone"
    />

    <template v-if="isNewUser">
      <label>孩子姓名</label>
      <input v-model="childName" placeholder="请输入孩子真实姓名" maxlength="20" />
    </template>

    <template v-if="!skipSms">
      <label>验证码</label>
      <div class="code-row">
        <input v-model="code" placeholder="6位验证码" maxlength="6" />
        <button class="btn-outline" :disabled="countdown > 0" @click="sendCode">
          {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
        </button>
      </div>
    </template>

    <button class="btn-primary login-btn" :disabled="loading" @click="login">
      {{ loading ? '登录中...' : isNewUser ? '注册并登录' : '登录' }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const phone = ref('');
const childName = ref('');
const code = ref('');
const loading = ref(false);
const error = ref('');
const countdown = ref(0);
const isNewUser = ref(true);
const phoneChecked = ref(false);
const skipSms = ref(false);

onMounted(async () => {
  try {
    const { data } = await api.get('/config/public');
    skipSms.value = !!data.skipSmsVerify;
  } catch {
    skipSms.value = false;
  }
});

async function checkPhone() {
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    phoneChecked.value = false;
    return;
  }
  try {
    const { data } = await api.get('/auth/check-phone', { params: { phone: phone.value } });
    isNewUser.value = !data.registered;
    skipSms.value = !!data.skipSmsVerify;
    phoneChecked.value = true;
  } catch {
    isNewUser.value = true;
  }
}

async function sendCode() {
  error.value = '';
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    error.value = '请输入正确的手机号';
    return;
  }
  await checkPhone();
  try {
    const { data } = await api.post('/auth/send-code', { phone: phone.value });
    if (skipSms.value) {
      error.value = '';
      return;
    }
    countdown.value = 60;
    const timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) clearInterval(timer);
    }, 1000);
    void data;
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    error.value = err.response?.data?.message || '发送失败';
  }
}

async function login() {
  loading.value = true;
  error.value = '';
  try {
    if (!/^1[3-9]\d{9}$/.test(phone.value)) {
      error.value = '请输入正确的手机号';
      return;
    }
    if (!phoneChecked.value) {
      await checkPhone();
    }
    if (isNewUser.value && !childName.value.trim()) {
      error.value = '请填写孩子姓名';
      return;
    }
    const payload: { phone: string; code?: string; childName?: string } = {
      phone: phone.value,
    };
    if (!skipSms.value) {
      payload.code = code.value;
    }
    if (isNewUser.value) {
      payload.childName = childName.value.trim();
    }
    const { data } = await api.post('/auth/login', payload);
    auth.setAuth(data.token, data.user.phone, data.user.childName);
    const redirect = (route.query.redirect as string) || '/';
    router.push(redirect);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string | string[] } } };
    const msg = err.response?.data?.message;
    error.value = Array.isArray(msg) ? msg[0] : msg || '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login {
  max-width: 420px;
  margin: 40px auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

h2 {
  margin-bottom: 4px;
}

.hint {
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 8px;
}

label {
  font-size: 13px;
  color: #374151;
}

.code-row {
  display: flex;
  gap: 8px;
}

.login-btn {
  margin-top: 8px;
}

.error {
  color: #dc2626;
  font-size: 13px;
}
</style>
