import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/discover', name: 'Discover', component: () => import('../views/Discover.vue') },
  { path: '/portfolio', name: 'Portfolio', component: () => import('../views/Portfolio.vue') },
  { path: '/darkpool', name: 'DarkPool', component: () => import('../views/DarkPool.vue') },
  { path: '/docs', name: 'Docs', component: () => import('../views/Docs.vue') },
  { path: '/settings', name: 'Settings', component: () => import('../views/Settings.vue') },
  { path: '/secondary', name: 'SecondaryMarket', component: () => import('../views/SecondaryMarket.vue') },
  { path: '/governance', name: 'Governance', component: () => import('../views/Governance.vue') },
  { path: '/compliance', name: 'Compliance', component: () => import('../views/Compliance.vue') },
  { path: '/blog', name: 'BlogListing', component: () => import('../views/BlogListing.vue') },
  { path: '/blog/:slug', name: 'BlogDetail', component: () => import('../views/BlogDetail.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
