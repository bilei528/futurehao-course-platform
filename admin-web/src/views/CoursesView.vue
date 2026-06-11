<template>
  <div>
    <section class="card">
      <h3>年级管理</h3>
      <div class="row">
        <input v-model="newGradeName" placeholder="新年级名称，如：四年级" />
        <button class="btn-primary" @click="createGrade">添加年级</button>
      </div>
      <ul class="list">
        <li v-for="grade in grades" :key="grade.id">
          <span>{{ grade.name }}</span>
          <button class="btn-danger" @click="removeGrade(grade.id)">删除</button>
        </li>
      </ul>
    </section>

    <section class="card">
      <h3>课程包管理（售卖单元）</h3>
      <p v-if="uploadSuccess" class="upload-success">{{ uploadSuccess }}</p>
      <div class="form-grid">
        <select v-model="pkgForm.gradeId">
          <option disabled :value="0">选择年级</option>
          <option v-for="g in grades" :key="g.id" :value="g.id">{{ g.name }}</option>
        </select>
        <input v-model="pkgForm.name" placeholder="课程包名称" />
        <input v-model.number="pkgForm.price" type="number" step="0.01" placeholder="价格（元）" />
        <textarea v-model="pkgForm.description" rows="2" placeholder="简介"></textarea>
        <button class="btn-primary" @click="createPackage">创建课程包</button>
      </div>

      <div v-for="grade in grades" :key="grade.id" class="grade-block">
        <h4>{{ grade.name }}</h4>
        <div v-for="pkg in grade.packages" :key="pkg.id" class="package-block">
          <div class="pkg-head">
            <div class="pkg-info">
              <strong>{{ pkg.name }}</strong>
              <p class="pkg-desc">{{ pkg.description?.trim() || '暂无简介' }}</p>
              <div class="price-edit-row">
                <label>价格（元）</label>
                <input
                  v-model.number="priceForms[pkg.id]"
                  type="number"
                  min="0.01"
                  step="0.01"
                  class="price-input"
                />
                <button
                  class="btn-outline btn-sm"
                  :disabled="savingPrice[pkg.id]"
                  @click="savePrice(pkg)"
                >
                  {{ savingPrice[pkg.id] ? '保存中...' : '保存价格' }}
                </button>
                <span v-if="priceSaved[pkg.id]" class="price-saved">已更新</span>
              </div>
            </div>
            <button class="btn-danger" @click="openDeletePackageModal(pkg, grade.name)">删除包</button>
          </div>

          <div class="upload-row">
            <input v-model="lessonForms[pkg.id].title" placeholder="视频标题" />
            <input
              :ref="(el) => setFileInput(pkg.id, el as HTMLInputElement | null)"
              type="file"
              accept="video/*"
              @change="onFileChange(pkg, $event)"
            />
            <button
              class="btn-primary"
              :disabled="uploading[pkg.id]"
              @click="uploadLesson(pkg)"
            >
              {{ uploading[pkg.id] ? uploadProgress[pkg.id] + '%' : '上传视频' }}
            </button>
          </div>

          <div class="lessons-section">
            <div class="lessons-header">
              <span>已上传视频（{{ pkg.lessons?.length || 0 }}）</span>
            </div>
            <p v-if="!pkg.lessons?.length" class="lessons-empty">暂无视频，请在上方上传</p>
            <table v-else class="lesson-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>标题</th>
                  <th>上传时间</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(lesson, index) in pkg.lessons" :key="lesson.id">
                  <td>{{ index + 1 }}</td>
                  <td class="lesson-title">{{ lesson.title }}</td>
                  <td>{{ formatDate(lesson.createdAt) }}</td>
                  <td>
                    <span :class="lesson.status === 1 ? 'status-on' : 'status-off'">
                      {{ lesson.status === 1 ? '已上架' : '已下架' }}
                    </span>
                  </td>
                  <td>
                    <button class="btn-danger btn-sm" @click="openDeleteLessonModal(lesson, pkg.name)">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <ConfirmModal
      :visible="!!deleteModal"
      :title="deleteModal?.title ?? ''"
      :warning="deleteModal?.warning ?? ''"
      :details="deleteModal?.details ?? []"
      :loading="deleting"
      confirm-text="确认删除"
      @confirm="confirmDelete"
      @cancel="closeDeleteModal"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import api from '../api';
import ConfirmModal from '../components/ConfirmModal.vue';

interface DeleteModalState {
  type: 'package' | 'lesson';
  id: number;
  title: string;
  warning: string;
  details: Array<{ label: string; value: string }>;
}

interface Lesson {
  id: number;
  title: string;
  duration: number;
  status: number;
  createdAt: string;
}

interface PackageItem {
  id: number;
  name: string;
  description?: string | null;
  price: string;
  gradeId: number;
  lessons: Lesson[];
}

interface GradeItem {
  id: number;
  name: string;
  packages: PackageItem[];
}

const grades = ref<GradeItem[]>([]);
const newGradeName = ref('');
const pkgForm = reactive({
  gradeId: 0,
  name: '',
  price: 0,
  description: '',
});

const lessonForms = reactive<Record<number, { title: string; file: File | null }>>({});
const selectedFiles = reactive<Record<number, File | null>>({});
const uploading = reactive<Record<number, boolean>>({});
const uploadProgress = reactive<Record<number, number>>({});
const fileInputs = reactive<Record<number, HTMLInputElement | null>>({});
const uploadSuccess = ref('');
const deleteModal = ref<DeleteModalState | null>(null);
const deleting = ref(false);
const priceForms = reactive<Record<number, number>>({});
const savingPrice = reactive<Record<number, boolean>>({});
const priceSaved = reactive<Record<number, boolean>>({});

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

async function loadGrades() {
  const { data } = await api.get('/grades/admin/all');
  grades.value = data.map((g: GradeItem) => ({
    ...g,
    packages: g.packages.map((p) => ({
      ...p,
      price: String(p.price),
      lessons: p.lessons ?? [],
    })),
  }));
  for (const grade of grades.value) {
    for (const pkg of grade.packages) {
      if (!lessonForms[pkg.id]) {
        lessonForms[pkg.id] = { title: '', file: null };
      }
      priceForms[pkg.id] = Number(pkg.price);
    }
  }
}

async function savePrice(pkg: PackageItem) {
  const price = priceForms[pkg.id];
  if (!price || price <= 0) {
    alert('请输入大于 0 的价格');
    return;
  }
  if (Number(pkg.price) === price) {
    alert('价格未变化');
    return;
  }

  savingPrice[pkg.id] = true;
  priceSaved[pkg.id] = false;
  try {
    await api.put(`/packages/admin/${pkg.id}`, { price });
    pkg.price = String(price);
    priceSaved[pkg.id] = true;
    setTimeout(() => {
      priceSaved[pkg.id] = false;
    }, 2000);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string | string[] } } };
    const msg = err.response?.data?.message;
    alert(Array.isArray(msg) ? msg[0] : msg || '价格保存失败');
  } finally {
    savingPrice[pkg.id] = false;
  }
}

onMounted(loadGrades);

async function createGrade() {
  if (!newGradeName.value.trim()) return;
  await api.post('/grades/admin', { name: newGradeName.value.trim() });
  newGradeName.value = '';
  await loadGrades();
}

async function removeGrade(id: number) {
  if (!confirm('删除年级将同时删除其下课程包，确认？')) return;
  await api.delete(`/grades/admin/${id}`);
  await loadGrades();
}

async function createPackage() {
  if (!pkgForm.gradeId || !pkgForm.name || !pkgForm.price) return;
  await api.post('/packages/admin', {
    gradeId: pkgForm.gradeId,
    name: pkgForm.name,
    price: pkgForm.price,
    description: pkgForm.description.trim() || undefined,
  });
  pkgForm.name = '';
  pkgForm.price = 0;
  pkgForm.description = '';
  await loadGrades();
}

function openDeletePackageModal(pkg: PackageItem, gradeName: string) {
  deleteModal.value = {
    type: 'package',
    id: pkg.id,
    title: '确认删除课程包',
    warning: '此操作不可恢复，将同时删除该课程包下的所有视频、订单和学员购买记录。',
    details: [
      { label: '年级', value: gradeName },
      { label: '课程包', value: pkg.name },
      { label: '视频数量', value: `${pkg.lessons?.length || 0} 个` },
      { label: '价格', value: `¥${pkg.price}` },
    ],
  };
}

function openDeleteLessonModal(lesson: Lesson, packageName: string) {
  deleteModal.value = {
    type: 'lesson',
    id: lesson.id,
    title: '确认删除视频',
    warning: '此操作不可恢复，删除后学员将无法观看该视频。',
    details: [
      { label: '所属课程包', value: packageName },
      { label: '视频标题', value: lesson.title },
      { label: '上传时间', value: formatDate(lesson.createdAt) },
    ],
  };
}

function closeDeleteModal() {
  if (deleting.value) return;
  deleteModal.value = null;
}

async function confirmDelete() {
  if (!deleteModal.value) return;
  deleting.value = true;
  try {
    if (deleteModal.value.type === 'package') {
      await api.delete(`/packages/admin/${deleteModal.value.id}`);
    } else {
      await api.delete(`/lessons/admin/${deleteModal.value.id}`);
    }
    deleteModal.value = null;
    await loadGrades();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string | string[] } } };
    const msg = err.response?.data?.message;
    alert(Array.isArray(msg) ? msg[0] : msg || '删除失败');
  } finally {
    deleting.value = false;
  }
}

function setFileInput(packageId: number, el: HTMLInputElement | null) {
  fileInputs[packageId] = el;
}

function onFileChange(pkg: PackageItem, event: Event) {
  const input = event.target as HTMLInputElement;
  selectedFiles[pkg.id] = input.files?.[0] || null;
}

async function uploadLesson(pkg: PackageItem) {
  const file = selectedFiles[pkg.id];
  const title = lessonForms[pkg.id]?.title?.trim();
  if (!file || !title) {
    alert('请填写标题并选择视频文件');
    return;
  }

  uploading[pkg.id] = true;
  uploadProgress[pkg.id] = 0;

  try {
    const { data } = await api.post('/oss/upload-credential', {
      gradeId: pkg.gradeId,
      packageId: pkg.id,
      filename: file.name,
    });

    const { key, uploadUrl, mode } = data.data;

    if (mode === 'local') {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('key', key);
      await api.post('/local-storage/upload-file', formData, {
        onUploadProgress: (event) => {
          if (event.total) {
            uploadProgress[pkg.id] = Math.round((event.loaded * 100) / event.total);
          }
        },
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            uploadProgress[pkg.id] = Math.round((e.loaded / e.total) * 100);
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`OSS 上传失败 (${xhr.status})`));
        xhr.onerror = () => reject(new Error('OSS 上传失败'));
        xhr.send(file);
      });
    }

    await api.post('/lessons/admin', {
      packageId: pkg.id,
      title,
      ossKey: key,
    });

    lessonForms[pkg.id].title = '';
    selectedFiles[pkg.id] = null;
    if (fileInputs[pkg.id]) {
      fileInputs[pkg.id]!.value = '';
    }
    await loadGrades();
    uploadSuccess.value = `「${title}」上传成功，已加入课程列表`;
    setTimeout(() => {
      uploadSuccess.value = '';
    }, 3000);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
    const msg = err.response?.data?.message;
    alert(Array.isArray(msg) ? msg[0] : msg || err.message || '上传失败');
  } finally {
    uploading[pkg.id] = false;
    uploadProgress[pkg.id] = 0;
  }
}

</script>

<style scoped>
.row,
.upload-row,
.form-grid {
  display: grid;
  gap: 10px;
  margin: 12px 0;
}

.form-grid {
  grid-template-columns: repeat(2, 1fr);
}

.list {
  list-style: none;
}

.list li {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.grade-block {
  margin-top: 20px;
}

.package-block {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  margin-top: 10px;
}

.pkg-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.pkg-info {
  flex: 1;
}

.pkg-desc {
  margin-top: 8px;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.price-edit-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.price-edit-row label {
  font-size: 13px;
  color: #6b7280;
}

.price-input {
  width: 120px;
}

.price-saved {
  color: #16a34a;
  font-size: 12px;
}

.lessons-section {
  margin-top: 14px;
  border-top: 1px dashed #e5e7eb;
  padding-top: 12px;
}

.lessons-header {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.lessons-empty {
  color: #9ca3af;
  font-size: 13px;
  padding: 8px 0;
}

.lesson-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.lesson-table th,
.lesson-table td {
  border-bottom: 1px solid #f3f4f6;
  padding: 8px 6px;
  text-align: left;
}

.lesson-table th {
  color: #6b7280;
  font-weight: 500;
}

.lesson-title {
  font-weight: 500;
  color: #111827;
}

.status-on {
  color: #16a34a;
}

.status-off {
  color: #9ca3af;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.upload-success {
  color: #16a34a;
  font-size: 13px;
  background: #f0fdf4;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}
</style>
