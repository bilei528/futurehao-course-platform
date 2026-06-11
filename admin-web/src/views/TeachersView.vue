<template>
  <div>
    <section class="card">
      <h3>{{ editingId ? '编辑教师' : '添加教师' }}</h3>
      <p class="desc">教师信息将展示在学员端「师资团队」页面，学员可通过手机号或微信号联系老师。</p>
      <div class="form-grid">
        <input v-model="form.name" placeholder="教师姓名 *" />
        <input v-model="form.title" placeholder="职称/头衔（可选）" />
        <input v-model="form.phone" placeholder="联系电话（可选）" maxlength="20" />
        <input v-model="form.wechat" placeholder="微信号（可选）" maxlength="50" />
        <textarea v-model="form.bio" rows="3" placeholder="教师简介（可选）"></textarea>
        <div class="form-actions">
          <button class="btn-primary" :disabled="saving" @click="submitForm">
            {{ saving ? '保存中...' : editingId ? '保存修改' : '添加教师' }}
          </button>
          <button v-if="editingId" class="btn-outline" @click="cancelEdit">取消编辑</button>
        </div>
      </div>
    </section>

    <section class="card">
      <h3>教师列表</h3>
      <p v-if="loading" class="desc">加载中...</p>
      <p v-else-if="!teachers.length" class="desc">暂无教师，请在上方添加</p>
      <div v-else class="teacher-list">
        <div v-for="teacher in teachers" :key="teacher.id" class="teacher-item">
          <div class="teacher-main">
            <strong>{{ teacher.name }}</strong>
            <span v-if="teacher.title" class="teacher-title">{{ teacher.title }}</span>
            <p v-if="teacher.bio" class="teacher-bio">{{ teacher.bio }}</p>
            <p class="teacher-contact">
              <span v-if="teacher.phone">电话：{{ teacher.phone }}</span>
              <span v-if="teacher.wechat">微信：{{ teacher.wechat }}</span>
              <span v-if="!teacher.phone && !teacher.wechat">未填写联系方式</span>
            </p>
            <p v-if="teacher.status !== 1" class="status-off">已停用（学员端不可见）</p>
          </div>
          <div class="teacher-actions">
            <button class="btn-outline btn-sm" @click="startEdit(teacher)">编辑</button>
            <button class="btn-danger btn-sm" @click="removeTeacher(teacher)">删除</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import api from '../api';

interface TeacherItem {
  id: number;
  name: string;
  title?: string | null;
  bio?: string | null;
  phone?: string | null;
  wechat?: string | null;
  status: number;
}

const teachers = ref<TeacherItem[]>([]);
const loading = ref(true);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({
  name: '',
  title: '',
  bio: '',
  phone: '',
  wechat: '',
});

function formatError(e: unknown, fallback: string) {
  const err = e as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
    code?: string;
  };
  if (!err.response) {
    return '无法连接后端服务，请确认 backend 已启动（npm run start:dev）';
  }
  const msg = err.response.data?.message;
  return Array.isArray(msg) ? msg[0] : msg || err.message || fallback;
}

async function loadTeachers() {
  loading.value = true;
  try {
    const { data } = await api.get('/teachers/admin/all');
    teachers.value = data;
  } catch (e: unknown) {
    alert(formatError(e, '教师列表加载失败'));
  } finally {
    loading.value = false;
  }
}

onMounted(loadTeachers);

function resetForm() {
  form.name = '';
  form.title = '';
  form.bio = '';
  form.phone = '';
  form.wechat = '';
  editingId.value = null;
}

function startEdit(teacher: TeacherItem) {
  editingId.value = teacher.id;
  form.name = teacher.name;
  form.title = teacher.title || '';
  form.bio = teacher.bio || '';
  form.phone = teacher.phone || '';
  form.wechat = teacher.wechat || '';
}

function cancelEdit() {
  resetForm();
}

async function submitForm() {
  if (!form.name.trim()) {
    alert('请填写教师姓名');
    return;
  }

  saving.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      title: form.title.trim() || undefined,
      bio: form.bio.trim() || undefined,
      phone: form.phone.trim() || undefined,
      wechat: form.wechat.trim() || undefined,
    };

    if (editingId.value) {
      await api.put(`/teachers/admin/${editingId.value}`, payload);
    } else {
      await api.post('/teachers/admin', payload);
    }

    resetForm();
    await loadTeachers();
  } catch (e: unknown) {
    alert(formatError(e, '保存失败'));
  } finally {
    saving.value = false;
  }
}

async function removeTeacher(teacher: TeacherItem) {
  if (!confirm(`确认删除教师「${teacher.name}」？`)) return;

  try {
    await api.delete(`/teachers/admin/${teacher.id}`);
    if (editingId.value === teacher.id) {
      resetForm();
    }
    await loadTeachers();
  } catch (e: unknown) {
    alert(formatError(e, '删除失败'));
  }
}
</script>

<style scoped>
.form-grid {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.form-actions {
  display: flex;
  gap: 10px;
}

.desc {
  color: #6b7280;
  font-size: 13px;
  margin-top: 8px;
}

.teacher-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.teacher-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.teacher-main {
  flex: 1;
}

.teacher-title {
  margin-left: 8px;
  color: #6b7280;
  font-size: 13px;
}

.teacher-bio {
  margin-top: 8px;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.teacher-contact {
  margin-top: 8px;
  color: #374151;
  font-size: 13px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.teacher-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.status-off {
  margin-top: 8px;
  color: #dc2626;
  font-size: 12px;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}
</style>
