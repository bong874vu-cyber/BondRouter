import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/discover', name: 'Discover', component: () => import('../views/Discover.vue') },
  { path: '/portfolio', name: 'Portfolio', component: () => import('../views/Portfolio.vue') },
  { path: '/darkpool', name: 'DarkPool', component: () => import('../views/DarkPool.vue') },
  { path: '/docs', name: 'Docs', component: () => import('../views/Docs.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
