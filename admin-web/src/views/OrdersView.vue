<template>
  <div>
    <section class="card stats">
      <h3>支付统计</h3>
      <p class="desc">仅统计已支付订单；管理员免费开通不计入收入</p>
      <div class="stat-grid">
        <div class="stat-item highlight">
          <span class="stat-label">累计收入</span>
          <strong class="stat-value">¥{{ stats.totalRevenue }}</strong>
        </div>
        <div class="stat-item">
          <span class="stat-label">支付笔数</span>
          <strong class="stat-value">{{ stats.paidOnlineCount }}</strong>
        </div>
        <div class="stat-item">
          <span class="stat-label">今日收入</span>
          <strong class="stat-value">¥{{ stats.todayRevenue }}</strong>
        </div>
        <div class="stat-item">
          <span class="stat-label">今日笔数</span>
          <strong class="stat-value">{{ stats.todayCount }}</strong>
        </div>
        <div class="stat-item">
          <span class="stat-label">微信收入</span>
          <strong class="stat-value">¥{{ stats.wechatRevenue }}</strong>
        </div>
        <div class="stat-item">
          <span class="stat-label">支付宝收入</span>
          <strong class="stat-value">¥{{ stats.alipayRevenue }}</strong>
        </div>
        <div class="stat-item">
          <span class="stat-label">管理员开通</span>
          <strong class="stat-value">{{ stats.adminGrantCount }} 次</strong>
        </div>
      </div>
    </section>

    <section class="card">
      <h3>购买记录</h3>
      <div class="filter-row">
        <input
          v-model="keyword"
          placeholder="搜索订单号、学员、手机号、课程"
          @keyup.enter="loadOrders"
        />
        <button class="btn-primary" @click="loadOrders">查询</button>
        <button v-if="keyword" class="btn-outline" @click="resetFilter">清除</button>
      </div>

      <p v-if="loading" class="desc">加载中...</p>
      <p v-else-if="!orders.length" class="desc">暂无购买记录</p>

      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>订单号</th>
              <th>学员</th>
              <th>课程</th>
              <th>金额</th>
              <th>支付方式</th>
              <th>支付时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id">
              <td class="mono">{{ order.orderNo }}</td>
              <td>
                <div>{{ order.user.childName || '未填写' }}</div>
                <small>{{ order.user.phone }}</small>
              </td>
              <td>{{ order.package.gradeName }} / {{ order.package.name }}</td>
              <td class="amount">{{ formatAmount(order.amount, order.payChannel) }}</td>
              <td>{{ order.payChannelLabel }}</td>
              <td>{{ order.paidAt ? formatDate(order.paidAt) : formatDate(order.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import api from '../api';

interface OrderItem {
  id: number;
  orderNo: string;
  amount: string;
  payChannel: string;
  payChannelLabel: string;
  paidAt: string | null;
  createdAt: string;
  user: { id: number; phone: string; childName: string | null };
  package: { id: number; name: string; gradeName: string };
}

const stats = reactive({
  totalRevenue: '0.00',
  paidOnlineCount: 0,
  wechatRevenue: '0.00',
  alipayRevenue: '0.00',
  todayRevenue: '0.00',
  todayCount: 0,
  adminGrantCount: 0,
});

const orders = ref<OrderItem[]>([]);
const loading = ref(true);
const keyword = ref('');

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

function formatAmount(amount: string, payChannel: string) {
  if (payChannel === 'admin') return '免费开通';
  return `¥${amount}`;
}

async function loadStats() {
  const { data } = await api.get('/admin/orders/stats');
  Object.assign(stats, data);
}

async function loadOrders() {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (keyword.value.trim()) params.keyword = keyword.value.trim();
    const { data } = await api.get('/admin/orders', { params });
    orders.value = data;
  } finally {
    loading.value = false;
  }
}

function resetFilter() {
  keyword.value = '';
  loadOrders();
}

onMounted(async () => {
  await Promise.all([loadStats(), loadOrders()]);
});
</script>

<style scoped>
.desc {
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 12px;
}

.stats h3,
.card h3 {
  margin-bottom: 8px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.stat-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
}

.stat-item.highlight {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 20px;
  color: #111827;
}

.filter-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  margin-bottom: 16px;
}

.btn-outline {
  background: #fff;
  border: 1px solid #d1d5db;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th,
td {
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: top;
}

th {
  color: #6b7280;
  font-weight: 600;
  font-size: 13px;
  background: #f9fafb;
}

.mono {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}

.amount {
  font-weight: 600;
  color: #111827;
}

small {
  color: #9ca3af;
  font-size: 12px;
}
</style>
