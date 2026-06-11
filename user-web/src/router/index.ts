import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import PackageView from '../views/PackageView.vue';
import MyCoursesView from '../views/MyCoursesView.vue';
import PlayerView from '../views/PlayerView.vue';
import TeachersView from '../views/TeachersView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/teachers', name: 'teachers', component: TeachersView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/package/:id', name: 'package', component: PackageView },
    { path: '/my-courses', name: 'my-courses', component: MyCoursesView, meta: { requiresAuth: true } },
    { path: '/play/:lessonId', name: 'play', component: PlayerView, meta: { requiresAuth: true } },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem('user_token');
  if (to.meta.requiresAuth && !token) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
});

export default router;
