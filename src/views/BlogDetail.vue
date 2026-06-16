<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { blogPosts } from '../data/blogPosts'
import { 
  ArrowLeft, Calendar, User, Clock, Share2, Check, 
  BookOpen, ChevronRight, Bookmark, ArrowRight, ShieldCheck 
} from 'lucide-vue-next'
import { useUIStore } from '../stores/ui'

const route = useRoute()
const router = useRouter()
const ui = useUIStore()

const copied = ref(false)
const activeSection = ref('')
const observer = ref(null)

// Find the current blog post by slug
const post = computed(() => {
  return blogPosts.find(p => p.slug === route.params.slug)
})

// If post is not found, redirect to Blog listing
watch(post, (newVal) => {
  if (!newVal) {
    router.push('/blog')
  }
}, { immediate: true })

// Get related posts (the other 2 posts)
const relatedPosts = computed(() => {
  if (!post.value) return []
  return blogPosts.filter(p => p.slug !== post.value.slug).slice(0, 2)
})

// Function to copy link to clipboard
const copyLink = () => {
  navigator.clipboard.writeText(window.location.href)
  copied.value = true
  ui.addToast('BLOG URL COPIED TO CLIPBOARD', 'success')
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

// Manage dynamic SEO Tags & Schema Markup Injection
let schemaScriptEl = null

const updateSEO = () => {
  if (!post.value) return

  // Update Title
  document.title = post.value.seoTitle

  // Update Meta Description
  const metaDesc = document.querySelector('meta[name="description"]')
  if (metaDesc) {
    metaDesc.setAttribute('content', post.value.seoDescription)
  } else {
    const newMeta = document.createElement('meta')
    newMeta.setAttribute('name', 'description')
    newMeta.setAttribute('content', post.value.seoDescription)
    document.head.appendChild(newMeta)
  }

  // Update Open Graph Tags
  const ogTitle = document.querySelector('meta[property="og:title"]')
  if (ogTitle) ogTitle.setAttribute('content', post.value.seoTitle)
  const ogDesc = document.querySelector('meta[property="og:description"]')
  if (ogDesc) ogDesc.setAttribute('content', post.value.seoDescription)
  const ogImage = document.querySelector('meta[property="og:image"]')
  if (ogImage) ogImage.setAttribute('content', post.value.featuredImage)

  // Inject JSON-LD Schema Markup
  if (schemaScriptEl) {
    schemaScriptEl.remove()
  }
  schemaScriptEl = document.createElement('script')
  schemaScriptEl.type = 'application/ld+json'
  schemaScriptEl.innerHTML = JSON.stringify(post.value.schemaMarkup)
  document.head.appendChild(schemaScriptEl)
}

// Scroll Spy to highlight current active section in Table of Contents
const setupScrollSpy = () => {
  if (observer.value) {
    observer.value.disconnect()
  }

  // Define intersection callback
  const callback = (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        activeSection.value = entry.target.id
      }
    })
  }

  observer.value = new IntersectionObserver(callback, {
    rootMargin: '-80px 0px -60% 0px',
    threshold: 0
  })

  // Observe all sections listed in TOC
  if (post.value && post.value.toc) {
    post.value.toc.forEach(item => {
      const el = document.getElementById(item.id)
      if (el) observer.value.observe(el)
    })
  }
}

// Watch route changes to reset scroll position and update SEO
watch(() => route.params.slug, () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
  setTimeout(() => {
    updateSEO()
    setupScrollSpy()
  }, 100)
})

onMounted(() => {
  window.scrollTo({ top: 0 })
  updateSEO()
  setTimeout(() => {
    setupScrollSpy()
  }, 300)
})

onUnmounted(() => {
  if (schemaScriptEl) {
    schemaScriptEl.remove()
  }
  if (observer.value) {
    observer.value.disconnect()
  }
})
</script>

<template>
  <div v-if="post" class="page-container fade-in">
    
    <!-- BREADCRUMBS -->
    <nav class="breadcrumb-nav mb-6 flex items-center gap-2 micro-cap" aria-label="Breadcrumb">
      <RouterLink to="/" class="breadcrumb-link">Home</RouterLink>
      <ChevronRight :size="10" class="text-mute" />
      <RouterLink to="/blog" class="breadcrumb-link">Blog</RouterLink>
      <ChevronRight :size="10" class="text-mute" />
      <span class="breadcrumb-current text-mute">{{ post.title }}</span>
    </nav>

    <!-- BACK TO BLOGS BUTTON -->
    <RouterLink to="/blog" class="back-link mb-8 inline-flex items-center gap-2">
      <ArrowLeft :size="14" /> Back to Insights
    </RouterLink>

    <!-- ARTICLE LAYOUT CONTAINER -->
    <div class="blog-detail-layout">
      
      <!-- MAIN ARTICLE COLUMN -->
      <article class="article-main">
        <!-- Article Header -->
        <header class="article-header pb-6 border-b" style="border-color: var(--border-light);">
          <div class="category-tag mb-4">{{ post.category }}</div>
          <h1 class="display-lg article-title">{{ post.title }}</h1>
          
          <div class="flex flex-wrap items-center justify-between gap-4 mt-6 text-mute micro-cap">
            <div class="flex flex-wrap items-center gap-4">
              <span class="flex items-center gap-1.5"><Calendar :size="12" /> {{ post.date }}</span>
              <span class="flex items-center gap-1.5"><User :size="12" /> By {{ post.author }}</span>
              <span class="flex items-center gap-1.5"><Clock :size="12" /> {{ post.readTime }}</span>
            </div>
            
            <button @click="copyLink" class="share-btn flex items-center gap-2">
              <Share2 :size="12" v-if="!copied" />
              <Check :size="12" v-else color="var(--accent-success)" />
              {{ copied ? 'LINK COPIED' : 'SHARE ARTICLE' }}
            </button>
          </div>
        </header>

        <!-- Featured Banner Image -->
        <div class="article-featured-image-wrapper my-8 glass-panel" style="padding: 1rem;">
          <img :src="post.featuredImage" :alt="post.title" class="article-featured-image" />
        </div>

        <!-- Rendered Post Content (injects structured, semantic HTML) -->
        <div class="article-content" v-html="post.content"></div>

        <!-- SHARE & TAGS FOOTEER -->
        <footer class="article-footer border-t mt-12 pt-8 flex flex-col sm:flex-row justify-between gap-6" style="border-color: var(--border-light);">
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in post.tags" :key="tag" class="tag-pill">#{{ tag }}</span>
          </div>
          
          <button @click="copyLink" class="btn-glass flex items-center gap-2" style="padding: 0.5rem 1.25rem;">
            <Share2 :size="14" v-if="!copied" />
            <Check :size="14" v-else color="var(--accent-success)" />
            {{ copied ? 'URL Copied!' : 'Copy Post Link' }}
          </button>
        </footer>
      </article>

      <!-- SIDEBAR: TABLE OF CONTENTS & RELATED POSTS -->
      <aside class="article-sidebar">
        <!-- Table of Contents -->
        <div class="sidebar-widget toc-widget sticky-widget">
          <h4 class="sidebar-title micro-cap mb-4">Table of Contents</h4>
          <nav class="toc-list">
            <a 
              v-for="item in post.toc" 
              :key="item.id" 
              :href="'#' + item.id"
              class="toc-item"
              :class="{ 'active': activeSection === item.id }"
            >
              {{ item.text }}
            </a>
          </nav>

          <!-- Small CTA widget inside sidebar -->
          <div class="sidebar-cta-widget glass-panel mt-8" style="background: rgba(191,168,133,0.01);">
            <div class="flex items-center gap-2 mb-2 micro-cap" style="color: var(--accent-gold);">
              <ShieldCheck :size="14" /> SECURE APP LINK
            </div>
            <h5 style="font-family: var(--font-serif); font-size: 1.1rem; font-weight: 500; margin-bottom: 0.5rem;">USDC Gas Station</h5>
            <p style="font-size: 0.75rem; line-height: 1.4; color: var(--text-muted); margin-bottom: 1rem;">
              Activate sponsored transactions and trade RWAs on Arc L1 with $0 gas overhead.
            </p>
            <RouterLink to="/settings" class="btn-primary" style="width: 100%; font-size: 0.7rem; padding: 0.5rem 1rem;">Go to Settings</RouterLink>
          </div>
        </div>
      </aside>

    </div>

    <!-- RELATED POSTS FOOTER SECTION -->
    <section class="related-posts-section border-t mt-20 pt-12" style="border-color: var(--border-light);">
      <h3 class="display-lg mb-8" style="font-size: 2rem;">Related Insights</h3>
      <div class="related-posts-grid">
        <RouterLink 
          v-for="rel in relatedPosts" 
          :key="rel.slug"
          :to="'/blog/' + rel.slug"
          class="related-card glass-panel"
        >
          <div class="related-img-wrapper">
            <img :src="rel.featuredImage" :alt="rel.title" class="related-img" />
          </div>
          <div class="related-body">
            <div class="flex gap-2 items-center text-mute micro-cap mb-2" style="font-size: 0.6rem;">
              <span>{{ rel.date }}</span>
              <span>•</span>
              <span>{{ rel.category }}</span>
            </div>
            <h4 class="related-title">{{ rel.title }}</h4>
            <p class="related-desc text-mute">{{ rel.summary }}</p>
          </div>
        </RouterLink>
      </div>
    </section>

  </div>
</template>

<style scoped>
/* Breadcrumbs */
.breadcrumb-nav {
  color: var(--text-muted);
}
.breadcrumb-link {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}
.breadcrumb-link:hover {
  color: var(--text-main);
}
.breadcrumb-current {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
  display: inline-block;
  vertical-align: middle;
}

.back-link {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  transition: color 0.2s ease;
}
.back-link:hover {
  color: var(--accent-gold);
}

/* Layout */
.blog-detail-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3.5rem;
}

@media (min-width: 992px) {
  .blog-detail-layout {
    grid-template-columns: 1.4fr 0.6fr;
  }
}

/* Main Content Column */
.article-main {
  min-width: 0; /* Prevents overflow issues */
}

.article-title {
  font-size: 2.75rem;
  line-height: 1.15;
  font-weight: 400;
  color: var(--text-main);
}

.category-tag {
  display: inline-block;
  background: var(--accent-gold);
  color: var(--text-dark);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0.35rem 0.75rem;
}

.share-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-family: var(--font-family);
  transition: color 0.2s ease;
}
.share-btn:hover {
  color: var(--accent-gold);
}

.article-featured-image-wrapper {
  border: 1px solid var(--border-light);
}

.article-featured-image {
  width: 100%;
  height: auto;
  max-height: 480px;
  object-fit: cover;
  filter: grayscale(100%);
  transition: filter 0.5s ease;
}
.article-featured-image:hover {
  filter: grayscale(0%);
}

/* Scoped article typography styling */
.article-content :deep(section) {
  margin-bottom: 2.5rem;
}

.article-content :deep(h2) {
  font-family: var(--font-serif);
  font-size: 1.85rem;
  color: var(--accent-gold);
  margin-bottom: 1.25rem;
  font-weight: 400;
  line-height: 1.3;
}

.article-content :deep(h3) {
  font-family: var(--font-serif);
  font-size: 1.45rem;
  color: var(--text-main);
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 500;
}

.article-content :deep(p) {
  font-size: 1rem;
  line-height: 1.7;
  color: #f5f2eb;
  opacity: 0.9;
  margin-bottom: 1.25rem;
}

.article-content :deep(blockquote) {
  border-left: 2px solid var(--accent-gold);
  padding-left: 1.5rem;
  margin: 1.5rem 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 1.2rem;
  color: #ded6c5;
  line-height: 1.6;
}

.article-content :deep(ul), .article-content :deep(ol) {
  margin-bottom: 1.5rem;
  padding-left: 1.5rem;
}

.article-content :deep(li) {
  font-size: 0.95rem;
  line-height: 1.6;
  color: #f5f2eb;
  opacity: 0.9;
  margin-bottom: 0.5rem;
}

.article-content :deep(strong) {
  color: var(--accent-gold);
  font-weight: 600;
}

/* CTA Box embedded in article content */
.article-content :deep(.blog-cta-box) {
  background: #181818;
  border: 1px solid var(--border-light);
  border-left: 3px solid var(--accent-gold);
  padding: 2.5rem;
  margin: 3rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.article-content :deep(.blog-cta-box h3) {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  margin: 0;
  color: var(--accent-gold);
}

.article-content :deep(.blog-cta-box p) {
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 1rem 0;
  color: var(--text-muted);
}

.article-content :deep(.blog-cta-box .btn-primary) {
  align-self: flex-start;
  text-decoration: none;
}

.tag-pill {
  font-size: 0.65rem;
  color: var(--accent-gold);
  background: rgba(191, 168, 133, 0.05);
  border: 1px solid rgba(191, 168, 133, 0.15);
  padding: 0.25rem 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Sidebar Widget */
.article-sidebar {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.sticky-widget {
  position: sticky;
  top: 7.5rem;
}

.sidebar-title {
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 0.5rem;
  color: var(--accent-gold);
  font-weight: 600;
}

.toc-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.toc-item {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.85rem;
  line-height: 1.4;
  transition: all 0.25s ease;
  border-left: 1px solid transparent;
  padding-left: 0.75rem;
}

.toc-item:hover {
  color: var(--text-main);
  padding-left: 1rem;
}

.toc-item.active {
  color: var(--accent-gold);
  border-left-color: var(--accent-gold);
  font-weight: 500;
  padding-left: 1rem;
}

/* Related section */
.related-posts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 768px) {
  .related-posts-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.related-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  border: 1px solid var(--border-light);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  height: 100%;
}
.related-card:hover {
  border-color: var(--accent-gold);
  transform: translateY(-2px);
}

.related-img-wrapper {
  overflow: hidden;
  height: 160px;
}
.related-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(100%);
  transition: all 0.5s ease;
}
.related-card:hover .related-img {
  filter: grayscale(0%);
  transform: scale(1.02);
}

.related-body {
  padding: 1.25rem;
}

.related-title {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  line-height: 1.3;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-main);
}
.related-card:hover .related-title {
  color: var(--accent-gold);
}

.related-desc {
  font-size: 0.8rem;
  line-height: 1.4;
}
</style>
