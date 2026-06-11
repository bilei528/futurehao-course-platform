<template>
  <div>
    <section class="card">
      <h3>手动注册学员</h3>
      <p class="desc">代替家长完成注册，学员之后可用手机号 + 验证码登录</p>
      <div class="form-row">
        <input v-model="registerForm.phone" placeholder="手机号" maxlength="11" />
        <input v-model="registerForm.childName" placeholder="孩子姓名" maxlength="20" />
        <button class="btn-primary" @click="registerStudent">注册学员</button>
      </div>
      <p v-if="registerMsg" :class="registerOk ? 'success' : 'error'">{{ registerMsg }}</p>
    </section>

    <section class="card">
      <h3>学员列表</h3>
      <div class="search-row">
        <input
          v-model="keyword"
          placeholder="搜索孩子姓名、手机号或课程名"
          @keyup.enter="searchStudents"
        />
        <button class="btn-primary" @click="searchStudents">搜索</button>
        <button v-if="keyword" class="btn-outline" @click="clearSearch">清除</button>
      </div>

      <p v-if="loading" class="desc">加载中...</p>
      <p v-else-if="!students.length" class="desc">
        {{ keyword ? '未找到匹配的学员' : '暂无学员' }}
      </p>

      <div v-for="student in students" :key="student.id" class="student-block">
        <div class="student-head">
          <div>
            <strong class="name">{{ student.childName || '未填写姓名' }}</strong>
            <span class="phone">{{ student.phone }}</span>
            <span class="meta">注册于 {{ formatDate(student.createdAt) }}</span>
          </div>
          <button class="btn-danger" @click="openDeleteModal(student)">删除学员</button>
        </div>

        <div class="purchases">
          <span class="label">已购课程：</span>
          <span v-if="!student.purchases.length" class="empty">暂无</span>
          <span v-for="p in student.purchases" :key="p.packageId" class="tag">
            {{ p.gradeName }} / {{ p.packageName }}
            <small>({{ p.source }})</small>
            <button
              v-if="p.source === '管理员开通'"
              class="tag-remove"
              title="取消权限"
              @click="revoke(student.id, p.packageId)"
            >×</button>
          </span>
        </div>

        <div class="grant-row">
          <select v-model="grantForms[student.id]">
            <option :value="0">选择要开通的课程包</option>
            <option
              v-for="pkg in availablePackages(student)"
              :key="pkg.id"
              :value="pkg.id"
            >
              {{ pkg.gradeName }} / {{ pkg.name }}
            </option>
          </select>
          <button
            class="btn-primary"
            :disabled="!grantForms[student.id]"
            @click="grant(student.id)"
          >
            开通课程
          </button>
        </div>
      </div>
    </section>

    <div v-if="showDeleteModal && studentToDelete" class="modal-mask" @click.self="closeDeleteModal">
      <div class="modal card">
        <h3>确认删除学员</h3>
        <p class="modal-warn">此操作不可恢复，将同时删除该学员的所有购买记录和订单。</p>
        <div class="modal-info">
          <p><span>孩子姓名</span>{{ studentToDelete.childName || '未填写' }}</p>
          <p><span>手机号</span>{{ studentToDelete.phone }}</p>
          <p><span>已购课程</span>{{ studentToDelete.purchases.length }} 个</p>
        </div>
        <div class="modal-actions">
          <button class="btn-outline" :disabled="deleting" @click="closeDeleteModal">取消</button>
          <button class="btn-danger" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import api from '../api';

interface Purchase {
  packageId: number;
  packageName: string;
  gradeName: string;
  source: string;
}

interface Student {
  id: number;
  phone: string;
  childName: string | null;
  createdAt: string;
  purchases: Purchase[];
}

interface PackageOption {
  id: number;
  name: string;
  gradeName: string;
}

const students = ref<Student[]>([]);
const allPackages = ref<PackageOption[]>([]);
const loading = ref(true);
const registerForm = reactive({ phone: '', childName: '' });
const registerMsg = ref('');
const registerOk = ref(false);
const grantForms = reactive<Record<number, number>>({});
const keyword = ref('');
const showDeleteModal = ref(false);
const studentToDelete = ref<Student | null>(null);
const deleting = ref(false);

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

function availablePackages(student: Student): PackageOption[] {
  const owned = new Set(student.purchases.map((p) => p.packageId));
  return allPackages.value.filter((pkg) => !owned.has(pkg.id));
}

async function loadData(searchKeyword = keyword.value) {
  loading.value = true;
  const [studentsRes, gradesRes] = await Promise.all([
    api.get('/admin/students', {
      params: searchKeyword.trim() ? { keyword: searchKeyword.trim() } : undefined,
    }),
    api.get('/grades/admin/all'),
  ]);
  students.value = studentsRes.data;
  allPackages.value = gradesRes.data.flatMap(
    (g: { id: number; name: string; packages: { id: number; name: string }[] }) =>
      g.packages.map((p) => ({ id: p.id, name: p.name, gradeName: g.name })),
  );
  for (const s of students.value) {
    if (!grantForms[s.id]) grantForms[s.id] = 0;
  }
  loading.value = false;
}

onMounted(() => loadData());

function searchStudents() {
  loadData(keyword.value);
}

function clearSearch() {
  keyword.value = '';
  loadData('');
}

async function registerStudent() {
  registerMsg.value = '';
  try {
    await api.post('/admin/students', {
      phone: registerForm.phone,
      childName: registerForm.childName,
    });
    registerForm.phone = '';
    registerForm.childName = '';
    registerMsg.value = '注册成功';
    registerOk.value = true;
    await loadData();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string | string[] } } };
    const msg = err.response?.data?.message;
    registerMsg.value = Array.isArray(msg) ? msg[0] : msg || '注册失败';
    registerOk.value = false;
  }
}

async function grant(userId: number) {
  const packageId = grantForms[userId];
  if (!packageId) return;
  try {
    await api.post(`/admin/students/${userId}/grant`, { packageId });
    grantForms[userId] = 0;
    await loadData();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    alert(err.response?.data?.message || '开通失败');
  }
}

async function revoke(userId: number, packageId: number) {
  if (!confirm('确认取消该课程权限？')) return;
  try {
    await api.delete(`/admin/students/${userId}/packages/${packageId}`);
    await loadData();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    alert(err.response?.data?.message || '操作失败');
  }
}

function openDeleteModal(student: Student) {
  studentToDelete.value = student;
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  if (deleting.value) return;
  showDeleteModal.value = false;
  studentToDelete.value = null;
}

async function confirmDelete() {
  if (!studentToDelete.value) return;
  deleting.value = true;
  try {
    await api.delete(`/admin/students/${studentToDelete.value.id}`);
    closeDeleteModal();
    await loadData();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    alert(err.response?.data?.message || '删除失败');
  } finally {
    deleting.value = false;
  }
}
</script>

<style scoped>
.desc {
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 12px;
}

.search-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  margin-bottom: 16px;
}

.btn-outline {
  background: #fff;
  border: 1px solid #d1d5db;
}

.form-row,
.grant-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 10px;
  align-items: center;
}

.grant-row {
  margin-top: 12px;
  grid-template-columns: 1fr auto;
}

.student-block {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px;
  margin-top: 12px;
}

.student-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.student-head .name {
  font-size: 16px;
  margin-right: 12px;
}

.phone {
  color: #374151;
  margin-right: 12px;
}

.meta {
  color: #9ca3af;
  font-size: 12px;
}

.purchases {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.label {
  font-size: 13px;
  color: #6b7280;
}

.empty {
  color: #9ca3af;
  font-size: 13px;
}

.tag {
  background: #eff6ff;
  color: #1d4ed8;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tag small {
  color: #6b7280;
}

.tag-remove {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 14px;
  padding: 0 2px;
}

.success {
  color: #16a34a;
  font-size: 13px;
  margin-top: 8px;
}

.error {
  color: #dc2626;
  font-size: 13px;
  margin-top: 8px;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  width: 400px;
  max-width: calc(100vw - 32px);
}

.modal h3 {
  margin-bottom: 12px;
}

.modal-warn {
  color: #b91c1c;
  font-size: 13px;
  background: #fef2f2;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.modal-info p {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
  font-size: 14px;
}

.modal-info span {
  color: #6b7280;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
</style>
