<template>
  <div v-if="visible" class="modal-mask" @click.self="onCancel">
    <div class="modal card">
      <h3>{{ title }}</h3>
      <p class="modal-warn">{{ warning }}</p>
      <div v-if="details?.length" class="modal-info">
        <p v-for="item in details" :key="item.label">
          <span>{{ item.label }}</span>{{ item.value }}
        </p>
      </div>
      <div class="modal-actions">
        <button class="btn-outline" :disabled="loading" @click="onCancel">取消</button>
        <button class="btn-danger" :disabled="loading" @click="onConfirm">
          {{ loading ? '处理中...' : confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  title: string;
  warning: string;
  confirmText?: string;
  loading?: boolean;
  details?: Array<{ label: string; value: string }>;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

function onConfirm() {
  emit('confirm');
}

function onCancel() {
  emit('cancel');
}
</script>

<style scoped>
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

.btn-outline {
  background: #fff;
  border: 1px solid #d1d5db;
}
</style>
