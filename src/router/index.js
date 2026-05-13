import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/discover', name: 'Discover', component: () => import('../views/Discover.vue') },
  { path: '/portfolio', name: 'Portfolio', component: () => import('../views/Portfolio.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
