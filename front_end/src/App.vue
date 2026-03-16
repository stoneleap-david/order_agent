<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { chatAPI, deliveryAPI, menuAPI } from './api/index'
import type { DeliveryResponse, MenuItem } from './api/index'

// 智能对话相关
const chatQuery = ref('')
const chatResponse = ref('')
const chatLoading = ref(false)

// 配送查询相关
const deliveryAddress = ref('')
const travelMode = ref('2')
const deliveryResponse = ref<DeliveryResponse | null>(null)
const deliveryLoading = ref(false)

// 菜品列表相关
const menuItems = ref<MenuItem[]>([])
const menuLoading = ref(false)
const highlightedItems = ref<string[]>([])

const formattedResponse = computed(() => {
  if (!chatResponse.value) return ''

  return chatResponse.value
    .replace(/#{1,6} (.*?)$/gm, (match: string, p1: string) => {
      const level = match.trim().split(' ')[0].length
      return `<h${level}>${p1}</h${level}>`
    })
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/(<li>.*?<\/li>)\n(<li>.*?<\/li>)/gs, '<ul>$1$2</ul>')
    .replace(/^\d+\. (.*?)$/gm, '<li>$1</li>')
    .replace(/\n\n(.*?)\n\n/gs, '<p>$1</p>')
    .replace(/\n/g, '<br/>')
})

const highlightRecommendedItems = (menuIds: string[]) => {
  if (!menuIds || !Array.isArray(menuIds) || menuIds.length === 0) {
    highlightedItems.value = []
    return
  }

  highlightedItems.value = menuIds.map((id) => id.toString())

  if (menuItems.value.length === 0) {
    loadMenuItems()
  }

  setTimeout(() => {
    const menuSection = document.querySelector('.menu-section')
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: 'smooth' })
    }
  }, 300)
}

const sendChatQuery = async () => {
  if (!chatQuery.value.trim()) return

  chatLoading.value = true
  chatResponse.value = ''
  try {
    const response = await chatAPI.sendMessage(chatQuery.value)

    if (response.recommendation) {
      chatResponse.value = response.recommendation
      console.log('推荐菜品ID:', response.menu_ids)
      highlightRecommendedItems(response.menu_ids ?? [])
    } else if (response.response) {
      chatResponse.value = response.response
    } else {
      chatResponse.value = '抱歉，我无法理解您的问题。'
    }
  } catch (error) {
    chatResponse.value = '正在处理您的请求，请稍等片刻...'
    console.log('智能对话请求详情:', (error as Error).message)
  } finally {
    chatLoading.value = false
  }
}

const checkDelivery = async () => {
  if (!deliveryAddress.value.trim()) return

  deliveryLoading.value = true
  try {
    const response = await deliveryAPI.checkRange(deliveryAddress.value, travelMode.value)
    deliveryResponse.value = response
  } catch {
    deliveryResponse.value = {
      success: false,
      in_range: false,
      message: '查询失败，请稍后再试',
      distance: 0,
      formatted_address: '',
      duration: 0,
      travel_mode: travelMode.value,
      input_address: deliveryAddress.value,
    }
  } finally {
    deliveryLoading.value = false
  }
}

const loadMenuItems = async () => {
  menuLoading.value = true
  try {
    const response = await menuAPI.getMenuList()
    menuItems.value = response.menu_items || []
  } catch (error) {
    console.error('加载菜品失败:', error)
    menuItems.value = []
  } finally {
    menuLoading.value = false
  }
}

const getSpiceColor = (level: number): string => {
  const colors = ['', 'green', 'orange', 'red']
  return colors[level] || ''
}

onMounted(() => {
  loadMenuItems()
})
</script>

<template>
  <div id="app">
    <a-layout class="main-container">
      <a-layout-header class="header"> </a-layout-header>

      <a-layout-content class="main-content">
        <!-- 智能对话区域 -->
        <a-card
          class="chat-section"
          hoverable
        >
          <template #title>
            <div class="card-header">
              <span>智能点餐助手</span>
            </div>
          </template>

          <div class="chat-input-area">
            <a-textarea
              v-model:value="chatQuery"
              :rows="4"
              placeholder="请输入您的需求，例如：'我想点一个不太辣的川菜'"
              class="chat-input"
            />
            <a-button
              type="primary"
              :loading="chatLoading"
              class="chat-button"
              @click="sendChatQuery"
            >
              {{ chatLoading ? '思考中...' : '询问' }}
            </a-button>
          </div>

          <!-- 对话结果显示 -->
          <div
            v-if="chatLoading"
            class="chat-loading"
          >
            <a-textarea
              value="AI助手正在思考中，请稍候..."
              :rows="3"
              readonly
              class="chat-output"
            />
          </div>

          <div
            v-else-if="chatResponse"
            class="chat-response"
          >
            <div class="formatted-container">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div
                class="formatted-content"
                v-html="formattedResponse"
              ></div>
            </div>
          </div>
        </a-card>

        <!-- 配送范围查询区域 -->
        <a-card
          class="delivery-section"
          hoverable
        >
          <template #title>
            <div class="card-header">
              <span>配送范围查询</span>
            </div>
          </template>

          <div class="delivery-input-area">
            <a-input
              v-model:value="deliveryAddress"
              placeholder="请输入您的地址，例如：'无锡英臻科技股份有限公司'"
              class="delivery-input"
            />
            <a-select
              v-model:value="travelMode"
              placeholder="选择出行方式"
              class="travel-select"
            >
              <a-select-option value="1">步行距离</a-select-option>
              <a-select-option value="3">驾车距离</a-select-option>
              <a-select-option value="2">骑行距离</a-select-option>
            </a-select>
            <a-button
              type="primary"
              :loading="deliveryLoading"
              class="delivery-button"
              @click="checkDelivery"
            >
              查询配送范围
            </a-button>
          </div>

          <!-- 配送查询结果 -->
          <div
            v-if="deliveryResponse"
            class="delivery-response"
          >
            <a-alert
              :message="deliveryResponse.message"
              :type="deliveryResponse.in_range ? 'success' : 'warning'"
              show-icon
            />
            <div
              v-if="deliveryResponse.distance"
              class="delivery-details"
            >
              <p>
                距离:
                <span style="color: red">{{ deliveryResponse.distance.toFixed(2) }}</span> 公里
              </p>
              <p>
                时间:
                <span style="color: red">{{ Math.floor(deliveryResponse.duration / 60) }}</span>
                分钟
                <span style="color: red">{{ deliveryResponse.duration % 60 }}</span> 秒
              </p>
              <p>地址: {{ deliveryResponse.formatted_address }}</p>
            </div>
          </div>
        </a-card>

        <!-- 菜品列表区域 -->
        <a-card
          class="menu-section"
          hoverable
        >
          <template #title>
            <div class="card-header">
              <span>菜品列表</span>
              <a-button
                type="primary"
                size="small"
                :loading="menuLoading"
                @click="loadMenuItems"
              >
                刷新菜单
              </a-button>
            </div>
          </template>

          <div
            v-if="menuItems.length > 0"
            class="menu-grid"
          >
            <div
              v-for="item in menuItems"
              :key="item.id"
              class="menu-item"
              :class="{
                'menu-item-highlighted': highlightedItems.includes(item.id.toString()),
              }"
            >
              <div class="menu-item-header">
                <h3>{{ item.dish_name }}</h3>
                <span class="price">{{ item.formatted_price }}</span>
              </div>
              <div class="menu-item-content">
                <p class="description">{{ item.description }}</p>
                <div class="menu-item-details">
                  <a-tag>{{ item.category }}</a-tag>
                  <a-tag :color="getSpiceColor(item.spice_level)">
                    {{ item.spice_text }}
                  </a-tag>
                  <a-tag
                    v-if="item.is_vegetarian"
                    color="green"
                  >
                    素食
                  </a-tag>
                  <a-tag
                    v-if="highlightedItems.includes(item.id.toString())"
                    color="red"
                  >
                    推荐
                  </a-tag>
                </div>
              </div>
            </div>
          </div>

          <div
            v-else-if="!menuLoading"
            class="empty-menu"
          >
            <a-empty description="暂无菜品数据" />
          </div>

          <div
            v-if="menuLoading"
            class="loading-menu"
          >
            <a-skeleton
              :paragraph="{ rows: 3 }"
              active
            />
          </div>
        </a-card>
      </a-layout-content>
    </a-layout>
  </div>
</template>

<style>
/* 主容器样式 */
.main-container {
  min-height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  background-color: #1677ff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.main-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background-color: #f5f5f5;
  overflow-x: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-section {
  width: 100%;
  overflow: hidden;
}

.chat-input-area {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.chat-input {
  flex: 1;
}

.chat-output {
  width: 100%;
}

.chat-response {
  width: 100%;
  overflow: visible;
}

.formatted-container {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 15px;
  background-color: #fff;
  height: 300px;
  overflow-y: auto;
  max-width: 100%;
  box-sizing: border-box;
}

.formatted-container::-webkit-scrollbar {
  width: 8px;
}

.formatted-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.formatted-container::-webkit-scrollbar-thumb {
  background: #bfbfbf;
  border-radius: 4px;
}

.formatted-container::-webkit-scrollbar-thumb:hover {
  background: #8c8c8c;
}

.formatted-content {
  width: 100%;
  line-height: 1.6;
  font-size: 15px;
  color: #333;
}

.formatted-content h1,
.formatted-content h2,
.formatted-content h3,
.formatted-content h4 {
  margin-top: 16px;
  margin-bottom: 12px;
  font-weight: 600;
  line-height: 1.25;
  color: #333;
}

.formatted-content h1 {
  font-size: 2em;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 0.3em;
}

.formatted-content h2 {
  font-size: 1.5em;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 0.3em;
}

.formatted-content h3 {
  font-size: 1.25em;
}

.formatted-content h4 {
  font-size: 1em;
}

.formatted-content strong {
  font-weight: 600;
  color: #000;
}

.formatted-content em {
  font-style: italic;
}

.formatted-content ul,
.formatted-content ol {
  padding-left: 2em;
  margin: 8px 0;
}

.formatted-content li {
  margin: 4px 0;
}

.formatted-content p {
  margin: 8px 0;
}

.raw-text-details {
  margin-top: 10px;
  color: #595959;
}

.raw-text-details summary {
  cursor: pointer;
  padding: 5px 0;
  font-size: 14px;
  color: #1677ff;
}

.raw-text-details summary:hover {
  text-decoration: underline;
}

.delivery-input-area {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
}

.delivery-input {
  flex: 1;
  min-width: 300px;
  margin-bottom: 10px;
}

.travel-select {
  min-width: 150px;
  margin-bottom: 10px;
}

.delivery-button {
  min-width: 150px;
  margin-bottom: 10px;
}

.delivery-details {
  margin-top: 10px;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.menu-item {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 15px;
  transition: all 0.3s;
  background-color: white;
}

.menu-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.menu-item-highlighted {
  border: 2px solid #ff4d4f;
  box-shadow: 0 0 10px rgba(255, 77, 79, 0.3);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 77, 79, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0);
  }
}

.menu-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.menu-item-header h3 {
  margin: 0;
}

.price {
  color: #ff4d4f;
  font-weight: bold;
}

.description {
  margin: 10px 0;
  color: #595959;
  font-size: 14px;
}

.menu-item-details {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 10px 0 0 0;
}

.empty-menu,
.loading-menu {
  padding: 20px;
  text-align: center;
}

.chat-textarea {
  width: 100%;
  min-height: 120px;
  padding: 10px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  color: #595959;
  resize: both;
  margin-top: 10px;
}

.chat-textarea:focus {
  outline: none;
  border-color: #1677ff;
}

/* ===== H5 响应式适配 ===== */
@media screen and (max-width: 768px) {
  .main-content {
    padding: 12px;
    gap: 12px;
  }

  .header {
    padding: 0 12px;
    height: 48px;
    line-height: 48px;
  }

  .chat-input-area {
    flex-direction: column;
    gap: 8px;
  }

  .chat-button {
    width: 100%;
  }

  .formatted-container {
    height: 200px;
    padding: 12px;
  }

  .delivery-input-area {
    flex-direction: column;
    gap: 10px;
  }

  .delivery-input {
    min-width: unset;
    width: 100%;
    margin-bottom: 0;
  }

  .travel-select {
    min-width: unset;
    width: 100%;
    margin-bottom: 0;
  }

  .delivery-button {
    min-width: unset;
    width: 100%;
    margin-bottom: 0;
  }

  .menu-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .menu-item-header h3 {
    font-size: 15px;
  }

  .menu-item-details {
    flex-wrap: wrap;
  }
}

@media screen and (max-width: 480px) {
  .main-content {
    padding: 8px;
    gap: 8px;
  }

  .card-header span {
    font-size: 15px;
  }

  .formatted-container {
    height: 160px;
  }

  .formatted-content {
    font-size: 14px;
  }
}
</style>
