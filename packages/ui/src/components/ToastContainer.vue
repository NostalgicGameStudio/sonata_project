<script setup lang="ts">
import { useNotifications } from '../composables/useNotifications';

const { notifications, dismiss } = useNotifications();
</script>

<template>
  <div class="toast-viewport" aria-live="polite">
    <TransitionGroup name="toast" tag="div" class="toast-list">
      <div
        v-for="item in notifications"
        :key="item.id"
        class="toast-card"
        :class="`toast-${item.type}`"
      >
        <div class="toast-icon">
          <!-- Success -->
          <svg v-if="item.type === 'success'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <!-- Warning -->
          <svg v-else-if="item.type === 'warning'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <!-- Error -->
          <svg v-else-if="item.type === 'error'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <!-- Info -->
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>

        <div class="toast-body">
          <h4 v-if="item.title" class="toast-title">{{ item.title }}</h4>
          <p class="toast-message">{{ item.message }}</p>
        </div>

        <button type="button" class="toast-close" title="Fechar" @click="dismiss(item.id)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-viewport {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  max-width: 420px;
  width: calc(100% - 48px);
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast-card {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--sonata-radius-lg);
  background: var(--sonata-bg-surface-elevated);
  backdrop-filter: blur(12px);
  border: 1px solid var(--sonata-border-subtle);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.toast-body {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--sonata-text-primary);
  margin-bottom: 2px;
}

.toast-message {
  font-size: 0.85rem;
  color: var(--sonata-text-secondary);
  line-height: 1.4;
  word-break: break-word;
}

.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sonata-text-muted);
  width: 24px;
  height: 24px;
  border-radius: var(--sonata-radius-sm);
  background: transparent;
  flex-shrink: 0;
  margin-top: -2px;
}

.toast-close:hover {
  color: var(--sonata-text-primary);
  background-color: var(--sonata-bg-input);
}

/* Modificadores de tipo */
.toast-success {
  border-color: rgba(168, 213, 186, 0.35);
}
.toast-success .toast-icon {
  color: #a8d5ba;
}

.toast-warning {
  border-color: rgba(229, 189, 137, 0.35);
}
.toast-warning .toast-icon {
  color: #e5bd89;
}

.toast-error {
  border-color: rgba(235, 139, 139, 0.35);
}
.toast-error .toast-icon {
  color: #eb8b8b;
}

.toast-info {
  border-color: rgba(121, 168, 217, 0.35);
}
.toast-info .toast-icon {
  color: #79a8d9;
}

/* Animações TransitionGroup */
.toast-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

@media (max-width: 480px) {
  .toast-viewport {
    bottom: 12px;
    right: 12px;
    left: 12px;
    width: auto;
    max-width: 100%;
  }

  .toast-card {
    padding: 12px 14px;
    gap: 10px;
  }

  .toast-title {
    font-size: 0.86rem;
  }

  .toast-message {
    font-size: 0.8rem;
  }
}
</style>
