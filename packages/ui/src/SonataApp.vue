<script setup lang="ts">
import { ref } from 'vue';
import type { VideoMetadata, Track, CutProgress } from '@sonata/shared-types';
import { useCutterEngine } from './composables/useCutterEngine';
import { useTimestamps } from './composables/useTimestamps';
import UrlInput from './components/UrlInput.vue';
import TrackList from './components/TrackList.vue';
import ProgressBar from './components/ProgressBar.vue';

const engine = useCutterEngine();
const { parseTimestampsFromText } = useTimestamps();

const isAnalyzing = ref(false);
const isProcessing = ref(false);
const videoData = ref<VideoMetadata | null>(null);
const tracks = ref<Track[]>([]);
const outputFormat = ref<'mp3' | 'flac' | 'wav'>('mp3');
const currentUrl = ref('');

const progress = ref<CutProgress>({
  status: 'idle',
  percentage: 0,
  message: ''
});

const destinationDirectory = ref('');

const handleSelectDirectory = async () => {
  if (engine.selectDirectory) {
    const selected = await engine.selectDirectory();
    if (selected) {
      destinationDirectory.value = selected;
    }
  }
};

const handleSearch = async (url: string) => {
  currentUrl.value = url;
  isAnalyzing.value = true;
  videoData.value = null;
  tracks.value = [];

  try {
    const metadata = await engine.fetchMetadata(url);
    videoData.value = metadata;

    // Extrai faixas da descrição do vídeo usando o algoritmo de Regex inteligente
    const extracted = parseTimestampsFromText(metadata.rawDescription, metadata.durationSeconds);
    tracks.value = extracted;
  } catch (err: any) {
    alert(err.message || 'Não foi possível carregar as informações do vídeo.');
  } finally {
    isAnalyzing.value = false;
  }
};

const handleAddTrack = () => {
  const newIndex = tracks.value.length + 1;
  tracks.value.push({
    id: `custom-track-${Date.now()}`,
    index: newIndex,
    title: `Nova Faixa ${newIndex}`,
    startTime: '00:00',
    startSeconds: 0,
    selected: true
  });
};

const handleRemoveTrack = (index: number) => {
  tracks.value.splice(index, 1);
};

const startProcess = async () => {
  if (!currentUrl.value || tracks.value.length === 0) return;

  const selectedTracks = tracks.value.filter(t => t.selected);
  if (selectedTracks.length === 0) {
    alert('Selecione ao menos uma faixa para fatiar.');
    return;
  }

  isProcessing.value = true;
  progress.value = {
    status: 'downloading',
    percentage: 10,
    message: 'Preparando download do áudio...'
  };

  try {
    await engine.processAudio(
      {
        videoUrl: currentUrl.value,
        tracks: selectedTracks,
        outputFormat: outputFormat.value,
        destinationDirectory: destinationDirectory.value || undefined
      },
      (p: CutProgress) => {
        progress.value = p;
      }
    );
  } catch (err: any) {
    progress.value = {
      status: 'error',
      percentage: 0,
      message: err.message || 'Erro durante o processamento do áudio.'
    };
  } finally {
    isProcessing.value = false;
  }
};
</script>

<template>
  <div class="sonata-app-container">
    <header class="app-header">
      <div class="brand-row">
        <div class="brand-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </div>
        <h1 class="brand-title">Sonata</h1>
        <span class="engine-badge" :class="{ 'is-desktop': engine.isDesktop }">
          {{ engine.isDesktop ? 'Desktop Offline' : 'Web Cloud API' }}
        </span>
      </div>
      <p class="brand-subtitle">
        Transforme compilações, sets e vídeos longos em faixas individuais organizadas com precisão.
      </p>
    </header>

    <main class="app-content">
      <UrlInput :loading="isAnalyzing" @search="handleSearch" />

      <!-- Card do Vídeo Carregado -->
      <section v-if="videoData" class="video-preview-card">
        <div class="thumbnail-wrapper">
          <img :src="videoData.thumbnailUrl" :alt="videoData.title" />
        </div>
        <div class="video-meta">
          <h2 class="video-title">{{ videoData.title }}</h2>
          <p class="video-author">{{ videoData.author }}</p>
          <span class="video-duration">
            Duração: {{ Math.floor(videoData.durationSeconds / 60) }}min {{ videoData.durationSeconds % 60 }}s
          </span>
        </div>
      </section>

      <!-- Lista de Faixas -->
      <section v-if="videoData">
        <TrackList
          :tracks="tracks"
          :disabled="isProcessing"
          @update:tracks="newTracks => tracks = newTracks"
          @add-track="handleAddTrack"
          @remove-track="handleRemoveTrack"
        />

        <!-- Controles de Saída e Execução -->
        <div class="options-card">
          <div class="format-select-group">
            <label>Formato:</label>
            <select v-model="outputFormat" :disabled="isProcessing">
              <option value="mp3">MP3 (320 kbps)</option>
              <option value="flac">FLAC (Lossless)</option>
              <option value="wav">WAV (Sem Compressão)</option>
            </select>
          </div>

          <div v-if="engine.isDesktop" class="directory-select-group">
            <label>Destino:</label>
            <div class="directory-picker" :class="{ disabled: isProcessing }" @click="!isProcessing && handleSelectDirectory()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="directory-text" :title="destinationDirectory || 'Downloads/Sonata (Padrão)'">
                {{ destinationDirectory || 'Downloads/Sonata (Padrão)' }}
              </span>
              <button type="button" class="change-dir-btn" :disabled="isProcessing">
                Selecionar
              </button>
            </div>
          </div>
        </div>

        <div class="action-footer">
          <div></div>
          <button
            type="button"
            class="start-button"
            :disabled="isProcessing || tracks.length === 0"
            @click="startProcess"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>Fatiar e Exportar Álbum</span>
          </button>
        </div>

        <ProgressBar v-if="progress.status !== 'idle'" :progress="progress" />
      </section>
    </main>
  </div>
</template>

<style scoped>
.sonata-app-container {
  max-width: 920px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

.app-header {
  text-align: center;
  margin-bottom: 36px;
}

.brand-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.brand-logo {
  color: var(--sonata-accent-primary);
  display: flex;
  align-items: center;
}

.brand-title {
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--sonata-text-primary);
}

.engine-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--sonata-radius-full);
  background-color: var(--sonata-bg-surface-elevated);
  color: var(--sonata-text-secondary);
  border: 1px solid var(--sonata-border-subtle);
}

.engine-badge.is-desktop {
  color: var(--sonata-accent-primary);
  border-color: var(--sonata-accent-muted);
}

.brand-subtitle {
  color: var(--sonata-text-secondary);
  font-size: 0.98rem;
  max-width: 580px;
  margin: 0 auto;
}

.app-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.video-preview-card {
  display: flex;
  align-items: center;
  gap: 20px;
  background-color: var(--sonata-bg-surface);
  border: 1px solid var(--sonata-border-subtle);
  border-radius: var(--sonata-radius-lg);
  padding: 16px;
  box-shadow: var(--sonata-shadow-card);
}

.thumbnail-wrapper {
  width: 140px;
  height: 85px;
  border-radius: var(--sonata-radius-md);
  overflow: hidden;
  flex-shrink: 0;
  background-color: var(--sonata-bg-input);
}

.thumbnail-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-meta {
  flex: 1;
  min-width: 0;
}

.video-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--sonata-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.video-author {
  font-size: 0.88rem;
  color: var(--sonata-text-secondary);
  margin-bottom: 6px;
}

.video-duration {
  font-size: 0.8rem;
  color: var(--sonata-text-muted);
}

.options-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  background-color: var(--sonata-bg-surface);
  border: 1px solid var(--sonata-border-subtle);
  border-radius: var(--sonata-radius-lg);
  padding: 16px 20px;
  margin-top: 16px;
  box-shadow: var(--sonata-shadow-card);
}

.action-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  gap: 16px;
}

.format-select-group, .directory-select-group {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--sonata-text-secondary);
}

.format-select-group select {
  background-color: var(--sonata-bg-input);
  color: var(--sonata-text-primary);
  border: 1px solid var(--sonata-border-subtle);
  padding: 8px 14px;
  border-radius: var(--sonata-radius-md);
  font-family: inherit;
  outline: none;
  cursor: pointer;
  transition: var(--sonata-transition-smooth);
}

.format-select-group select:focus {
  border-color: var(--sonata-border-focus);
}

.directory-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: var(--sonata-bg-input);
  border: 1px solid var(--sonata-border-subtle);
  padding: 6px 12px;
  border-radius: var(--sonata-radius-md);
  cursor: pointer;
  transition: var(--sonata-transition-smooth);
  max-width: 380px;
}

.directory-picker:hover:not(.disabled) {
  border-color: var(--sonata-border-hover);
  background-color: var(--sonata-bg-surface-elevated);
}

.directory-picker.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.directory-text {
  font-size: 0.85rem;
  color: var(--sonata-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 230px;
}

.change-dir-btn {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--sonata-radius-sm);
  background-color: var(--sonata-bg-surface-elevated);
  color: var(--sonata-accent-primary);
  border: 1px solid var(--sonata-border-subtle);
}

.change-dir-btn:hover:not(:disabled) {
  background-color: var(--sonata-accent-muted);
}

.start-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--sonata-accent-primary);
  color: var(--sonata-text-inverse);
  font-weight: 600;
  font-size: 0.95rem;
  padding: 12px 28px;
  border-radius: var(--sonata-radius-md);
  box-shadow: var(--sonata-shadow-card);
}

.start-button:hover:not(:disabled) {
  background-color: var(--sonata-accent-hover);
  transform: translateY(-1px);
}

.start-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
