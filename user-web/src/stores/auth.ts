import { defineStore } from 'pinia';
import { ref } from 'vue';
import router from '../router';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('user_token') || '');
  const phone = ref(localStorage.getItem('user_phone') || '');
  const childName = ref(localStorage.getItem('user_child_name') || '');

  function setAuth(newToken: string, newPhone: string, newChildName?: string) {
    token.value = newToken;
    phone.value = newPhone;
    childName.value = newChildName || '';
    localStorage.setItem('user_token', newToken);
    localStorage.setItem('user_phone', newPhone);
    if (newChildName) {
      localStorage.setItem('user_child_name', newChildName);
    }
  }

  function logout() {
    token.value = '';
    phone.value = '';
    childName.value = '';
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_phone');
    localStorage.removeItem('user_child_name');
    router.push('/login');
  }

  return { token, phone, childName, setAuth, logout };
});
