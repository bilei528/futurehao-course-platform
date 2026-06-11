import { createRouter, createWebHistory } from 'vue-router';
import AdminLayout from '../layouts/AdminLayout.vue';
import LoginView from '../views/LoginView.vue';
import CoursesView from '../views/CoursesView.vue';
import StudentsView from '../views/StudentsView.vue';
import TeachersView from '../views/TeachersView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView },
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/courses' },
        { path: 'courses', name: 'courses', component: CoursesView },
        { path: 'teachers', name: 'teachers', component: TeachersView },
        { path: 'students', name: 'students', component: StudentsView },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem('admin_token');
  if (to.meta.requiresAuth && !token) {
    return { name: 'login' };
  }
  if (to.name === 'login' && token) {
    return { name: 'courses' };
  }
});

export default router;
