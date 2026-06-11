import { defineStore } from 'pinia';
import { ref } from 'vue';
import router from '../router';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '');
  const username = ref(localStorage.getItem('admin_username') || '');

  function setAuth(newToken: string, name: string) {
    token.value = newToken;
    username.value = name;
    localStorage.setItem('admin_token', newToken);
    localStorage.setItem('admin_username', name);
  }

  function logout() {
    token.value = '';
    username.value = '';
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    router.push('/login');
  }

  return { token, username, setAuth, logout };
});
