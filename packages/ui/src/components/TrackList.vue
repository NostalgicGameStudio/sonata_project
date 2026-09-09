<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Track, DownloadMode } from '@sonata/shared-types';
import { useTimestamps, secondsToTimestamp } from '../composables/useTimestamps';
import { useNotifications } from '../composables/useNotifications';

const props = withDefaults(
  defineProps<{
    tracks: Track[];
    mode?: DownloadMode;
    disabled?: boolean;
    durationSeconds?: number;
  }>(),
  {
    mode: 'album',
    disabled: false,
    durationSeconds: 0
  }
);

const emit = defineEmits<{
  (e: 'update:tracks', tracks: Track[]): void;
  (e: 'add-track'): void;
  (e: 'remove-track', index: number): void;
}>();

const { parseTimestampsFromText } = useTimestamps();
const toast = useNotifications();

const showPasteBox = ref(false);
const customText = ref('');

const selectedCount = computed(() => {
  return props.tracks.filter(t => t.selected).length;
});

const allSelected = computed({
  get: () => props.tracks.length > 0 && props.tracks.every(t => t.selected),
  set: (val: boolean) => {
    const updated = props.tracks.map(t => ({ ...t, selected: val }));
    emit('update:tracks', updated);
  }
});

const toggleTrack = (index: number) => {
  if (props.disabled) return;
  const updated = [...props.tracks];
  updated[index].selected = !updated[index].selected;
  emit('update:tracks', updated);
};

const updateField = (index: number, field: keyof Track, value: any) => {
  const updated = [...props.tracks];
  updated[index] = { ...updated[index], [field]: value };
  emit('update:tracks', updated);
};

const headerTitle = computed(() => {
  if (props.mode === 'single') return 'Música a Baixar';
  if (props.mode === 'playlist') return 'Faixas da Playlist';
  return 'Faixas Fatiadas por Timestamp';
});

const handleProcessCustomText = () => {
  if (!customText.value.trim()) return;

  const parsed = parseTimestampsFromText(customText.value, props.durationSeconds);
  if (parsed.length > 0) {
    emit('update:tracks', parsed);
    showPasteBox.value = false;
    customText.value = '';
    toast.success(`${parsed.length} faixas identificadas e organizadas!`, 'Timestamps Processados');
  } else {
    toast.warning(
      'Não encontramos timestamps no formato MM:SS ou HH:MM:SS no texto fornecido. Verifique o formato e tente novamente.',
      'Nenhum Timestamp Detectado'
    );
  }
};
</script>

<template>
  <div class="track-list-card">
    <div class="card-header">
      <div class="header-left">
        <label v-if="mode !== 'single'" class="checkbox-container">
          <input type="checkbox" v-model="allSelected" :disabled="disabled || tracks.length === 0" />
          <span class="checkmark"></span>
          <span class="header-title">{{ headerTitle }}</span>
        </label>
        <span v-else class="header-title">{{ headerTitle }}</span>

        <span v-if="mode !== 'single'" class="track-counter">
          {{ selectedCount }} de {{ tracks.length }} selecionadas
        </span>
      </div>

      <div v-if="mode === 'album'" class="header-actions">
        <button
          type="button"
          class="secondary-action-button"
          :class="{ 'is-active': showPasteBox }"
          :disabled="disabled"
          @click="showPasteBox = !showPasteBox"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>{{ showPasteBox ? 'Fechar Editor' : 'Colar Timestamps' }}</span>
        </button>

        <button
          type="button"
          class="add-track-button"
          :disabled="disabled"
          @click="emit('add-track')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Adicionar Faixa</span>
        </button>
      </div>
    </div>

    <div v-if="showPasteBox && mode === 'album'" class="paste-timestamps-box">
      <div class="paste-box-header">
        <div class="paste-box-title-group">
          <span class="paste-icon">📝</span>
          <span class="paste-box-title">Colar Timestamps (Descrição ou Comentários)</span>
        </div>
        <button type="button" class="close-paste-btn" title="Fechar" @click="showPasteBox = false">✕</button>
      </div>
      <p class="paste-box-subtext">
        Cole o texto do comentário ou tracklist abaixo. O Sonata extrairá os horários e títulos automaticamente:
      </p>
      <textarea
        v-model="customText"
        rows="5"
        placeholder="00:00 - Introdução&#10;03:15 - Primeira Música&#10;06:40 - Segunda Música&#10;..."
        class="paste-textarea"
        :disabled="disabled"
      ></textarea>
      <div class="paste-box-actions">
        <button type="button" class="btn-cancel" @click="showPasteBox = false">Cancelar</button>
        <button
          type="button"
          class="btn-process"
          :disabled="disabled || !customText.trim()"
          @click="handleProcessCustomText"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <span>Identificar Faixas</span>
        </button>
      </div>
    </div>

    <div v-if="tracks.length === 0" class="empty-state">
      <template v-if="mode === 'album'">
        <div class="empty-album-state">
          <p class="empty-title">Nenhuma marcação de tempo encontrada na descrição do vídeo.</p>
          <p class="empty-subtext">
            Se alguém listou as músicas nos comentários, cole o texto abaixo para gerar as faixas:
          </p>
          <textarea
            v-model="customText"
            rows="5"
            placeholder="00:00 - Primeira Música&#10;02:45 - Segunda Música&#10;05:30 - Terceira Música&#10;..."
            class="paste-textarea"
            :disabled="disabled"
          ></textarea>
          <div class="empty-actions">
            <button
              type="button"
              class="btn-process"
              :disabled="disabled || !customText.trim()"
              @click="handleProcessCustomText"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
              <span>Processar Timestamps</span>
            </button>
          </div>
        </div>
      </template>
      <p v-else-if="mode === 'playlist'">Nenhuma música encontrada nesta playlist.</p>
      <p v-else>Nenhuma informação da música carregada.</p>
    </div>

    <div v-else-if="mode === 'album'" class="table-scroll-container">
      <div class="tracks-table album-table">
        <div class="table-head album-grid">
          <div class="col-check"></div>
          <div class="col-index">#</div>
          <div class="col-title">Título da Música</div>
          <div class="col-time">Início</div>
          <div class="col-time">Fim</div>
          <div class="col-actions"></div>
        </div>

        <div class="table-body">
          <div
            v-for="(track, idx) in tracks"
            :key="track.id || idx"
            class="track-row album-grid"
            :class="{ 'is-selected': track.selected }"
          >
            <div class="col-check">
              <label class="checkbox-container">
                <input
                  type="checkbox"
                  :checked="track.selected"
                  :disabled="disabled"
                  @change="toggleTrack(idx)"
                />
                <span class="checkmark"></span>
              </label>
            </div>

            <div class="col-index">
              {{ (idx + 1).toString().padStart(2, '0') }}
            </div>

            <div class="col-title">
              <input
                type="text"
                :value="track.title"
                placeholder="Nome da faixa..."
                :disabled="disabled"
                class="inline-input title-input"
                @input="e => updateField(idx, 'title', (e.target as HTMLInputElement).value)"
              />
            </div>

            <div class="col-time">
              <input
                type="text"
                :value="track.startTime"
                placeholder="00:00"
                :disabled="disabled"
                class="inline-input time-input"
                @input="e => updateField(idx, 'startTime', (e.target as HTMLInputElement).value)"
              />
            </div>

            <div class="col-time">
              <input
                type="text"
                :value="track.endTime || ''"
                placeholder="Final"
                :disabled="disabled"
                class="inline-input time-input"
                @input="e => updateField(idx, 'endTime', (e.target as HTMLInputElement).value)"
              />
            </div>

            <div class="col-actions">
              <button
                type="button"
                class="remove-button"
                title="Remover faixa"
                :disabled="disabled"
                @click="emit('remove-track', idx)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="table-scroll-container">
      <div class="tracks-table" :class="mode === 'single' ? 'single-table' : 'playlist-table'">
        <div class="table-head" :class="mode === 'single' ? 'single-grid' : 'playlist-grid'">
          <div v-if="mode === 'playlist'" class="col-check"></div>
          <div class="col-index">#</div>
          <div class="col-title">Título da Música</div>
          <div class="col-artist">Artista / Canal</div>
          <div class="col-duration">Duração</div>
        </div>

        <div class="table-body">
          <div
            v-for="(track, idx) in tracks"
            :key="track.id || idx"
            class="track-row"
            :class="[mode === 'single' ? 'single-grid' : 'playlist-grid', { 'is-selected': track.selected }]"
          >
            <div v-if="mode === 'playlist'" class="col-check">
              <label class="checkbox-container">
                <input
                  type="checkbox"
                  :checked="track.selected"
                  :disabled="disabled"
                  @change="toggleTrack(idx)"
                />
                <span class="checkmark"></span>
              </label>
            </div>

            <div class="col-index">
              {{ (idx + 1).toString().padStart(2, '0') }}
            </div>

            <div class="col-title">
              <input
                type="text"
                :value="track.title"
                placeholder="Título da música..."
                :disabled="disabled"
                class="inline-input title-input"
                @input="e => updateField(idx, 'title', (e.target as HTMLInputElement).value)"
              />
            </div>

            <div class="col-artist">
              <input
                type="text"
                :value="track.artist || ''"
                placeholder="Artista..."
                :disabled="disabled"
                class="inline-input artist-input"
                @input="e => updateField(idx, 'artist', (e.target as HTMLInputElement).value)"
              />
            </div>

            <div class="col-duration">
              <span class="duration-badge">
                {{ track.durationSeconds ? secondsToTimestamp(track.durationSeconds) : (track.endTime || '--:--') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.track-list-card {
  background-color: var(--sonata-bg-surface);
  border: 1px solid var(--sonata-border-subtle);
  border-radius: var(--sonata-radius-lg);
  padding: 20px 24px;
  box-shadow: var(--sonata-shadow-card);
  margin-top: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--sonata-border-subtle);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-title {
  font-weight: 600;
  font-size: 1.05rem;
  color: var(--sonata-text-primary);
}

.track-counter {
  font-size: 0.85rem;
  color: var(--sonata-accent-primary);
  background-color: var(--sonata-accent-muted);
  padding: 4px 10px;
  border-radius: var(--sonata-radius-full);
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.secondary-action-button {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--sonata-text-secondary);
  border: 1px solid var(--sonata-border-subtle);
  background: var(--sonata-bg-input);
  padding: 6px 14px;
  border-radius: var(--sonata-radius-md);
  transition: var(--sonata-transition-smooth);
  white-space: nowrap;
}

.secondary-action-button:hover:not(:disabled) {
  color: var(--sonata-text-primary);
  border-color: var(--sonata-border-hover);
  background-color: var(--sonata-bg-surface-elevated);
}

.secondary-action-button.is-active {
  color: var(--sonata-accent-primary);
  border-color: var(--sonata-accent-muted);
  background-color: var(--sonata-accent-muted);
}

.add-track-button {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--sonata-text-secondary);
  border: 1px solid var(--sonata-border-subtle);
  padding: 6px 14px;
  border-radius: var(--sonata-radius-md);
  transition: var(--sonata-transition-smooth);
  white-space: nowrap;
}

.add-track-button:hover:not(:disabled) {
  color: var(--sonata-text-primary);
  border-color: var(--sonata-border-hover);
  background-color: var(--sonata-bg-surface-elevated);
}

.paste-timestamps-box {
  background: var(--sonata-bg-input);
  border: 1px solid var(--sonata-border-subtle);
  border-radius: var(--sonata-radius-md);
  padding: 16px;
  margin-top: 16px;
  animation: fadeIn 0.2s ease-out;
}

.paste-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.paste-box-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.paste-icon {
  font-size: 1rem;
}

.paste-box-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--sonata-text-primary);
}

.close-paste-btn {
  color: var(--sonata-text-muted);
  background: transparent;
  padding: 2px 6px;
  border-radius: var(--sonata-radius-sm);
  font-size: 0.85rem;
}

.close-paste-btn:hover {
  color: var(--sonata-text-primary);
}

.paste-box-subtext {
  font-size: 0.85rem;
  color: var(--sonata-text-muted);
  margin-bottom: 12px;
}

.paste-textarea {
  width: 100%;
  padding: 10px 14px;
  background-color: var(--sonata-bg-surface);
  border: 1px solid var(--sonata-border-subtle);
  border-radius: var(--sonata-radius-md);
  color: var(--sonata-text-primary);
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  transition: var(--sonata-transition-smooth);
}

.paste-textarea:focus {
  border-color: var(--sonata-border-focus);
}

.paste-box-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.btn-cancel {
  font-size: 0.85rem;
  padding: 6px 14px;
  border-radius: var(--sonata-radius-md);
  color: var(--sonata-text-muted);
  background: transparent;
}

.btn-cancel:hover {
  color: var(--sonata-text-primary);
}

.btn-process {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: var(--sonata-radius-md);
  background-color: var(--sonata-accent-primary);
  color: var(--sonata-text-inverse);
  transition: var(--sonata-transition-smooth);
}

.btn-process:hover:not(:disabled) {
  background-color: var(--sonata-accent-hover);
}

.btn-process:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.table-scroll-container {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 4px;
}

.table-head {
  padding: 12px 8px;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sonata-text-muted);
  font-weight: 600;
}

.album-grid {
  display: grid;
  grid-template-columns: 32px 36px 1fr 90px 90px 40px;
  gap: 12px;
  align-items: center;
}

.playlist-grid {
  display: grid;
  grid-template-columns: 32px 36px 1fr 200px 90px;
  gap: 12px;
  align-items: center;
}

.single-grid {
  display: grid;
  grid-template-columns: 36px 1fr 240px 90px;
  gap: 16px;
  align-items: center;
}

.track-row {
  padding: 8px 8px;
  border-radius: var(--sonata-radius-md);
  margin-bottom: 4px;
  transition: var(--sonata-transition-smooth);
}

.track-row:hover {
  background-color: var(--sonata-bg-surface-elevated);
}

.col-index {
  font-size: 0.85rem;
  color: var(--sonata-text-muted);
  font-variant-numeric: tabular-nums;
}

.inline-input {
  width: 100%;
  padding: 6px 10px;
  border-radius: var(--sonata-radius-sm);
  background: transparent;
  color: var(--sonata-text-primary);
  border: 1px solid transparent;
  transition: var(--sonata-transition-smooth);
}

.inline-input:hover {
  background-color: var(--sonata-bg-input);
  border-color: var(--sonata-border-subtle);
}

.inline-input:focus {
  background-color: var(--sonata-bg-input);
  border-color: var(--sonata-border-focus);
}

.title-input {
  font-size: 0.92rem;
}

.artist-input {
  font-size: 0.88rem;
  color: var(--sonata-text-secondary);
}

.time-input {
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.col-duration {
  text-align: right;
}

.duration-badge {
  font-size: 0.82rem;
  color: var(--sonata-text-muted);
  font-variant-numeric: tabular-nums;
  background-color: var(--sonata-bg-input);
  padding: 4px 8px;
  border-radius: var(--sonata-radius-sm);
  white-space: nowrap;
}

.remove-button {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sonata-text-muted);
  width: 28px;
  height: 28px;
  border-radius: var(--sonata-radius-sm);
}

.remove-button:hover:not(:disabled) {
  color: var(--sonata-error);
  background-color: rgba(204, 123, 123, 0.1);
}

.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  user-select: none;
}

.checkbox-container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  height: 18px;
  width: 18px;
  background-color: var(--sonata-bg-input);
  border: 1px solid var(--sonata-border-subtle);
  border-radius: 5px;
  display: inline-block;
  margin-right: 8px;
  transition: var(--sonata-transition-smooth);
}

.checkbox-container:hover input ~ .checkmark {
  border-color: var(--sonata-border-hover);
}

.checkbox-container input:checked ~ .checkmark {
  background-color: var(--sonata-accent-primary);
  border-color: var(--sonata-accent-primary);
}

.empty-state {
  padding: 24px 16px;
  color: var(--sonata-text-secondary);
}

.empty-album-state {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--sonata-text-primary);
}

.empty-actions {
  display: flex;
  justify-content: flex-end;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .album-grid {
    grid-template-columns: 28px 28px minmax(130px, 1fr) 76px 76px 32px;
    gap: 8px;
  }

  .playlist-grid {
    grid-template-columns: 28px 28px minmax(130px, 1fr) 140px 75px;
    gap: 8px;
  }

  .single-grid {
    grid-template-columns: 28px minmax(140px, 1fr) 150px 75px;
    gap: 10px;
  }
}

@media (max-width: 640px) {
  .track-list-card {
    padding: 16px 12px;
    border-radius: var(--sonata-radius-md);
  }

  .card-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .header-left {
    justify-content: space-between;
    width: 100%;
  }

  .header-actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .secondary-action-button, .add-track-button {
    width: 100%;
    justify-content: center;
    padding: 8px 6px;
    font-size: 0.8rem;
  }

  .album-grid {
    min-width: 440px;
    grid-template-columns: 24px 24px minmax(120px, 1fr) 68px 68px 28px;
    gap: 6px;
  }

  .playlist-grid {
    min-width: 440px;
    grid-template-columns: 24px 24px minmax(120px, 1fr) 120px 65px;
    gap: 6px;
  }

  .single-grid {
    min-width: 380px;
    grid-template-columns: 24px minmax(130px, 1fr) 110px 65px;
    gap: 6px;
  }

  .time-input {
    padding: 4px 2px;
    font-size: 0.82rem;
  }

  .artist-input {
    padding: 4px 6px;
    font-size: 0.82rem;
  }

  .title-input {
    padding: 4px 6px;
    font-size: 0.88rem;
  }

  .paste-box-actions {
    flex-direction: column-reverse;
    gap: 8px;
  }

  .btn-cancel, .btn-process {
    width: 100%;
    justify-content: center;
    padding: 10px;
  }

  .empty-actions {
    width: 100%;
  }

  .empty-actions .btn-process {
    width: 100%;
    justify-content: center;
    padding: 10px;
  }
}
</style>
