<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { blogPosts } from '../data/blogPosts'
import { Search, Calendar, User, Clock, ArrowRight, BookOpen, Filter } from 'lucide-vue-next'

const searchQuery = ref('')
const selectedCategory = ref('All')

const categories = ['All', 'Insights', 'Guides', 'Analysis']

// SEO Title and Meta Description for the Listing page
onMounted(() => {
  document.title = 'Institutional RWA & Treasury Blog | BondRouter OS'
  const metaDesc = document.querySelector('meta[name="description"]')
  const contentText = 'Stay ahead with institutional insights, step-by-step guides, and RWA market analysis for corporate treasury optimization on the Arc L1 network.'
  if (metaDesc) {
    metaDesc.setAttribute('content', contentText)
  } else {
    const newMeta = document.createElement('meta')
    newMeta.setAttribute('name', 'description')
    newMeta.setAttribute('content', contentText)
    document.head.appendChild(newMeta)
  }
})

// Computed filtered articles
const filteredPosts = computed(() => {
  return blogPosts.filter(post => {
    const matchesSearch = 
      post.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      post.summary.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.value.toLowerCase()))
    
    const matchesCategory = selectedCategory.value === 'All' || post.category === selectedCategory.value

    return matchesSearch && matchesCategory
  })
})

// Highlight the most recent post as the featured post (we'll take the first one in the list)
const featuredPost = computed(() => {
  return blogPosts[0]
})

// Regular posts that are not the featured post
const regularPosts = computed(() => {
  return filteredPosts.value.filter(post => post.slug !== featuredPost.value.slug)
})
</script>

<template>
  <div class="page-container fade-in">
    <!-- HERO HEADER -->
    <div class="flex flex-col md:flex-row md:items-end justify-between border-b pb-8 mb-12" style="border-color: var(--border-light);">
      <div>
        <div class="flex items-center gap-2 mb-2 micro-cap" style="color: var(--accent-gold);">
          <BookOpen :size="14" /> BondRouter Insights
        </div>
        <h1 class="display-xl text-gradient">TREASURY INTELLIGENCE</h1>
        <p class="body-md text-mute mt-2" style="max-width: 600px; font-size: 0.95rem; line-height: 1.5;">
          Deep dives into RWA tokenization, corporate treasury yield mechanisms, client-side zero-knowledge privacy, and automated waterfall distribution strategies on the Arc L1 Network.
        </p>
      </div>

      <!-- Live Search & Filtering Controls -->
      <div class="search-filter-container mt-6 md:mt-0 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div class="search-box">
          <Search :size="16" class="search-icon" />
          <input 
            type="text" 
            class="search-input" 
            placeholder="Search articles, tags..." 
            v-model="searchQuery" 
          />
        </div>
      </div>
    </div>

    <!-- CATEGORY FILTER BUTTONS -->
    <div class="flex flex-wrap gap-3 mb-10 pb-4 border-b" style="border-color: rgba(245, 242, 235, 0.05);">
      <button 
        v-for="cat in categories" 
        :key="cat"
        class="category-btn"
        :class="{ 'active': selectedCategory === cat }"
        @click="selectedCategory = cat"
      >
        {{ cat }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="filteredPosts.length === 0" class="empty-blog py-16 text-center glass-panel">
      <BookOpen :size="48" style="color: var(--text-muted); opacity: 0.4; margin: 0 auto 1rem;" />
      <h3 style="font-family: var(--font-serif); font-size: 1.5rem; margin-bottom: 0.5rem;">No Articles Found</h3>
      <p class="text-mute body-md mb-6" style="font-size: 0.9rem;">We couldn't find any articles matching your search query. Try clearing your filters.</p>
      <button @click="searchQuery = ''; selectedCategory = 'All';" class="btn-primary">Reset Filters</button>
    </div>

    <div v-else class="flex flex-col gap-16">
      <!-- FEATURED POST BANNER (Only shows when search/category filters match it, or if no filter is applied) -->
      <div v-if="filteredPosts.some(p => p.slug === featuredPost.slug) && searchQuery === '' && selectedCategory === 'All'" class="featured-banner-wrapper">
        <RouterLink :to="'/blog/' + featuredPost.slug" class="featured-card glass-panel flex flex-col lg:flex-row gap-8">
          <div class="featured-img-container lg:w-1/2">
            <div class="editorial-image-box">
              <img :src="featuredPost.featuredImage" :alt="featuredPost.title" class="featured-img" />
              <div class="featured-tag-badge">{{ featuredPost.category }}</div>
            </div>
          </div>
          
          <div class="featured-content lg:w-1/2 flex flex-col justify-between py-2">
            <div class="flex flex-col gap-4">
              <div class="flex flex-wrap gap-4 items-center text-mute micro-cap" style="font-size: 0.65rem;">
                <span class="flex items-center gap-1"><Calendar :size="12" /> {{ featuredPost.date }}</span>
                <span class="flex items-center gap-1"><User :size="12" /> {{ featuredPost.author }}</span>
                <span class="flex items-center gap-1"><Clock :size="12" /> {{ featuredPost.readTime }}</span>
              </div>
              
              <h2 class="display-lg featured-title">{{ featuredPost.title }}</h2>
              <p class="body-md text-mute featured-summary">{{ featuredPost.summary }}</p>
              
              <div class="flex flex-wrap gap-2 mt-2">
                <span v-for="tag in featuredPost.tags" :key="tag" class="tag-pill">#{{ tag }}</span>
              </div>
            </div>

            <div class="featured-footer mt-6 lg:mt-0">
              <span class="btn-link">
                Read Full Insight <ArrowRight :size="16" />
              </span>
            </div>
          </div>
        </RouterLink>
      </div>

      <!-- ARTICLES GRID -->
      <div class="blog-grid">
        <!-- Render remaining matched posts -->
        <RouterLink 
          v-for="post in (searchQuery !== '' || selectedCategory !== 'All' ? filteredPosts : regularPosts)" 
          :key="post.slug"
          :to="'/blog/' + post.slug"
          class="blog-card glass-panel"
        >
          <div class="card-img-wrapper">
            <img :src="post.featuredImage" :alt="post.title" class="card-img" />
            <div class="card-category">{{ post.category }}</div>
          </div>

          <div class="card-body">
            <div class="flex flex-wrap gap-3 items-center text-mute micro-cap mb-3" style="font-size: 0.6rem;">
              <span class="flex items-center gap-1"><Calendar :size="10" /> {{ post.date }}</span>
              <span class="flex items-center gap-1"><Clock :size="10" /> {{ post.readTime }}</span>
            </div>

            <h3 class="card-title">{{ post.title }}</h3>
            <p class="card-desc text-mute">{{ post.summary }}</p>
            
            <div class="flex flex-wrap gap-1.5 mt-4">
              <span v-for="tag in post.tags" :key="tag" class="tag-pill-sm">#{{ tag }}</span>
            </div>
          </div>

          <div class="card-footer">
            <span class="btn-link-sm">
              Read Article <ArrowRight :size="12" />
            </span>
          </div>
        </RouterLink>
      </div>
    </div>

    <!-- CONVERSION SECTION -->
    <div class="blog-conversion-banner glass-panel mt-20">
      <div class="conversion-content">
        <span class="micro-cap" style="color: var(--accent-gold);">Deploy Capital Safely</span>
        <h2 class="display-lg">Secure Institutional Yield for Your Corporate Treasury</h2>
        <p class="body-md text-mute">
          Onboard in minutes using Passkeys, bridge instantly with Circle CCTP, and access real-world yield. Pay zero transaction fees with sponsored gas.
        </p>
        <div class="flex gap-4 mt-6">
          <RouterLink to="/discover" class="btn-primary">Explore Pools</RouterLink>
          <RouterLink to="/settings" class="btn-glass">Setup Passkey SCA</RouterLink>
        </div>
      </div>
      <div class="conversion-graphic">
        <!-- Minimalist vector emblem matching the Swiss styling -->
        <svg viewBox="0 0 100 100" class="waterfall-svg">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(191,168,133,0.1)" stroke-width="1" />
          <polygon points="50,15 80,75 20,75" fill="none" stroke="var(--accent-gold)" stroke-width="1.5" />
          <line x1="50" y1="15" x2="50" y2="75" stroke="rgba(191,168,133,0.3)" stroke-width="1" />
          <circle cx="50" cy="15" r="3" fill="var(--text-main)" />
          <circle cx="80" cy="75" r="3" fill="var(--accent-gold)" />
          <circle cx="20" cy="75" r="3" fill="var(--text-muted)" />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-container {
  position: relative;
  width: 320px;
  max-width: 100%;
}

.search-box {
  position: relative;
  width: 320px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-light);
  color: var(--text-main);
  font-size: 0.8rem;
  outline: none;
  transition: all 0.3s ease;
}

.search-input:focus {
  border-color: var(--accent-gold);
  background: rgba(255, 255, 255, 0.04);
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.category-btn {
  background: transparent;
  border: 1px solid var(--border-light);
  padding: 0.5rem 1.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.3s ease;
}

.category-btn:hover {
  color: var(--text-main);
  border-color: var(--text-main);
}

.category-btn.active {
  color: var(--text-dark);
  background: var(--accent-gold);
  border-color: var(--accent-gold);
}

/* Featured Card */
.featured-card {
  text-decoration: none;
  color: inherit;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid var(--border-light);
}

.featured-card:hover {
  border-color: var(--accent-gold);
  transform: translateY(-4px);
}

.featured-card:hover .featured-img {
  transform: scale(1.03);
  filter: grayscale(0%);
}

.featured-img-container {
  overflow: hidden;
  position: relative;
  min-height: 280px;
}

.editorial-image-box {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.featured-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  min-height: 320px;
  max-height: 400px;
  filter: grayscale(100%);
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.featured-tag-badge {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: var(--accent-gold);
  color: var(--text-dark);
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0.35rem 0.75rem;
}

.featured-title {
  margin-top: 0.5rem;
  font-size: 2.25rem;
  line-height: 1.2;
}

.featured-summary {
  font-size: 0.95rem;
  line-height: 1.6;
}

.tag-pill {
  font-size: 0.7rem;
  color: var(--accent-gold);
  background: rgba(191, 168, 133, 0.05);
  border: 1px solid rgba(191, 168, 133, 0.15);
  padding: 0.25rem 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent-gold);
  transition: all 0.3s ease;
}

.featured-card:hover .btn-link {
  color: var(--text-main);
  gap: 0.75rem;
}

/* Grid layout */
.blog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2.5rem;
}

.blog-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid var(--border-light);
  height: 100%;
}

.blog-card:hover {
  border-color: var(--accent-gold);
  transform: translateY(-4px);
}

.blog-card:hover .card-img {
  transform: scale(1.03);
  filter: grayscale(0%);
}

.card-img-wrapper {
  position: relative;
  overflow: hidden;
  height: 200px;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(100%);
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.card-category {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: var(--bg-base);
  border: 1px solid var(--border-light);
  color: var(--accent-gold);
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0.25rem 0.5rem;
}

.card-body {
  padding: 1.5rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.card-title {
  font-family: var(--font-serif);
  font-size: 1.35rem;
  line-height: 1.3;
  margin-bottom: 0.75rem;
  font-weight: 500;
  color: var(--text-main);
  transition: color 0.3s ease;
}

.blog-card:hover .card-title {
  color: var(--accent-gold);
}

.card-desc {
  font-size: 0.85rem;
  line-height: 1.5;
  margin-bottom: auto;
}

.tag-pill-sm {
  font-size: 0.65rem;
  color: var(--text-muted);
  padding: 0.15rem 0.4rem;
}

.card-footer {
  padding: 0 1.5rem 1.5rem;
}

.btn-link-sm {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  transition: all 0.3s ease;
}

.blog-card:hover .btn-link-sm {
  color: var(--accent-gold);
  gap: 0.5rem;
}

/* Conversion Banner */
.blog-conversion-banner {
  display: flex;
  flex-direction: column;
  md-flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 3rem;
  padding: 4rem;
  background: radial-gradient(circle at top right, rgba(191, 168, 133, 0.04), transparent 40%), #181818;
  border: 1px solid var(--border-light);
  position: relative;
  overflow: hidden;
}

.blog-conversion-banner::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 1px;
  background: var(--accent-gold);
}

.conversion-content {
  flex: 1.4;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.conversion-graphic {
  flex: 0.6;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 150px;
}

.waterfall-svg {
  width: 140px;
  height: 140px;
  animation: slow-spin 25s linear infinite;
}

@keyframes slow-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (min-width: 768px) {
  .blog-conversion-banner {
    flex-direction: row;
  }
}

@media (max-width: 767px) {
  .blog-conversion-banner {
    padding: 2.5rem 1.5rem;
    text-align: center;
  }
  .conversion-content {
    align-items: center;
  }
  .conversion-graphic {
    display: none;
  }
}
</style>
