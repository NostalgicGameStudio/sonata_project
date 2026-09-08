<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'search', url: string): void;
}>();

const inputUrl = ref('');
const errorMessage = ref('');

const isValidYoutubeUrl = (url: string) => {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return pattern.test(url.trim());
};

const handleSearch = () => {
  errorMessage.value = '';
  const trimmed = inputUrl.value.trim();

  if (!trimmed) {
    errorMessage.value = 'Por favor, insira o link de um vídeo do YouTube.';
    return;
  }

  if (!isValidYoutubeUrl(trimmed)) {
    errorMessage.value = 'Insira uma URL válida do YouTube (ex: https://youtube.com/watch?v=...).';
    return;
  }

  emit('search', trimmed);
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleSearch();
  }
};
</script>

<template>
  <div class="url-input-container">
    <div class="input-wrapper" :class="{ 'is-loading': loading, 'has-error': !!errorMessage }">
      <div class="icon-prefix">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="10 8 16 12 10 16 10 8"></polygon>
        </svg>
      </div>

      <input
        v-model="inputUrl"
        type="text"
        placeholder="Cole o link do YouTube aqui (ex: https://youtu.be/...)"
        :disabled="loading"
        @keydown="handleKeydown"
      />

      <button
        type="button"
        class="submit-button"
        :disabled="loading || !inputUrl.trim()"
        @click="handleSearch"
      >
        <span v-if="!loading">Analisar Faixas</span>
        <span v-else class="loading-state">
          <span class="spinner"></span>
          <span>Buscando...</span>
        </span>
      </button>
    </div>

    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.url-input-container {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background-color: var(--sonata-bg-surface);
  border: 1px solid var(--sonata-border-subtle);
  border-radius: var(--sonata-radius-lg);
  padding: 8px 10px 8px 18px;
  box-shadow: var(--sonata-shadow-card);
  transition: var(--sonata-transition-smooth);
}

.input-wrapper:focus-within {
  border-color: var(--sonata-border-focus);
  box-shadow: var(--sonata-shadow-glow);
}

.input-wrapper.has-error {
  border-color: var(--sonata-error);
}

.icon-prefix {
  display: flex;
  align-items: center;
  color: var(--sonata-text-muted);
  margin-right: 12px;
}

input {
  flex: 1;
  font-size: 0.98rem;
  color: var(--sonata-text-primary);
}

input::placeholder {
  color: var(--sonata-text-muted);
  font-weight: 300;
}

.submit-button {
  background-color: var(--sonata-accent-primary);
  color: var(--sonata-text-inverse);
  font-weight: 600;
  font-size: 0.9rem;
  padding: 10px 22px;
  border-radius: var(--sonata-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
}

.submit-button:hover:not(:disabled) {
  background-color: var(--sonata-accent-hover);
  transform: translateY(-1px);
}

.submit-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(18, 21, 24, 0.3);
  border-top-color: var(--sonata-text-inverse);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-text {
  margin-top: 8px;
  font-size: 0.85rem;
  color: var(--sonata-error);
  padding-left: 12px;
}
</style>
