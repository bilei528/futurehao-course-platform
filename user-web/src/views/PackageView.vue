<template>
  <div v-if="pkg" class="package-detail">
    <div class="card header-card">
      <div>
        <p class="breadcrumb">{{ pkg.grade.name }} / {{ pkg.name }}</p>
        <h1>{{ pkg.name }}</h1>
        <p class="desc">{{ pkg.description?.trim() || '暂无简介' }}</p>
        <p class="price">¥{{ pkg.price }}</p>
      </div>
      <div class="actions">
        <span v-if="pkg.purchased" class="badge">已购买 · 永久有效</span>
        <template v-else>
          <button class="btn-primary" @click="openPay('wechat')">微信支付</button>
          <button class="btn-outline" @click="openPay('alipay')">支付宝支付</button>
        </template>
      </div>
    </div>

    <div class="card">
      <h2>课程目录（{{ pkg.lessons.length }} 节）</h2>
      <ul class="lessons">
        <li v-for="lesson in pkg.lessons" :key="lesson.id">
          <span>{{ lesson.title }}</span>
          <router-link v-if="pkg.purchased" :to="`/play/${lesson.id}`" class="play-link">观看</router-link>
          <span v-else class="locked">购买后解锁</span>
        </li>
      </ul>
    </div>

    <div v-if="showPay" class="pay-modal" @click.self="showPay = false">
      <div class="pay-card card">
        <h3 v-if="isMockPay">本地验证 · 模拟支付</h3>
        <h3 v-else>{{ payChannel === 'wechat' ? '微信' : '支付宝' }}扫码支付</h3>
        <template v-if="isMockPay">
          <p class="pay-hint">当前为本地开发模式，无需真实扫码</p>
          <button class="btn-primary mock-btn" :disabled="payStatus === 'paid'" @click="mockPay">
            {{ payStatus === 'paid' ? '已支付' : '点击模拟支付成功' }}
          </button>
        </template>
        <img v-else-if="qrDataUrl" :src="qrDataUrl" alt="支付二维码" class="qr" />
        <p class="order-no">订单号：{{ orderNo }}</p>
        <p v-if="!isMockPay" class="pay-hint">支付完成后将自动开通权限</p>
        <p v-if="payStatus === 'paid'" class="success">支付成功！</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import QRCode from 'qrcode';
import api from '../api';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

interface Lesson {
  id: number;
  title: string;
}

interface PackageDetail {
  id: number;
  name: string;
  description?: string;
  price: string;
  purchased: boolean;
  grade: { id: number; name: string };
  lessons: Lesson[];
}

const pkg = ref<PackageDetail | null>(null);
const showPay = ref(false);
const payChannel = ref<'wechat' | 'alipay'>('wechat');
const qrDataUrl = ref('');
const orderNo = ref('');
const payStatus = ref('pending');
const isMockPay = ref(false);
let pollTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  const { data } = await api.get(`/packages/${route.params.id}`);
  pkg.value = data;
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});

async function openPay(channel: 'wechat' | 'alipay') {
  if (!auth.token) {
    router.push({ name: 'login', query: { redirect: route.fullPath } });
    return;
  }

  payChannel.value = channel;
  const { data } = await api.post('/orders', {
    packageId: Number(route.params.id),
    payChannel: channel,
  });

  orderNo.value = data.orderNo;
  isMockPay.value = data.mock || String(data.qrCode).startsWith('MOCK:');
  if (!isMockPay.value) {
    qrDataUrl.value = await QRCode.toDataURL(data.qrCode, { width: 240 });
  }
  showPay.value = true;
  payStatus.value = 'pending';

  if (isMockPay.value) return;

  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    const { data: order } = await api.get(`/orders/${orderNo.value}`);
    if (order.status === 'paid') {
      payStatus.value = 'paid';
      if (pollTimer) clearInterval(pollTimer);
      const { data: refreshed } = await api.get(`/packages/${route.params.id}`);
      pkg.value = refreshed;
      setTimeout(() => {
        showPay.value = false;
      }, 1500);
    }
  }, 2000);
}

async function mockPay() {
  await api.post(`/orders/${orderNo.value}/mock-pay`);
  payStatus.value = 'paid';
  const { data: refreshed } = await api.get(`/packages/${route.params.id}`);
  pkg.value = refreshed;
  setTimeout(() => {
    showPay.value = false;
  }, 1500);
}
</script>

<style scoped>
.header-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}

.breadcrumb {
  color: #6b7280;
  font-size: 13px;
}

.desc {
  margin: 12px 0;
  color: #4b5563;
  line-height: 1.6;
  white-space: pre-wrap;
}

.price {
  font-size: 24px;
  color: #dc2626;
  font-weight: 700;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
}

.badge {
  background: #dcfce7;
  color: #166534;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
}

.lessons {
  list-style: none;
  margin-top: 12px;
}

.lessons li {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.play-link {
  color: #2563eb;
}

.locked {
  color: #9ca3af;
  font-size: 13px;
}

.pay-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.pay-card {
  text-align: center;
  width: 320px;
}

.qr {
  margin: 16px 0;
  width: 240px;
  height: 240px;
}

.order-no {
  font-size: 12px;
  color: #6b7280;
}

.pay-hint {
  font-size: 13px;
  color: #4b5563;
}

.success {
  color: #16a34a;
  font-weight: 600;
  margin-top: 8px;
}

.mock-btn {
  margin: 16px 0;
  width: 100%;
}
</style>
