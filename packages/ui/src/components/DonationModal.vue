<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import QRCode from 'qrcode';
import { useNotifications } from '../composables/useNotifications';

interface Props {
  show: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { success: toastSuccess, error: toastError } = useNotifications();

const PIX_KEY = '00000000-0000-0000-0000-000000000000'; // TODO: Inserir chave pix do LivePix ou de doação futura
const qrDataUrl = ref<string>('');
const copiedKey = ref(false);
const copiedPayload = ref(false);

function formatEMV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function getPixBRCode(key: string, name = 'Sonata Dev', city = 'BRASIL'): string {
  const merchantAccountInfo =
    formatEMV('00', 'br.gov.bcb.pix') +
    formatEMV('01', key);

  const rawPayload =
    formatEMV('00', '01') +
    formatEMV('26', merchantAccountInfo) +
    formatEMV('52', '0000') +
    formatEMV('53', '986') +
    formatEMV('58', 'BR') +
    formatEMV('59', name.substring(0, 25)) +
    formatEMV('60', city.substring(0, 15)) +
    formatEMV('62', formatEMV('05', '***')) +
    '6304';

  return `${rawPayload}${crc16(rawPayload)}`;
}

const pixPayload = getPixBRCode(PIX_KEY);

const generateQRCode = async () => {
  try {
    qrDataUrl.value = await QRCode.toDataURL(pixPayload, {
      width: 210,
      margin: 1,
      color: {
        dark: '#111418',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (err) {
    console.error('Erro ao gerar QR Code do Pix:', err);
  }
};

const copyPixKey = async () => {
  try {
    await navigator.clipboard.writeText(PIX_KEY);
    copiedKey.value = true;
    toastSuccess('Chave Pix copiada para a área de transferência!', 'Chave copiada');
    setTimeout(() => {
      copiedKey.value = false;
    }, 2500);
  } catch {
    toastError('Não foi possível copiar automaticamente.', 'Erro ao copiar');
  }
};

const copyPixCopiaECola = async () => {
  try {
    await navigator.clipboard.writeText(pixPayload);
    copiedPayload.value = true;
    toastSuccess('Código Pix Copia e Cola copiado!', 'Copia e Cola');
    setTimeout(() => {
      copiedPayload.value = false;
    }, 2500);
  } catch {
    toastError('Não foi possível copiar automaticamente.', 'Erro ao copiar');
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.show) {
    emit('close');
  }
};

watch(
  () => props.show,
  (val) => {
    if (val && !qrDataUrl.value) {
      generateQRCode();
    }
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button type="button" class="modal-close-btn" title="Fechar modal" @click="emit('close')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="modal-header">
          <div class="modal-icon-badge">☕</div>
          <h3 id="modal-title" class="modal-title">Curtindo o Sonata?</h3>
          <p class="modal-subtitle">
            O Sonata é 100% gratuito, sem anúncios e de código aberto. Se ele está sendo útil e economizando seu tempo, que tal apoiar o projeto com qualquer valor no Pix?
          </p>
        </div>

        <div class="modal-body">
          <div class="qr-container">
            <div class="qr-frame">
              <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR Code Pix" class="qr-image" />
              <div v-else class="qr-placeholder">Gerando QR Code...</div>
            </div>
            <span class="qr-instruction">Aponte a câmera do seu aplicativo de banco</span>
          </div>

          <div class="pix-key-section">
            <label class="pix-field-label">Chave Pix</label>
            <div class="pix-input-group">
              <input
                type="text"
                class="pix-input"
                :value="PIX_KEY"
                readonly
                aria-label="Chave Pix"
                @focus="($event.target as HTMLInputElement).select()"
              />
              <button
                type="button"
                class="pix-copy-btn"
                :class="{ 'is-copied': copiedKey }"
                @click="copyPixKey"
              >
                <svg v-if="!copiedKey" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{{ copiedKey ? 'Copiado!' : 'Copiar' }}</span>
              </button>
            </div>

            <button
              type="button"
              class="copia-cola-btn"
              :class="{ 'is-copied': copiedPayload }"
              @click="copyPixCopiaECola"
            >
              {{ copiedPayload ? 'Código Copia e Cola copiado! ✓' : 'Ou copiar código Pix Copia e Cola' }}
            </button>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="dismiss-btn" @click="emit('close')">
            Agora não, continuar
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 13, 16, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 10000;
}

.modal-card {
  position: relative;
  width: 100%;
  max-width: 440px;
  background: var(--sonata-bg-surface-elevated);
  border: 1px solid var(--sonata-border-subtle);
  border-radius: var(--sonata-radius-lg);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.45), var(--sonata-shadow-glow);
  padding: 28px 24px 22px;
  text-align: center;
  animation: modal-enter 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid transparent;
  color: var(--sonata-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--sonata-transition-smooth);
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--sonata-text-primary);
  border-color: var(--sonata-border-subtle);
}

.modal-header {
  margin-bottom: 20px;
}

.modal-icon-badge {
  font-size: 2rem;
  margin-bottom: 8px;
  display: inline-block;
  animation: float 3s ease-in-out infinite;
}

.modal-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--sonata-text-primary);
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.modal-subtitle {
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--sonata-text-secondary);
  margin: 0;
}

.modal-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.qr-frame {
  background: #ffffff;
  padding: 10px;
  border-radius: var(--sonata-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 210px;
  height: 210px;
}

.qr-image {
  width: 190px;
  height: 190px;
  display: block;
}

.qr-placeholder {
  color: #555555;
  font-size: 0.85rem;
}

.qr-instruction {
  font-size: 0.8rem;
  color: var(--sonata-text-muted);
}

.pix-key-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.pix-field-label {
  font-size: 0.76rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--sonata-text-muted);
}

.pix-input-group {
  display: flex;
  align-items: stretch;
  background: var(--sonata-bg-input);
  border: 1px solid var(--sonata-border-subtle);
  border-radius: var(--sonata-radius-md);
  overflow: hidden;
  transition: var(--sonata-transition-smooth);
}

.pix-input-group:focus-within {
  border-color: var(--sonata-accent-primary);
  box-shadow: 0 0 0 2px var(--sonata-accent-muted);
}

.pix-input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 10px 12px;
  font-size: 0.82rem;
  font-family: monospace;
  color: var(--sonata-text-primary);
  outline: none;
  width: 100%;
  text-overflow: ellipsis;
}

.pix-copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  background: var(--sonata-accent-muted);
  color: var(--sonata-accent-hover);
  border: none;
  border-left: 1px solid var(--sonata-border-subtle);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: var(--sonata-transition-smooth);
}

.pix-copy-btn:hover {
  background: var(--sonata-accent-primary);
  color: var(--sonata-text-inverse);
}

.pix-copy-btn.is-copied {
  background: var(--sonata-success);
  color: var(--sonata-text-inverse);
}

.copia-cola-btn {
  align-self: center;
  background: transparent;
  border: none;
  color: var(--sonata-text-muted);
  font-size: 0.78rem;
  cursor: pointer;
  padding: 4px 8px;
  margin-top: 2px;
  transition: var(--sonata-transition-smooth);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.copia-cola-btn:hover {
  color: var(--sonata-accent-primary);
}

.copia-cola-btn.is-copied {
  color: var(--sonata-success);
  text-decoration: none;
  font-weight: 600;
}

.modal-footer {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--sonata-border-subtle);
}

.dismiss-btn {
  background: transparent;
  border: none;
  color: var(--sonata-text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: var(--sonata-radius-sm);
  transition: var(--sonata-transition-smooth);
}

.dismiss-btn:hover {
  color: var(--sonata-text-primary);
  background: rgba(255, 255, 255, 0.05);
}

/* Animations */
@keyframes modal-enter {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
