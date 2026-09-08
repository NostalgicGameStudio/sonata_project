<script setup lang="ts">
import type { CutProgress } from '@sonata/shared-types';

defineProps<{
  progress: CutProgress;
}>();
</script>

<template>
  <div class="progress-card">
    <div class="progress-header">
      <span class="status-badge" :class="progress.status">
        {{ progress.status.toUpperCase() }}
      </span>
      <span class="percentage">{{ Math.round(progress.percentage) }}%</span>
    </div>

    <div class="track-bar">
      <div
        class="track-fill"
        :style="{ width: `${Math.min(100, Math.max(0, progress.percentage))}%` }"
      ></div>
    </div>

    <p class="progress-message">
      {{ progress.message || 'Processando faixas com precisão...' }}
    </p>
  </div>
</template>

<style scoped>
.progress-card {
  background-color: var(--sonata-bg-surface);
  border: 1px solid var(--sonata-border-subtle);
  border-radius: var(--sonata-radius-lg);
  padding: 20px 24px;
  box-shadow: var(--sonata-shadow-card);
  margin-top: 20px;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.status-badge {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--sonata-radius-sm);
  background-color: var(--sonata-bg-input);
  color: var(--sonata-text-secondary);
}

.status-badge.downloading {
  color: var(--sonata-accent-primary);
  background-color: var(--sonata-accent-muted);
}

.status-badge.slicing {
  color: var(--sonata-warning);
  background-color: rgba(224, 169, 109, 0.15);
}

.status-badge.completed {
  color: var(--sonata-success);
  background-color: rgba(130, 178, 154, 0.15);
}

.percentage {
  font-weight: 600;
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  color: var(--sonata-text-primary);
}

.track-bar {
  width: 100%;
  height: 8px;
  background-color: var(--sonata-bg-input);
  border-radius: var(--sonata-radius-full);
  overflow: hidden;
}

.track-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--sonata-accent-secondary), var(--sonata-accent-primary));
  border-radius: var(--sonata-radius-full);
  transition: width 0.3s ease-out;
}

.progress-message {
  margin-top: 10px;
  font-size: 0.85rem;
  color: var(--sonata-text-secondary);
}
</style>
